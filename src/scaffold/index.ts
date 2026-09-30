import { spawnSync } from 'node:child_process';
import { readdir, rmdir } from 'node:fs/promises';
import { onPath } from '../doctor.js';
import { getFramework } from './frameworks.js';
import { buildScaffoldSteps } from './recipes.js';
import { runSteps, type StepLogger } from './run.js';
import type { AppSpec, Layout, ScaffoldSpec } from './types.js';

export type DirState = 'missing' | 'empty' | 'project';

// Entries that do not make a directory "non-empty" for scaffolding purposes.
const IGNORED_ENTRIES = new Set(['.git', '.DS_Store']);

/** Classifies the target directory: missing, empty (ignoring .git) or already containing files. */
export async function inspectDir(dir: string): Promise<DirState> {
  try {
    const entries = await readdir(dir);
    return entries.some((entry) => !IGNORED_ENTRIES.has(entry)) ? 'project' : 'empty';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'missing';
    throw error;
  }
}

const APP_NAME = /^[a-z][a-z0-9-]*$/;

/** Parses `--apps web:nextjs,api:nestjs` (a bare framework id uses its default folder name). */
export function parseApps(value: string): AppSpec[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [first, second] = item.split(':');
      const framework = (second ?? first ?? '').trim();
      return { framework, name: second ? (first ?? '').trim() : getFramework(framework).defaultName };
    });
}

/** Rejects specs that would fail halfway through scaffolding. */
export function validateSpec(spec: ScaffoldSpec): void {
  if (spec.apps.length === 0) throw new Error('Choose at least one framework to scaffold.');
  if (spec.layout === 'single' && spec.apps.length > 1) throw new Error('The single layout holds exactly one app; use folders or a monorepo layout for more.');
  const names = new Set<string>();
  for (const app of spec.apps) {
    getFramework(app.framework);
    if (spec.layout !== 'single') {
      if (!APP_NAME.test(app.name)) throw new Error(`App name "${app.name}" must be lowercase kebab-case (e.g. web, admin-api).`);
      if (names.has(app.name)) throw new Error(`App name "${app.name}" is used twice; give each app its own name.`);
      names.add(app.name);
    }
  }
}

/** Binaries a spec needs, so we can fail fast before creating anything. */
export function requiredBinaries(spec: ScaffoldSpec): string[] {
  const runtimes = new Set(spec.apps.map((app) => getFramework(app.framework).runtime));
  const bins = new Set(['git']);
  if (runtimes.has('node') || spec.layout === 'turborepo' || spec.layout === 'workspaces' || spec.layout === 'nx') {
    bins.add('npx');
    bins.add(spec.packageManager);
  }
  if (runtimes.has('python')) bins.add('uv');
  if (runtimes.has('go')) bins.add('go');
  return [...bins];
}

const INSTALL_HINTS: Record<string, string> = {
  uv: 'https://docs.astral.sh/uv/getting-started/installation/',
  go: 'https://go.dev/doc/install',
  pnpm: 'npm i -g pnpm   (or: corepack enable)',
  yarn: 'npm i -g yarn   (or: corepack enable)',
  bun: 'https://bun.sh/docs/installation',
  npx: 'install Node.js ≥ 20: https://nodejs.org',
  git: 'https://git-scm.com/downloads',
};

export async function missingBinaries(spec: ScaffoldSpec): Promise<string[]> {
  const missing: string[] = [];
  for (const bin of requiredBinaries(spec)) if (!(await onPath(bin))) missing.push(bin);
  return missing;
}

/** Reads `<pm> --version` (e.g. "10.19.0"); undefined when it cannot be determined. */
function packageManagerVersion(pm: string): string | undefined {
  const result = spawnSync(pm, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
  const version = result.status === 0 ? result.stdout.trim() : '';
  return /^\d+\.\d+\.\d+/.test(version) ? version : undefined;
}

function isInsideGitRepo(dir: string): boolean {
  return spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: dir, stdio: 'ignore' }).status === 0;
}

export const LAYOUTS: Array<{ value: Layout; label: string; hint: string }> = [
  { value: 'single', label: 'Single app', hint: 'one frontend or backend in the repo root' },
  { value: 'folders', label: 'Multiple folders', hint: 'e.g. web/ + api/ without a monorepo tool (fullstack)' },
  { value: 'turborepo', label: 'Turborepo', hint: 'apps/* with turbo pipelines' },
  { value: 'nx', label: 'Nx', hint: 'apps/* via Nx generators' },
  { value: 'workspaces', label: 'Package-manager workspaces', hint: 'apps/* without a task runner' },
];

/**
 * Creates a new project with official scaffolders, then `git init` once at the root (no commit).
 * Requires the target to be missing or empty; checks required binaries before touching the disk.
 */
export async function scaffoldProject(spec: ScaffoldSpec, log?: StepLogger): Promise<void> {
  validateSpec(spec);
  const state = await inspectDir(spec.root);
  if (state === 'project') throw new Error(`${spec.root} is not empty; scaffolding only runs in a new or empty directory.`);

  const missing = await missingBinaries(spec);
  if (missing.length > 0) {
    const hints = missing.map((bin) => `  - ${bin}: ${INSTALL_HINTS[bin] ?? 'install it and retry'}`).join('\n');
    throw new Error(`Missing required tools:\n${hints}`);
  }

  // create-nx-workspace insists on creating the folder itself, so an existing empty folder is removed first.
  // rmdir only succeeds on a truly empty folder, so user files (even .git) can never be deleted here.
  if (spec.layout === 'nx' && state === 'empty') {
    const entries = await readdir(spec.root);
    if (entries.length > 0) throw new Error(`Nx needs a new or completely empty folder; ${spec.root} contains ${entries.join(', ')}.`);
    await rmdir(spec.root);
  }

  const withVersion = { ...spec, packageManagerVersion: spec.packageManagerVersion ?? packageManagerVersion(spec.packageManager) };
  try {
    await runSteps(buildScaffoldSteps(withVersion), log);
  } catch (error) {
    // Never auto-delete: the folder may be the user's. Tell them what is left behind instead.
    throw new Error(`${(error as Error).message}\nScaffolding stopped; partial files remain in ${spec.root}. Remove that folder and retry.`);
  }

  if (!isInsideGitRepo(spec.root)) {
    const result = spawnSync('git', ['init', '--quiet'], { cwd: spec.root, stdio: 'inherit' });
    if (result.status !== 0) throw new Error('git init failed');
  }
}

export { FRAMEWORKS, getFramework } from './frameworks.js';
export type { AppSpec, Layout, NodePackageManager, ScaffoldLanguage, ScaffoldSpec } from './types.js';
