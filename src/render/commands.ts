import type { CommandMap, PackageInfo, PackageManager } from '../types.js';

export interface Command {
  task: string;
  command: string;
}

// Display order in AGENTS.md; unknown tasks are appended alphabetically.
const TASK_ORDER = ['install', 'dev', 'start', 'build', 'test', 'coverage', 'lint', 'typecheck', 'format', 'audit', 'affected'];

// package.json script names that map to a canonical task (first match wins).
const SCRIPT_ALIASES: Record<string, string[]> = {
  dev: ['dev', 'start:dev', 'develop', 'serve'],
  start: ['start'],
  build: ['build', 'build:ts'],
  test: ['test'],
  coverage: ['test:coverage', 'coverage', 'test:cov'],
  lint: ['lint'],
  typecheck: ['typecheck', 'type-check', 'check-types'],
  format: ['format', 'format:check'],
};

// rtk mode per task: `test` shows only test failures, `err` only errors and warnings, other tasks use `proxy`.
const RTK_MODE: Record<string, string> = {
  test: 'test',
  coverage: 'test',
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

/**
 * The rtk command for one AGENTS.md task: `rtk test` for tests (only failures shown), `rtk err` for builds and
 * checks (only errors shown), and `rtk proxy` for everything else, which runs the command unchanged. `rtk <tool>`
 * is not used here: some rtk filters accept only certain subcommands (`rtk pip install -r …` fails).
 */
export function withRtk(task: string, command: string): string {
  return `rtk ${RTK_MODE[task] ?? 'proxy'} ${command}`;
}

/**
 * Writes the shell commands that presets mark as `{{rtk}}command` (inside backticks) with the `rtk` prefix, or plain
 * when rtk is not installed. Agents follow skill and rule text literally, so the prefix must already be there.
 * Presets mark only commands that work as `rtk <command>` (git, nx, turbo, moon).
 * @param rtk - Whether rtk is installed.
 */
export function fillRtkCommands(content: string, rtk: boolean): string {
  return content.replace(/`\{\{rtk\}\}([^`]+)`/g, (_match, command: string) => `\`${rtk ? `rtk ${command}` : command}\``);
}

/**
 * Fills templates, adds the rtk prefix (only when rtk is installed) and sorts commands into display order.
 * @param rtk - Whether rtk is installed.
 */
export function toCommandList(commands: CommandMap, vars: Record<string, string>, rtk = true): Command[] {
  const rank = (task: string) => {
    const index = TASK_ORDER.indexOf(task);
    return index === -1 ? TASK_ORDER.length : index;
  };
  return Object.entries(commands)
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([task, template]) => {
      const command = fillTemplate(template, vars).trim();
      return { task, command: rtk ? withRtk(task, command) : command };
    });
}

/**
 * Commands for one package: preset defaults overridden by the package's real scripts.
 * Node presets only define install/typecheck, so node packages show the scripts they actually have.
 */
export function packageCommands(pkg: PackageInfo, presetCommands: CommandMap, monorepo?: string, rtk = true): Command[] {
  if (pkg.pythonTestRunner) return toCommandList(plainPythonCommands(pkg.pythonTestRunner), {}, rtk);
  const isNode = pkg.language === 'typescript' || pkg.language === 'javascript';
  const scripts = isNode ? scriptCommands(pkg.scripts, pkg.packageManager) : {};
  return toCommandList({ ...presetCommands, ...(isNode && monorepo === 'nx' ? nxTargets(pkg.name) : {}), ...scripts }, templateVars(pkg), rtk);
}

/**
 * Commands for a Python project without pyproject.toml or requirements.txt. It declares no dependencies, so only
 * commands that need nothing beyond Python (and pytest when the tests import it) are listed: no install, lint,
 * typecheck or audit. `python3` because many systems have no `python` command.
 */
function plainPythonCommands(testRunner: 'pytest' | 'unittest'): CommandMap {
  return {
    build: "python3 -m compileall -q -x '\\.venv' .",
    test: testRunner === 'pytest' ? 'python3 -m pytest' : 'python3 -m unittest discover',
  };
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
