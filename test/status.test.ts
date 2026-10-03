/** Tests the three-way comparison behind `agent-initiator status`: manifest (what init wrote), disk and new output. */
import { describe, expect, it } from 'vitest';
import { contentHash } from '../src/render/manifest.js';
import { ACTION_STATES, classifyFiles, upgradeFiles } from '../src/status.js';

const h = contentHash;
/** One generated file with the given new content. */
const gen = (path: string, content: string) => ({ path, content });

describe('classifyFiles', () => {
  it('sorts every case of what init wrote, what is on disk and what this version generates', () => {
    const result = classifyFiles({
      recorded: { same: h('a'), outdated: h('old'), edited: h('a'), conflict: h('old'), gone: h('x'), deleted: h('x') },
      onDisk: { same: h('a'), outdated: h('old'), edited: h('mine'), conflict: h('mine'), missing: null, gone: h('x'), deleted: null },
      generated: [gen('same', 'a'), gen('outdated', 'new'), gen('edited', 'a'), gen('conflict', 'new'), gen('missing', 'a')],
    });
    expect(result.map((r) => [r.path, r.state])).toEqual([
      ['same', 'up-to-date'],
      ['outdated', 'outdated'],
      ['edited', 'edited'],
      ['conflict', 'conflict'],
      ['missing', 'missing'],
      ['gone', 'obsolete'],
    ]);
    expect(result.find((r) => r.path === 'outdated')?.generated).toBe('new');
  });

  it('counts a file that already matches the new output as up to date, whoever changed it', () => {
    const [entry] = classifyFiles({ recorded: { f: h('old') }, onDisk: { f: h('new') }, generated: [gen('f', 'new')] });
    expect(entry?.state).toBe('up-to-date');
  });

  it('without a manifest, can only tell same, differs or missing', () => {
    const result = classifyFiles({ recorded: null, onDisk: { a: h('x'), b: h('mine') }, generated: [gen('a', 'x'), gen('b', 'new'), gen('c', 'x')] });
    expect(result.map((r) => r.state)).toEqual(['up-to-date', 'differs', 'missing']);
  });

  it('needs action only for outdated, conflict and missing files', () => {
    expect(ACTION_STATES).toEqual(['outdated', 'conflict', 'missing']);
  });
});

describe('upgradeFiles', () => {
  it('writes only outdated and missing files, never edited, conflicting or unrecorded ones', () => {
    const statuses = classifyFiles({
      recorded: { outdated: h('old'), edited: h('a'), conflict: h('old') },
      onDisk: { outdated: h('old'), edited: h('mine'), conflict: h('mine'), differs: h('mine'), missing: null },
      generated: [gen('outdated', 'new'), gen('edited', 'a'), gen('conflict', 'new'), gen('differs', 'x'), gen('missing', 'm')],
    });
    expect(upgradeFiles(statuses)).toEqual([gen('outdated', 'new'), gen('missing', 'm')]);
  });
});

describe('seed-once files (the wiki)', () => {
  it('leaves wiki pages out: not compared, not recreated when deleted, never obsolete', () => {
    const result = classifyFiles({
      recorded: { 'docs/wiki/en/faq.md': h('skeleton'), 'docs/wiki/en/old.md': h('x'), 'AGENTS.md': h('a') },
      onDisk: { 'docs/wiki/en/faq.md': null, 'docs/wiki/en/index.md': h('team notes'), 'docs/wiki/en/old.md': h('x'), 'AGENTS.md': h('a') },
      generated: [gen('docs/wiki/en/faq.md', 'new skeleton'), gen('docs/wiki/en/index.md', 'skeleton'), gen('AGENTS.md', 'a')],
    });
    expect(result).toEqual([{ path: 'AGENTS.md', state: 'up-to-date', generated: 'a' }]);
    expect(upgradeFiles(result)).toEqual([]);
  });
});

