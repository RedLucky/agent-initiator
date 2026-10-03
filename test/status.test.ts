/** Tests the three-way comparison behind `agent-initiator status`: manifest (what init wrote), disk and new output. */
import { describe, expect, it } from 'vitest';
import { contentHash } from '../src/render/manifest.js';
import { ACTION_STATES, classifyFiles } from '../src/status.js';

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
