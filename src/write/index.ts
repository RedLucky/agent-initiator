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
 * Writes only the files marked "create", creating parent folders as needed.
 * @returns The written paths.
 */
export async function applyPlan(root: string, plan: FilePlanEntry[]): Promise<string[]> {
  const written: string[] = [];
  for (const file of plan.filter((f) => f.status === 'create')) {
    const target = path.join(root, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    // `wx` fails if the file appeared since planning, so we still never clobber user content.
    await writeFile(target, file.content, { encoding: 'utf8', flag: 'wx' });
    written.push(file.path);
  }
  return written;
}

/** Returns the markdown from the first "## Rules" heading to the end: the part that wires rules/skills in. */
function linksSection(agentsMd: string): string {
  const start = agentsMd.indexOf('\n## Rules');
  return start === -1 ? '' : agentsMd.slice(start + 1).trimEnd();
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

  return steps;
}
