import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { planToolSetup, runToolSetup, type SetupAction } from '../src/setup.js';

describe('planToolSetup', () => {
  it('plans UI UX Pro Max skills, the graphify graph + hooks, then the lefthook hooks', () => {
    const plan = planToolSetup(['ponytail', 'caveman', 'rtk', 'graphify', 'lefthook', 'ui-ux-pro-max']);
    expect(plan.map((a) => `${a.command} ${a.args.join(' ')}`)).toEqual([
      'uipro init --ai universal',
      'uipro init --ai claude',
      'graphify update .',
      'graphify hook install',
      'lefthook install',
    ]);
  });

  it('needs nothing for tools that activate globally', () => {
    expect(planToolSetup(['rtk', 'caveman', 'ponytail'])).toEqual([]);
  });
});

describe('runToolSetup', () => {
  it('skips missing binaries and git-only actions outside a repo without failing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-setup-'));
    const actions: SetupAction[] = [
      { tool: 'x', label: 'missing tool', command: 'definitely-not-installed-xyz', args: [] },
      { tool: 'x', label: 'needs git', command: 'node', args: ['-e', ''], requiresGit: true },
      { tool: 'x', label: 'runs', command: 'node', args: ['-e', ''] },
      { tool: 'x', label: 'fails', command: 'node', args: ['-e', 'process.exit(3)'] },
    ];
    const results = await runToolSetup(dir, actions);
    expect(results.map((r) => r.outcome)).toEqual(['skipped', 'skipped', 'done', 'failed']);
    expect(results[1]?.reason).toContain('git');
  });
});

describe('selectDefaultActions (--yes without --setup-tools)', () => {
  it('runs only the graphify hooks, and only while .gitattributes does not exist', async () => {
    const { selectDefaultActions } = await import('../src/setup.js');
    const { writeFile } = await import('node:fs/promises');
    const plan = planToolSetup(['graphify', 'ui-ux-pro-max']);
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-default-'));

    const fresh = await selectDefaultActions(dir, plan);
    expect(fresh.run.map((a) => `${a.command} ${a.args.join(' ')}`)).toEqual(['graphify hook install']);
    expect(fresh.skipped).toEqual([]);

    await writeFile(path.join(dir, '.gitattributes'), '*.png binary\n');
    const existing = await selectDefaultActions(dir, plan);
    expect(existing.run).toEqual([]);
    expect(existing.skipped[0]?.reason).toContain('.gitattributes already exists');
  });

  it('runs lefthook install by default unless another hook manager is already in use', async () => {
    const { selectDefaultActions } = await import('../src/setup.js');
    const { mkdir } = await import('node:fs/promises');
    const plan = planToolSetup(['lefthook']);
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-default-'));

    expect((await selectDefaultActions(dir, plan)).run.map((a) => a.command)).toEqual(['lefthook']);

    await mkdir(path.join(dir, '.husky'));
    const withHusky = await selectDefaultActions(dir, plan);
    expect(withHusky.run).toEqual([]);
    expect(withHusky.skipped[0]?.reason).toContain('.husky already exists');
  });
});
