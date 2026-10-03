/**
 * Guards this repository's own wiki (docs/wiki), which the documentation rule treats as a knowledge base:
 * every English page has an Indonesian twin, starts with a plain-language summary, is listed in the index,
 * and keeps the same diagrams in both languages.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { walkFiles } from '../src/fs-utils.js';

const wikiRoot = path.join(import.meta.dirname, '..', 'docs', 'wiki');

/** Lists the Markdown pages of one language, as paths relative to that language folder. */
async function pages(lang: 'en' | 'id'): Promise<string[]> {
  return (await walkFiles(path.join(wikiRoot, lang))).filter((file) => file.endsWith('.md')).sort();
}

/** Reads one wiki page. */
function read(lang: 'en' | 'id', page: string): Promise<string> {
  return readFile(path.join(wikiRoot, lang, page), 'utf8');
}

/** Counts Mermaid diagram blocks in a page. */
function mermaidCount(content: string): number {
  return content.split('```mermaid').length - 1;
}

describe('repository wiki (knowledge base)', () => {
  it('has the same pages in English and Indonesian', async () => {
    expect(await pages('id')).toEqual(await pages('en'));
  });

  it('starts every page (except the log) with a plain-language summary', async () => {
    for (const page of (await pages('en')).filter((p) => p !== 'log.md')) {
      expect(await read('en', page), `docs/wiki/en/${page}`).toContain('## In short');
      expect(await read('id', page), `docs/wiki/id/${page}`).toContain('## Singkatnya');
    }
  });

  it('lists every page in the index of both languages', async () => {
    const all = (await pages('en')).filter((p) => p !== 'index.md');
    for (const lang of ['en', 'id'] as const) {
      const index = await read(lang, 'index.md');
      for (const page of all) expect(index, `docs/wiki/${lang}/index.md should link ${page}`).toContain(`](${page})`);
    }
  });

  it('keeps the same number of diagrams in both languages', async () => {
    for (const page of await pages('en')) {
      expect(mermaidCount(await read('id', page)), page).toBe(mermaidCount(await read('en', page)));
    }
  });

  it('closes the log format example before the first entry, so entries render as headings', async () => {
    for (const lang of ['en', 'id'] as const) {
      const log = await read(lang, 'log.md');
      const fences = [...log.matchAll(/^```/gm)].map((m) => m.index);
      const firstEntry = log.search(/^## \d{4}-\d{2}-\d{2}/m);
      expect(fences, `docs/wiki/${lang}/log.md`).toHaveLength(2);
      expect(fences[1], `docs/wiki/${lang}/log.md`).toBeLessThan(firstEntry);
    }
  });

  it('routes AI agents to English pages by task', async () => {
    const index = await read('en', 'index.md');
    expect(index).toContain('## For AI agents: task → page');
    expect(index).toContain('Read the English pages only');
    expect(await read('id', 'index.md')).toContain('## Untuk AI agent: task → halaman');
  });

  it('keeps every row of the index tables complete (no lost cells)', async () => {
    for (const lang of ['en', 'id'] as const) {
      const lines = (await read(lang, 'index.md')).split('\n');
      const cells = (row: string) => row.split(/(?<!\\)\|/).length;
      let header = '';
      lines.forEach((line, i) => {
        if (!line.startsWith('|')) return void (header = '');
        // The first row of each table is its header; every other row needs the same number of cells.
        if (header === '') return void (header = line);
        expect(cells(line), `docs/wiki/${lang}/index.md line ${i + 1}`).toBe(cells(header));
      });
    }
  });

  it('has the reading paths for every kind of reader', async () => {
    expect(await read('en', 'index.md')).toMatch(/Not a developer[\s\S]*A new developer[\s\S]*An experienced developer/);
    expect(await read('id', 'index.md')).toMatch(/Bukan developer[\s\S]*Developer baru[\s\S]*Developer berpengalaman/);
  });
});
