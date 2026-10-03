import path from 'node:path';
import { listSubdirs, readJson } from '../fs-utils.js';
import type { DetectedProject, PackageInfo, PackageManager } from '../types.js';
import { detectGoPackage } from './go.js';
import { detectNodePackage } from './node.js';
import { detectNodePackageManager } from './package-manager.js';
import { detectPythonPackage } from './python.js';
import { detectExistingRules } from './rules.js';
import { detectExistingSkills } from './skills.js';
import { detectWorkspace } from './workspace.js';

/** Tries each ecosystem detector in turn; the first one that recognises a manifest wins. */
async function detectPackage(root: string, relPath: string, options: DetectOptions): Promise<PackageInfo | null> {
  return (
    (await detectNodePackage(root, relPath, options.nodePackageManager)) ??
    (await detectPythonPackage(root, relPath)) ??
    (await detectGoPackage(root, relPath))
  );
}

async function detectAll(root: string, relPaths: string[], options: DetectOptions): Promise<PackageInfo[]> {
  const found = await Promise.all(relPaths.map((rel) => detectPackage(root, rel, options)));
  return found.filter((pkg): pkg is PackageInfo => pkg !== null);
}

/** Optional hints for detectProject. */
export interface DetectOptions {
  /** Node package manager to assume when no lockfile exists yet (set after scaffolding with --skip-install). */
  nodePackageManager?: PackageManager;
}

/**
 * Scans a repository and describes its packages, stacks and existing agent skills.
 * @param root - Absolute path of the repository to scan.
 * @param options - Optional hints, e.g. the package manager chosen during scaffolding.
 * @returns The detected project; `packages` is empty when nothing is recognised.
 */
export async function detectProject(root: string, options: DetectOptions = {}): Promise<DetectedProject> {
  return { ...(await detectLayout(root, options)), existingSkills: await detectExistingSkills(root), existingRules: await detectExistingRules(root) };
}

/**
 * Finds where the packages are. Checks in this order: a workspace tool (turbo, Nx, moon, workspaces),
 * then a single manifest at the root, then one level of sub-folders (for example `web/` + `api/`).
 */
async function detectLayout(root: string, options: DetectOptions): Promise<DetectedProject> {
  const rootPkg = await readJson<{ name?: string; scripts?: Record<string, string> }>(path.join(root, 'package.json'));
  const name = rootPkg?.name ?? path.basename(root);

  const workspace = await detectWorkspace(root);
  if (workspace) {
    return {
      root,
      name,
      monorepo: workspace.tool,
      rootScripts: Object.keys(rootPkg?.scripts ?? {}),
      // No root package.json (e.g. a Go + Python moon repo) means there is no root Node install to run.
      rootPackageManager: rootPkg ? await detectNodePackageManager([root], options.nodePackageManager) : undefined,
      packages: withMoonIds(await detectAll(root, workspace.packageDirs, options), workspace.moonProjectIds),
    };
  }

  const single = await detectPackage(root, '.', options);
  if (single) return { root, name: single.name, packages: [single] };

  return { root, name, packages: await detectAll(root, await listSubdirs(root), options) };
}

/**
 * moon targets use project IDs (`web:test`), not package.json names (`@acme/web`).
 * The ID is the map key from .moon/workspace.yml, or else the folder name.
 */
function withMoonIds(packages: PackageInfo[], moonProjectIds: Record<string, string> | undefined): PackageInfo[] {
  if (!moonProjectIds) return packages;
  return packages.map((pkg) => ({ ...pkg, taskRunnerId: moonProjectIds[pkg.path] ?? path.posix.basename(pkg.path) }));
}

/**
 * Replaces detected stacks with presets chosen by the user (--preset or the prompt).
 * The override applies to the root package; a repo without a root manifest gets a synthetic one.
 */
export function overridePresets(project: DetectedProject, presetIds: string[]): DetectedProject {
  const current = project.packages.find((p) => p.path === '.');
  const language = presetIds.includes('typescript')
    ? 'typescript'
    : presetIds.includes('python') || presetIds.includes('fastapi') || presetIds.includes('django')
      ? 'python'
      : presetIds.includes('go') || presetIds.includes('go-http')
        ? 'go'
        : 'javascript';
  const root: PackageInfo = {
    path: '.',
    name: project.name,
    packageManager: current?.packageManager ?? (language === 'python' ? 'pip' : language === 'go' ? 'go' : 'npm'),
    scripts: current?.scripts ?? [],
    manifests: current?.manifests ?? [],
    ...current,
    language,
    presets: presetIds,
  };
  return { ...project, monorepo: undefined, packages: [root] };
}
