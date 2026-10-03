import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyPlan, applyUpgrade, manualSteps, planFiles } from '../src/write/index.js';
import { contentHash } from '../src/render/manifest.js';

const tempDir = () => mkdtemp(path.join(tmpdir(), 'agent-initiator-write-'));

const agentsMd = '# AGENTS.md\n\nintro\n\n## Rules\n\n| rule |\n\n## Skills\n\n- skill\n';

describe('write', () => {
  it('creates new files with parent folders and skips existing ones', async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, 'AGENTS.md'), 'mine');
    const plan = await planFiles(dir, [
      { path: 'AGENTS.md', content: agentsMd },
      { path: '.agents/rules/a.md', content: 'rule' },
    ]);
    expect(plan.map((f) => [f.path, f.status])).toEqual([
      ['AGENTS.md', 'skip'],
      ['.agents/rules/a.md', 'create'],
    ]);
    expect(await applyPlan(dir, plan)).toEqual(['.agents/rules/a.md']);
    expect(await readFile(path.join(dir, 'AGENTS.md'), 'utf8')).toBe('mine');
    expect(await readFile(path.join(dir, '.agents/rules/a.md'), 'utf8')).toBe('rule');
  });

  it('prints the rules/skills section for a kept AGENTS.md and the CLAUDE.md import line', async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, 'AGENTS.md'), 'mine');
    await writeFile(path.join(dir, 'CLAUDE.md'), '# my claude notes');
    const plan = await planFiles(dir, [
      { path: 'AGENTS.md', content: agentsMd },
      { path: 'CLAUDE.md', content: '@AGENTS.md\n' },
    ]);
    const steps = await manualSteps(dir, plan);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toContain('## Rules');
    expect(steps[0]).toContain('## Skills');
    expect(steps[0]).not.toContain('intro');
    expect(steps[1]).toContain('@AGENTS.md');
  });

  it('does not ask to import AGENTS.md when CLAUDE.md already does', async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, 'CLAUDE.md'), 'notes\n@AGENTS.md\n');
    const plan = await planFiles(dir, [{ path: 'CLAUDE.md', content: '@AGENTS.md\n' }]);
    expect(await manualSteps(dir, plan)).toEqual([]);
  });


  it('upgrades a file only while it still has the recorded hash, and creates missing files', async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, 'untouched.md'), 'old');
    await writeFile(path.join(dir, 'edited-since.md'), 'someone changed this');
    const written = await applyUpgrade(
      dir,
      [{ path: 'untouched.md', content: 'new' }, { path: 'edited-since.md', content: 'new' }, { path: 'docs/missing.md', content: 'm' }],
      { 'untouched.md': contentHash('old'), 'edited-since.md': contentHash('old') },
      contentHash,
    );
    expect(written.map((f) => f.path)).toEqual(['untouched.md', 'docs/missing.md']);
    expect(await readFile(path.join(dir, 'untouched.md'), 'utf8')).toBe('new');
    expect(await readFile(path.join(dir, 'edited-since.md'), 'utf8')).toBe('someone changed this');
    expect(await readFile(path.join(dir, 'docs/missing.md'), 'utf8')).toBe('m');
  });
});

