import { spawnSync } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { exists } from './fs-utils.js';
import { TOOLS, type Tool } from './tooling.js';

export interface ToolStatus {
  tool: Tool;
  installed: boolean;
}

/** True when an executable with this name is on PATH (checks PATHEXT variants on Windows). */
export async function onPath(bin: string): Promise<boolean> {
  const exts = process.platform === 'win32' ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : [''];
  for (const dir of (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    for (const ext of exts) {
      try {
        await access(path.join(dir, bin + ext), constants.X_OK);
        return true;
      } catch {
        // not in this directory; keep looking
      }
    }
  }
  return false;
}

async function isInstalled(tool: Tool, home: string): Promise<boolean> {
  for (const bin of tool.check.bins ?? []) if (await onPath(bin)) return true;
  for (const rel of tool.check.homePaths ?? []) if (await exists(path.join(home, rel))) return true;
  return false;
}

/** Checks which required tools are present on this machine. Never installs anything. */
export async function checkTools(toolIds: string[] = TOOLS.map((t) => t.id), home = homedir()): Promise<ToolStatus[]> {
  const tools = TOOLS.filter((t) => toolIds.includes(t.id));
  return Promise.all(tools.map(async (tool) => ({ tool, installed: await isInstalled(tool, home) })));
}

/** Whether graphify's git hooks are installed in a repository. */
export type HookState = 'installed' | 'missing' | 'unknown';

/**
 * Asks graphify whether its post-commit hook is installed in `dir`.
 * @param dir - A folder inside a git repository.
 * @returns `installed`, `missing`, or `unknown` when graphify cannot answer (not installed, not a repo, error).
 */
export function graphifyHookState(dir: string): HookState {
  const result = spawnSync('graphify', ['hook', 'status'], { cwd: dir, encoding: 'utf8' });
  if (result.status !== 0 || !result.stdout) return 'unknown';
  return /post-commit:\s*installed/.test(result.stdout) ? 'installed' : 'missing';
}
