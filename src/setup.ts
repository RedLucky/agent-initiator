import { onPath } from './doctor.js';
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
    { tool: 'graphify', label: 'rebuild the graph on every commit (git hooks + .gitattributes)', command: 'graphify', args: ['hook', 'install'], requiresGit: true },
  ],
};

/** Setup actions for the tools a project requires, in a stable order (skills before the graph). */
export function planToolSetup(toolIds: string[]): SetupAction[] {
  return Object.keys(TOOL_SETUP)
    .filter((tool) => toolIds.includes(tool))
    .flatMap((tool) => TOOL_SETUP[tool] ?? []);
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
