import type { CommandMap, PackageInfo, PackageManager } from '../types.js';

export interface Command {
  task: string;
  command: string;
}

// Display order in AGENTS.md; unknown tasks are appended alphabetically.
const TASK_ORDER = ['install', 'dev', 'start', 'build', 'test', 'lint', 'typecheck', 'format', 'audit', 'affected'];

// package.json script names that map to a canonical task (first match wins).
const SCRIPT_ALIASES: Record<string, string[]> = {
  dev: ['dev', 'start:dev', 'develop', 'serve'],
  start: ['start'],
  build: ['build', 'build:ts'],
  test: ['test'],
  lint: ['lint'],
  typecheck: ['typecheck', 'type-check', 'check-types'],
  format: ['format', 'format:check'],
};

// rtk sub-command per task: `test` shows only failures, `err` only errors/warnings, `proxy` passes through.
const RTK_MODE: Record<string, string> = {
  test: 'test',
  build: 'err',
  lint: 'err',
  typecheck: 'err',
  format: 'err',
  affected: 'err',
};

// `pmx` runs a locally installed binary with each package manager.
const PMX: Partial<Record<PackageManager, string>> = { npm: 'npx', pnpm: 'pnpm exec', yarn: 'yarn', bun: 'bunx' };

/** Template variables available to preset command templates. */
export function templateVars(pkg: Pick<PackageInfo, 'packageManager' | 'manifests'>): Record<string, string> {
  const pm = pkg.packageManager;
  const pipInstall = pkg.manifests.includes('requirements.txt') ? 'pip install -r requirements.txt' : 'pip install -e .';
  return {
    pm,
    pmx: PMX[pm] ?? pm,
    pyRun: pm === 'uv' ? 'uv run ' : pm === 'poetry' ? 'poetry run ' : '',
    pyInstall: pm === 'uv' ? 'uv sync' : pm === 'poetry' ? 'poetry install' : pipInstall,
    // Fails only on high or critical advisories, as the dependencies rule asks. yarn 1 and yarn 2+ spell the
    // severity option differently, so yarn keeps its plain audit.
    audit: pm === 'yarn' ? 'yarn audit' : `${pm} audit --audit-level high`,
  };
}

/** Replaces {{name}} placeholders; unknown placeholders are left untouched so mistakes stay visible. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => vars[key] ?? match);
}

/** Maps real package.json scripts to canonical tasks, e.g. "start:dev" → dev: "pnpm run start:dev". */
export function scriptCommands(scripts: string[], pm: PackageManager): CommandMap {
  const commands: CommandMap = {};
  for (const [task, aliases] of Object.entries(SCRIPT_ALIASES)) {
    const script = aliases.find((alias) => scripts.includes(alias));
    if (script) commands[task] = `${pm} run ${script}`;
  }
  return commands;
}

export function withRtk(task: string, command: string): string {
  return `rtk ${RTK_MODE[task] ?? 'proxy'} ${command}`;
}

/** Fills templates, prefixes rtk and sorts commands into display order. */
export function toCommandList(commands: CommandMap, vars: Record<string, string>): Command[] {
  const rank = (task: string) => {
    const index = TASK_ORDER.indexOf(task);
    return index === -1 ? TASK_ORDER.length : index;
  };
  return Object.entries(commands)
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([task, template]) => ({ task, command: withRtk(task, fillTemplate(template, vars).trim()) }));
}

/**
 * Plain commands for one package, by task (no rtk prefix): preset defaults overridden by the package's real scripts.
 * Node presets only define install/typecheck, so node packages get the scripts they actually have.
 * Git hooks use these directly, because hooks also run for people who do not have rtk.
 */
export function packageTaskCommands(pkg: PackageInfo, presetCommands: CommandMap, monorepo?: string): CommandMap {
  const isNode = pkg.language === 'typescript' || pkg.language === 'javascript';
  const scripts = isNode ? scriptCommands(pkg.scripts, pkg.packageManager) : {};
  const merged: CommandMap = { ...presetCommands, ...(isNode && monorepo === 'nx' ? nxTargets(pkg.name) : {}), ...scripts };
  const vars = templateVars(pkg);
  return Object.fromEntries(Object.entries(merged).map(([task, template]) => [task, fillTemplate(template, vars).trim()]));
}

/** Commands for one package as shown in AGENTS.md: rtk-prefixed and in display order. */
export function packageCommands(pkg: PackageInfo, presetCommands: CommandMap, monorepo?: string): Command[] {
  return toCommandList(packageTaskCommands(pkg, presetCommands, monorepo), {});
}

// Nx projects usually have inferred targets instead of package.json scripts.
const NX_TASKS = ['build', 'test', 'lint', 'typecheck'];

function nxTargets(projectName: string): CommandMap {
  return Object.fromEntries(NX_TASKS.map((task) => [task, `{{pmx}} nx run ${projectName}:${task}`]));
}

/** Command to run a task for one workspace package from the repo root, or null when not applicable. */
export function filterCommand(tool: string, pm: PackageManager, pkgName: string, task: string): string | null {
  if (tool === 'turborepo') return `${PMX[pm] ?? pm} turbo run ${task} --filter=${pkgName}`;
  if (tool === 'nx') return `${PMX[pm] ?? pm} nx run ${pkgName}:${task}`;
  if (tool === 'moonrepo') return `moon run ${pkgName}:${task}`;
  if (pm === 'pnpm') return `pnpm --filter ${pkgName} run ${task}`;
  if (pm === 'yarn') return `yarn workspace ${pkgName} run ${task}`;
  if (pm === 'bun') return `bun run --filter ${pkgName} ${task}`;
  if (pm === 'npm') return `npm run ${task} -w ${pkgName}`;
  return null;
}
