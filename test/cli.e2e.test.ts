import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const repoRoot = path.join(import.meta.dirname, '..');
const cli = path.join(repoRoot, 'dist', 'cli.js');

async function copyFixture(name: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), `agent-initiator-e2e-${name}-`));
  await cp(path.join(import.meta.dirname, 'fixtures', name), dir, { recursive: true });
  return dir;
}

const init = (dir: string, ...args: string[]) => run('node', [cli, 'init', dir, '--yes', ...args]);

describe('CLI (built)', () => {
  beforeAll(async () => {
    await run('pnpm', ['build'], { cwd: repoRoot });
  }, 60_000);

  it('initialises a turborepo and is idempotent on re-run', async () => {
    const dir = await copyFixture('turborepo');
    await init(dir);

    const read = (p: string) => readFile(path.join(dir, p), 'utf8');
    expect(await read('AGENTS.md')).toContain('**Monorepo tool:** Turborepo');
    expect(await read('apps/web/AGENTS.md')).toContain('# AGENTS.md — @acme/web');
    expect(await read('CLAUDE.md')).toBe('@AGENTS.md\n');
    expect(await readdir(path.join(dir, '.claude/skills'))).toContain('add-package');
    expect(await read('docs/wiki/id/log.md')).toContain('Catatan Perubahan');

    const before = await read('AGENTS.md');
    const second = await init(dir);
    expect(second.stdout).toContain('0 to create');
    expect(await read('AGENTS.md')).toBe(before);
  });

  it('keeps a hand-written AGENTS.md and prints manual instructions', async () => {
    const dir = await copyFixture('nextjs');
    await writeFile(path.join(dir, 'AGENTS.md'), '# Team notes\n');
    const { stdout } = await init(dir);
    expect(await readFile(path.join(dir, 'AGENTS.md'), 'utf8')).toBe('# Team notes\n');
    expect(stdout).toContain('AGENTS.md already exists and was kept');
    expect(stdout).toContain('.agents/rules/nextjs.md');
  });

  it('writes nothing on --dry-run', async () => {
    const dir = await copyFixture('go');
    const { stdout } = await init(dir, '--dry-run');
    expect(stdout).toContain('Dry run');
    expect(await readdir(dir)).toEqual(['go.mod']);
  });

  it('honours --preset overrides', async () => {
    const dir = await copyFixture('express');
    await init(dir, '--preset', 'typescript,hono');
    const agents = await readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('**Stack:** TypeScript, Hono');
  });

  it('fails clearly for an unknown preset', async () => {
    const dir = await copyFixture('express');
    await expect(init(dir, '--preset', 'rails')).rejects.toMatchObject({ stderr: expect.stringContaining('Unknown preset "rails"') });
  });

  it('refuses an empty directory in --yes mode and explains the options', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-e2e-empty-'));
    await expect(init(dir)).rejects.toMatchObject({ stderr: expect.stringContaining('--framework nextjs') });
    expect(await readdir(dir)).toEqual([]);
  });

  it('creates a missing directory when presets are given explicitly', async () => {
    const dir = path.join(await mkdtemp(path.join(tmpdir(), 'agent-initiator-e2e-missing-')), 'new-app');
    await init(dir, '--preset', 'typescript,nestjs');
    expect(await readFile(path.join(dir, 'AGENTS.md'), 'utf8')).toContain('**Stack:** TypeScript, NestJS');
  });

  it('refuses scaffolding flags in a non-empty directory', async () => {
    const dir = await copyFixture('express');
    await expect(init(dir, '--framework', 'nextjs')).rejects.toMatchObject({ stderr: expect.stringContaining('is not empty') });
  });
});
