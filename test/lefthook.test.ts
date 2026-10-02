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
    const yaml = renderLefthookConfig({ graphify: false, checks: [] });
    expect(yaml).toContain('commit-msg:');
    expect(yaml).toContain('"check-message.sh":');
    expect(yaml).not.toContain('post-commit:');
  });

  it('runs single-package checks from the repo root: lint before commit, typecheck and test before push', () => {
    const yaml = renderLefthookConfig({
      graphify: false,
      checks: [
        { hook: 'pre-commit', name: 'lint', run: 'pnpm run lint' },
        { hook: 'pre-push', name: 'test', run: 'pnpm run test' },
      ],
    });
    expect(yaml).toContain('pre-commit:\n  commands:\n    "lint":\n      run: "pnpm run lint"\n');
    expect(yaml).toContain('pre-push:\n  commands:\n    "test":\n      run: "pnpm run test"\n');
    expect(yaml).not.toContain('root:');
  });

  it('runs package checks inside the package; before a commit only when that package changed', () => {
    const yaml = renderLefthookConfig({
      graphify: false,
      checks: [
        { hook: 'pre-commit', name: 'lint (apps/api)', run: 'uv run ruff check .', packagePath: 'apps/api' },
        { hook: 'pre-push', name: 'test (apps/api)', run: 'uv run pytest', packagePath: 'apps/api' },
      ],
    });
    expect(yaml).toContain('    "lint (apps/api)":\n      root: "apps/api/"\n      glob: "apps/api/**"\n      run: "uv run ruff check ."');
    // lefthook ignores glob before a push, so it is left out there rather than suggesting a filter that does nothing.
    expect(yaml).toContain('    "test (apps/api)":\n      root: "apps/api/"\n      run: "uv run pytest"');
  });

  it('quotes commands so special characters cannot break the YAML', () => {
    const yaml = renderLefthookConfig({ graphify: false, checks: [{ hook: 'pre-push', name: 'test', run: 'echo "a: b"' }] });
    expect(yaml).toContain('run: "echo \\"a: b\\""');
  });

  it('leaves out hooks that have no checks', () => {
    expect(renderLefthookConfig({ graphify: false, checks: [] })).not.toMatch(/pre-commit|pre-push/);
  });

  it('refreshes the graphify graph after each commit when graphify is used', () => {
    const yaml = renderLefthookConfig({ graphify: true, checks: [] });
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
