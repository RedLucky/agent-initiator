/** Tests reading rule files other tools wrote into .agents/rules, so AGENTS.md can link them. */
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectExistingRules, parseExistingRule } from '../src/detect/rules.js';

describe('parseExistingRule', () => {
  it('reads Cursor-style frontmatter: description, globs list and alwaysApply', () => {
    const rule = parseExistingRule('api.md', '---\ndescription: API rules\nglobs: ["src/api/**"]\nalwaysApply: false\n---\n# API\n');
    expect(rule).toMatchObject({ file: 'api.md', description: 'API rules', globs: ['src/api/**'], alwaysApply: false, presetId: 'existing' });
  });

  it('reads Antigravity/Windsurf frontmatter: trigger always_on and comma-separated globs', () => {
    expect(parseExistingRule('graphify.md', '---\ntrigger: always_on\ndescription: Use the graph\n---\nbody')).toMatchObject({ alwaysApply: true, description: 'Use the graph' });
    expect(parseExistingRule('ts.md', '---\ntrigger: glob\nglobs: src/**/*.ts, test/**/*.ts\n---\n')?.globs).toEqual(['src/**/*.ts', 'test/**/*.ts']);
  });

  it('uses the first heading, or the file name, when there is no description', () => {
    expect(parseExistingRule('ponytail.md', '# Ponytail, lazy senior dev mode\n\nText')?.description).toBe('Ponytail, lazy senior dev mode');
    expect(parseExistingRule('notes.md', 'Just text')?.description).toBe('notes');
  });

  it('skips empty files and keeps a rule whose frontmatter is not valid YAML', () => {
    expect(parseExistingRule('caveman.md', '')).toBeNull();
    expect(parseExistingRule('broken.md', '---\ndescription: [unclosed\n---\n# Broken rule\n')).toMatchObject({ description: 'Broken rule', alwaysApply: false });
  });
});

describe('detectExistingRules', () => {
  it('reads the .md files directly in .agents/rules and ignores sub-folders', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-rules-'));
    await mkdir(path.join(dir, '.agents', 'rules', 'nested'), { recursive: true });
    await writeFile(path.join(dir, '.agents', 'rules', 'graphify.md'), '---\ntrigger: always_on\ndescription: Graph\n---\n');
    await writeFile(path.join(dir, '.agents', 'rules', 'nested', 'x.md'), '# X');
    await writeFile(path.join(dir, '.agents', 'rules', 'notes.txt'), 'x');
    expect((await detectExistingRules(dir)).map((r) => r.file)).toEqual(['graphify.md']);
    expect(await detectExistingRules(await mkdtemp(path.join(tmpdir(), 'agent-initiator-norules-')))).toEqual([]);
  });
});
