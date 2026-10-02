import path from 'node:path';
import { onPath } from './doctor.js';
import { exists } from './fs-utils.js';
import { isInsideGitRepo } from './scaffold/index.js';
import { runCommand } from './scaffold/run.js';

/** One per-repo setup command for a required tool that is already installed on the machine. */
export interface SetupAction {
  tool: string;
  label: string;
  command: string;
  args: string[];
  /** Git hooks can only be installed inside a git repository. */
  requiresGit?: boolean;
  /**
   * Runs even in `--yes` mode (without --setup-tools), unless one of these paths already exists in the repo:
   * either the command would change that existing file, or the repo already uses another tool for the same job.
   */
  runsByDefaultUnlessExists?: string[];
}

/** A setup action left out of the default run, with the reason shown to the user. */
export interface SkippedDefault {
  action: SetupAction;
  reason: string;
}

export type SetupOutcome = 'done' | 'skipped' | 'failed';

export interface SetupResult {
  action: SetupAction;
  outcome: SetupOutcome;
  reason?: string;
}

// Per-repo steps for tools whose machine-level install is not enough. rtk, caveman and ponytail
// activate globally through their own hooks, so they need nothing here.
const TOOL_SETUP: Record<string, SetupAction[]> = {
  // UI UX Pro Max installs its own skills: .agents/skills for most agents, .claude/skills for Claude Code.
  'ui-ux-pro-max': [
    { tool: 'ui-ux-pro-max', label: 'install UI UX Pro Max skills (.agents/skills)', command: 'uipro', args: ['init', '--ai', 'universal'] },
    { tool: 'ui-ux-pro-max', label: 'install UI UX Pro Max skills (.claude/skills)', command: 'uipro', args: ['init', '--ai', 'claude'] },
  ],
  graphify: [
    { tool: 'graphify', label: 'build the code knowledge graph (graphify-out/)', command: 'graphify', args: ['update', '.'] },
    // `hook install` also adds a merge-driver line to .gitattributes (appending if the file exists).
    { tool: 'graphify', label: 'rebuild the graph on every commit (git hooks + .gitattributes)', command: 'graphify', args: ['hook', 'install'], requiresGit: true, runsByDefaultUnlessExists: ['.gitattributes'] },
  ],
  // Runs after graphify: lefthook moves existing hooks aside, and lefthook.yml takes over graphify's post-commit refresh.
  // Skipped by default when another hook manager (husky, pre-commit) is already in use.
  lefthook: [
    {
      tool: 'lefthook',
      label: 'activate the git hooks in lefthook.yml (commit message check)',
      command: 'lefthook',
      args: ['install'],
      requiresGit: true,
      runsByDefaultUnlessExists: ['.husky', '.pre-commit-config.yaml'],
    },
  ],
};

/** Setup actions for the tools a project requires, in a stable order (skills before the graph). */
export function planToolSetup(toolIds: string[]): SetupAction[] {
  return Object.keys(TOOL_SETUP)
    .filter((tool) => toolIds.includes(tool))
    .flatMap((tool) => TOOL_SETUP[tool] ?? []);
}

/**
 * Picks the actions that run without asking (`--yes` mode without --setup-tools).
 * Only actions marked `runsByDefaultUnlessExists` qualify, and only while none of the listed paths exists yet.
 * @param root - Repository root.
 * @param actions - All planned setup actions.
 * @returns The actions to run, and the default actions skipped because they would change an existing file.
 */
export async function selectDefaultActions(root: string, actions: SetupAction[]): Promise<{ run: SetupAction[]; skipped: SkippedDefault[] }> {
  const run: SetupAction[] = [];
  const skipped: SkippedDefault[] = [];
  for (const action of actions) {
    const blockers = action.runsByDefaultUnlessExists;
    if (!blockers) continue;
    const found: string[] = [];
    for (const file of blockers) if (await exists(path.join(root, file))) found.push(file);
    if (found.length > 0) {
      skipped.push({ action, reason: `${found.join(', ')} already exists; run \`${action.command} ${action.args.join(' ')}\` yourself if you want it` });
    } else {
      run.push(action);
    }
  }
  return { run, skipped };
}

/**
 * Runs setup actions in `root`. Never installs a tool: a missing binary or missing git repo skips the action,
 * and a failing command is reported without aborting init (the agent config is still useful without it).
 */
export async function runToolSetup(root: string, actions: SetupAction[], log: (result: SetupResult) => void = () => {}): Promise<SetupResult[]> {
  const results: SetupResult[] = [];
  const hasGit = isInsideGitRepo(root);
  for (const action of actions) {
    let result: SetupResult;
    if (!(await onPath(action.command))) {
      result = { action, outcome: 'skipped', reason: `${action.command} is not installed (see \`agent-initiator doctor\`)` };
    } else if (action.requiresGit && !hasGit) {
      result = { action, outcome: 'skipped', reason: 'not a git repository (run `git init` first)' };
    } else {
      try {
        await runCommand(action.command, action.args, root);
        result = { action, outcome: 'done' };
      } catch (error) {
        result = { action, outcome: 'failed', reason: (error as Error).message };
      }
    }
    log(result);
    results.push(result);
  }
  return results;
}
