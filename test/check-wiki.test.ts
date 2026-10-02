/**
 * Tests the pre-push / CI wiki reminder script against real git repositories in temp folders.
 * It must warn when code changes without docs/wiki/en/, accept the "Wiki: not needed (...)" escape,
 * and never block a push.
 */
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.join(import.meta.dirname, '..', 'presets', 'base', 'files', '.lefthook', 'pre-push', 'check-wiki.sh');

/** Runs git in `dir` with a fixed test identity and returns stdout. */
function git(dir: string, ...args: string[]): string {
  return spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, encoding: 'utf8' }).stdout.trim();
}

/** Creates a repo with one base commit and one commit that writes `files`; returns the repo and both shas. */
async function repoWithChange(files: Record<string, string>, message = 'feat(TASK-1): change') {
  const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-wiki-'));
  git(dir, 'init', '-q');
  await writeFile(path.join(dir, 'README.md'), 'base\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'chore(TASK-1): base');
  const base = git(dir, 'rev-parse', 'HEAD');
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
    await writeFile(path.join(dir, file), content);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', message);
  return { dir, base, head: git(dir, 'rev-parse', 'HEAD') };
}

/** Runs the script in CI mode (`--range base head`). */
function runRange(repo: { dir: string; base: string; head: string }, env: Record<string, string> = {}) {
  return spawnSync('sh', [script, '--range', repo.base, repo.head], { cwd: repo.dir, encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: '', ...env } });
}

describe('check-wiki.sh --range (CI)', () => {
  it('warns when code changes without the English wiki', async () => {
    const result = runRange(await repoWithChange({ 'src/app.ts': 'x' }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('warning: Code changed without an update in docs/wiki/en/');
  });

  it('prints a GitHub annotation on GitHub Actions', async () => {
    const result = runRange(await repoWithChange({ 'src/app.ts': 'x' }), { GITHUB_ACTIONS: 'true' });
    expect(result.stdout).toContain('::warning::Code changed without an update in docs/wiki/en/');
  });

  it.each([
    ['code with an English wiki update', { 'src/app.ts': 'x', 'docs/wiki/en/features/app.md': 'y' }],
    ['docs only', { 'docs/guide.txt': 'x' }],
    ['Markdown only', { 'CHANGELOG.md': 'x' }],
  ])('passes for %s', async (_label, files) => {
    expect(runRange(await repoWithChange(files)).status).toBe(0);
  });

  it('still warns when only the Indonesian wiki changed', async () => {
    expect(runRange(await repoWithChange({ 'src/app.ts': 'x', 'docs/wiki/id/features/app.md': 'y' })).status).toBe(1);
  });

  it('accepts a commit message that says why no wiki update is needed', async () => {
    const message = 'build(TASK-1): bump vitest\n\nWiki: not needed (dependency bump only)';
    expect(runRange(await repoWithChange({ 'package.json': '{}' }, message)).status).toBe(0);
  });
});

describe('check-wiki.sh (pre-push)', () => {
  it('warns but never blocks a push, also for a new branch', async () => {
    const repo = await repoWithChange({ 'src/app.ts': 'x' });
    const zero = '0'.repeat(40);
    const stdin = `refs/heads/main ${repo.head} refs/heads/main ${repo.base}\nrefs/heads/new ${repo.head} refs/heads/new ${zero}\n`;
    const result = spawnSync('sh', [script, 'origin', 'url'], { cwd: repo.dir, input: stdin, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toContain('warning: Code changed');
  });

  it('ignores deleted branches', async () => {
    const repo = await repoWithChange({ 'src/app.ts': 'x' });
    const stdin = `(delete) ${'0'.repeat(40)} refs/heads/old ${repo.head}\n`;
    const result = spawnSync('sh', [script, 'origin', 'url'], { cwd: repo.dir, input: stdin, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
