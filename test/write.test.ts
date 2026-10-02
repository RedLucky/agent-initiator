import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyPlan, manualSteps, planFiles } from '../src/write/index.js';

const tempDir = () => mkdtemp(path.join(tmpdir(), 'agent-initiator-write-'));

const agentsMd = '# AGENTS.md\n\nintro\n\n## Rules\n\n| rule |\n\n## Skills\n\n- skill\n';

describe('write', () => {
  it.skipIf(process.platform === 'win32')('makes shell scripts executable and other files not', async () => {
    const dir = await tempDir();
    const plan = await planFiles(dir, [
      { path: '.lefthook/commit-msg/check-message.sh', content: '#!/bin/sh\n' },
      { path: 'lefthook.yml', content: 'x' },
    ]);
    await applyPlan(dir, plan);
    const isExecutable = async (file: string) => ((await stat(path.join(dir, file))).mode & 0o100) !== 0;
    expect(await isExecutable('.lefthook/commit-msg/check-message.sh')).toBe(true);
    expect(await isExecutable('lefthook.yml')).toBe(false);
  });

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

  it('prints the commit-msg block for a kept lefthook.yml that lacks the check', async () => {
    const { renderLefthookConfig } = await import('../src/render/lefthook.js');
    const dir = await tempDir();
    await writeFile(path.join(dir, 'lefthook.yml'), 'pre-commit:\n  commands: {}\n');
    const plan = await planFiles(dir, [{ path: 'lefthook.yml', content: renderLefthookConfig({ graphify: true, checks: [] }) }]);
    const [step] = await manualSteps(dir, plan);
    expect(step).toContain('commit-msg:\n  scripts:\n    "check-message.sh":\n      runner: sh');
    expect(step).not.toContain('post-commit');
  });

  it('asks nothing when the kept lefthook.yml already runs the check', async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, 'lefthook.yml'), 'commit-msg:\n  scripts:\n    "check-message.sh":\n      runner: sh\n');
    const plan = await planFiles(dir, [{ path: 'lefthook.yml', content: 'commit-msg:\n' }]);
    expect(await manualSteps(dir, plan)).toEqual([]);
  });
});
