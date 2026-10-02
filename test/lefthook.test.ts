/**
 * Tests the generated git hook setup: the lefthook.yml renderer and the commit-msg check script,
 * which runs with plain `sh` so it works in repos of every language.
 */
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderLefthookConfig } from '../src/render/lefthook.js';

const script = path.join(import.meta.dirname, '..', 'presets', 'base', 'files', '.lefthook', 'commit-msg', 'check-message.sh');

/** Runs the commit-msg script on a message, like git does, and returns its exit code. */
async function checkMessage(message: string): Promise<number | null> {
  const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-msg-'));
  const file = path.join(dir, 'COMMIT_EDITMSG');
  await writeFile(file, message);
  return spawnSync('sh', [script, file]).status;
}

describe('renderLefthookConfig', () => {
  it('always checks the commit message', () => {
    const yaml = renderLefthookConfig({ graphify: false });
    expect(yaml).toContain('commit-msg:');
    expect(yaml).toContain('"check-message.sh":');
    expect(yaml).not.toContain('post-commit:');
  });

  it('refreshes the graphify graph after each commit when graphify is used', () => {
    const yaml = renderLefthookConfig({ graphify: true });
    expect(yaml).toContain('post-commit:');
    expect(yaml).toContain('run: graphify update . > /dev/null 2>&1 || true');
  });
});

describe('check-message.sh (commit-msg hook)', () => {
  it.each([
    'feat(#123): add login form',
    'fix(TASK-4821): handle empty cart',
    'feat(TASK-1)!: drop node 18 support',
    'docs(#7): explain setup\n\nWhy: new devs got stuck.\n',
    'Merge branch main into feature',
    'Revert "feat(#1): add x"',
    `chore(#1): ${'a'.repeat(72)}`,
  ])('accepts %j', async (message) => {
    expect(await checkMessage(message)).toBe(0);
  });

  it.each([
    'add login form',
    'feature(#1): unknown type',
    'feat: missing reference',
    'feat(123): reference without #',
    'feat(#1):no space',
    `chore(#1): ${'a'.repeat(73)}`,
    'feat(#1): add x\n\nCo-Authored-By: Bot <bot@example.com>\n',
  ])('rejects %j', async (message) => {
    expect(await checkMessage(message)).toBe(1);
  });
});
