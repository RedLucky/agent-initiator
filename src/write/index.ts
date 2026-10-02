import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { exists, readText } from '../fs-utils.js';
import type { FilePlanEntry, PlannedFile } from '../types.js';

/** Marks each planned file as "create" or "skip". Existing files are never overwritten. */
export async function planFiles(root: string, files: PlannedFile[]): Promise<FilePlanEntry[]> {
  return Promise.all(
    files.map(async (file) => ({ ...file, status: (await exists(path.join(root, file.path))) ? 'skip' : 'create' }) as FilePlanEntry),
  );
}

/**
 * Writes only the files marked "create", creating parent folders as needed. `.sh` files are made executable.
 * @returns The written paths.
 */
export async function applyPlan(root: string, plan: FilePlanEntry[]): Promise<string[]> {
  const written: string[] = [];
  for (const file of plan.filter((f) => f.status === 'create')) {
    const target = path.join(root, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    // `wx` fails if the file appeared since planning, so we still never clobber user content.
    // Shell scripts (git hooks) are executable: lefthook sets the bit on its first run anyway, and a file
    // committed without it would then show up as changed.
    const mode = file.path.endsWith('.sh') ? 0o755 : 0o644;
    await writeFile(target, file.content, { encoding: 'utf8', flag: 'wx', mode });
    written.push(file.path);
  }
  return written;
}

/** Returns the markdown from the first "## Rules" heading to the end: the part that wires rules/skills in. */
function linksSection(agentsMd: string): string {
  const start = agentsMd.indexOf('\n## Rules');
  return start === -1 ? '' : agentsMd.slice(start + 1).trimEnd();
}

/** Returns the `commit-msg:` block of a generated lefthook.yml (up to the next blank line). */
function commitMsgBlock(lefthookYml: string): string {
  const start = lefthookYml.indexOf('commit-msg:');
  if (start === -1) return '';
  const end = lefthookYml.indexOf('\n\n', start);
  return lefthookYml.slice(start, end === -1 ? undefined : end).trimEnd();
}

/**
 * Manual follow-ups for skipped files that matter for agents to find the new config.
 * We print them instead of editing the user's files (existing files stay untouched by design).
 */
export async function manualSteps(root: string, plan: FilePlanEntry[]): Promise<string[]> {
  const steps: string[] = [];
  const skipped = (p: string) => plan.find((f) => f.path === p && f.status === 'skip');

  for (const file of plan.filter((f) => f.status === 'skip' && f.path.endsWith('AGENTS.md'))) {
    const section = linksSection(file.content);
    if (section) {
      steps.push(`${file.path} already exists and was kept. Add these sections so agents find the rules and skills:\n\n${section}`);
    }
  }

  if (skipped('CLAUDE.md')) {
    const claudeMd = (await readText(path.join(root, 'CLAUDE.md'))) ?? '';
    if (!claudeMd.includes('@AGENTS.md')) {
      steps.push('CLAUDE.md already exists and does not import AGENTS.md. Add this line so Claude Code reads it:\n\n@AGENTS.md');
    }
  }

  const lefthook = skipped('lefthook.yml');
  if (lefthook) {
    const existing = (await readText(path.join(root, 'lefthook.yml'))) ?? '';
    if (!existing.includes('check-message.sh')) {
      steps.push(`lefthook.yml already exists and was kept. Add the commit message check to it:\n\n${commitMsgBlock(lefthook.content)}`);
    }
  }
  return steps;
}
