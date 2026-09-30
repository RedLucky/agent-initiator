import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { planToolSetup, runToolSetup, type SetupAction } from '../src/setup.js';

describe('planToolSetup', () => {
  it('plans UI UX Pro Max skills and the graphify graph + hooks', () => {
    const plan = planToolSetup(['ponytail', 'caveman', 'rtk', 'graphify', 'ui-ux-pro-max']);
    expect(plan.map((a) => `${a.command} ${a.args.join(' ')}`)).toEqual([
      'uipro init --ai universal',
      'uipro init --ai claude',
      'graphify update .',
      'graphify hook install',
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
