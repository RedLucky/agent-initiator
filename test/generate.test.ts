import { readdirSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { detectProject } from '../src/detect/index.js';
import { AGENTS_MD_MAX_BYTES, generateFiles } from '../src/generate.js';
import { defaultPresetsDir, loadRegistry, type Registry } from '../src/presets/registry.js';

const fixture = (name: string) => path.join(import.meta.dirname, 'fixtures', name);
const options = { date: '2026-09-30' };
let registry: Registry;

beforeAll(async () => {
  registry = await loadRegistry(await defaultPresetsDir());
});

async function generate(name: string) {
  const result = generateFiles(await detectProject(fixture(name)), registry, options);
  const file = (p: string) => result.files.find((f) => f.path === p)?.content;
  return { ...result, file, paths: result.files.map((f) => f.path) };
}

describe('generateFiles', () => {
  it('generates the full layout for a single Next.js app', async () => {
    const { kind, paths, file } = await generate('nextjs');
    expect(kind).toBe('frontend');
    expect(paths).toEqual(
      expect.arrayContaining([
        'AGENTS.md',
        'CLAUDE.md',
        '.agents/rules/llm-discipline.md',
        '.agents/rules/nextjs.md',
        '.agents/skills/commit/SKILL.md',
        '.claude/skills/commit/SKILL.md',
        '.agents/skills/nextjs-add-route/SKILL.md',
        'docs/wiki/en/index.md',
        'docs/wiki/en/log.md',
        'docs/wiki/id/index.md',
        'docs/wiki/id/log.md',
        ...['overview', 'getting-started', 'architecture', 'glossary', 'faq'].flatMap((page) => [`docs/wiki/en/${page}.md`, `docs/wiki/id/${page}.md`]),
      ]),
    );
    expect(file('docs/wiki/en/overview.md')).toContain('# Overview of shop-web');
    expect(file('CLAUDE.md')).toBe('@AGENTS.md\n');
    expect(paths.filter((p) => p.includes('lefthook'))).toEqual([]);
    expect(file('docs/wiki/en/index.md')).toContain('# shop-web Wiki');
    expect(file('docs/wiki/en/log.md')).toContain('## 2026-09-30');
    expect(file('AGENTS.md')).toMatchSnapshot();
  });

  it('lists real scripts and rtk-prefixed DoD commands', async () => {
    const agents = (await generate('nextjs')).file('AGENTS.md') ?? '';
    expect(agents).toContain('| test | `rtk test pnpm run test` |');
    expect(agents).toContain('changed code: `rtk test pnpm run test`');
    expect(agents).toContain('Dependencies audited when they changed: `rtk proxy pnpm audit --audit-level high`');
    expect(agents).toContain('Build succeeds: `rtk err pnpm run build`');
    expect(agents).toContain('ui-ux-pro-max');
  });

  it('flags missing test/build commands instead of inventing them', async () => {
    const agents = (await generate('express')).file('AGENTS.md') ?? '';
    expect(agents).toContain('no `test` command configured yet');
    expect(agents).not.toContain('UI UX Pro Max');
  });

  it('uses preset commands for python and go', async () => {
    expect((await generate('fastapi')).file('AGENTS.md')).toContain('`rtk test uv run pytest`');
    expect((await generate('django')).file('AGENTS.md')).toContain('`rtk test python manage.py test`');
    expect((await generate('go')).file('AGENTS.md')).toContain('`rtk test go test ./...`');
  });

  it('generates root + nested AGENTS.md for a turborepo', async () => {
    const { kind, paths, file } = await generate('turborepo');
    expect(kind).toBe('monorepo');
    expect(paths).toEqual(expect.arrayContaining(['apps/web/AGENTS.md', 'apps/api/AGENTS.md', 'packages/ui/AGENTS.md']));
    expect(paths).not.toContain('apps/web/CLAUDE.md');

    const root = file('AGENTS.md') ?? '';
    expect(root).toContain('| test | `rtk test pnpm run test` |');
    expect(root).toContain('[`apps/web`](apps/web/AGENTS.md)');
    expect(root).toContain('[add-package](.agents/skills/add-package/SKILL.md)');
    expect(root).toContain('- [nextjs](.agents/rules/nextjs.md) — `apps/web`');

    expect(root).toContain('## Project knowledge');
    const web = file('apps/web/AGENTS.md') ?? '';
    expect(web).toContain('read the English wiki in `../../docs/wiki/en/`');
    expect(web).toContain('From the repo root: `rtk test pnpm exec turbo run test --filter=@acme/web`');
    expect(web).toContain('[nextjs](../../.agents/rules/nextjs.md)');
    expect(web).not.toContain('llm-discipline');
    expect(web).toMatchSnapshot();
  });

  it('treats web/ + api/ folders as a fullstack repo with per-package commands', async () => {
    const { kind, file } = await generate('fullstack');
    expect(kind).toBe('fullstack');
    expect(file('AGENTS.md')).toContain("Commands are per package");
    expect(file('api/AGENTS.md')).toContain('`rtk test poetry run pytest`');
    expect(file('web/AGENTS.md')).toContain('`rtk test pnpm run test`');
  });

  it('still generates the base layout for an empty repo', async () => {
    const { kind, paths, file } = await generate('../fixtures-empty-does-not-exist');
    expect(file('AGENTS.md')).toContain('no `test` command configured yet');
    expect(file('AGENTS.md')).not.toContain('each affected package');
    expect(kind).toBe('unknown');
    expect(paths).toContain('AGENTS.md');
    expect(paths).toContain('.agents/skills/definition-of-done/SKILL.md');
  });

  it('generates root + nested AGENTS.md for a multi-language moonrepo', async () => {
    const { kind, paths, file } = await generate('moonrepo');
    expect(kind).toBe('monorepo');
    expect(paths).toEqual(
      expect.arrayContaining([
        'apps/web/AGENTS.md',
        'apps/api/AGENTS.md',
        'apps/service/AGENTS.md',
        '.agents/rules/moonrepo.md',
      ]),
    );

    const root = file('AGENTS.md') ?? '';
    expect(root).toContain('moon run :test');
    expect(root).toContain('moon run :build');
    expect(root).toContain('moon run :lint');
    expect(root).not.toContain('moon check`');
    expect(root).toContain('[`apps/web`](apps/web/AGENTS.md)');
    expect(root).toContain('[`apps/api`](apps/api/AGENTS.md)');
    expect(root).toContain('[`apps/service`](apps/service/AGENTS.md)');
    expect(root).toContain('[moonrepo](.agents/rules/moonrepo.md)');
    expect(root).toContain('Run tasks through moon');
    expect(root).toContain('.moon/cache/');

    const web = file('apps/web/AGENTS.md') ?? '';
    expect(web).toContain('From the repo root: `rtk test moon run web:test`');
    expect(web).toContain('Language:** typescript');

    const api = file('apps/api/AGENTS.md') ?? '';
    expect(api).toContain('From the repo root: `rtk test moon run api:test`');
    expect(api).toContain('Language:** python');

    const service = file('apps/service/AGENTS.md') ?? '';
    expect(service).toContain('From the repo root: `rtk test moon run service:test`');
    expect(service).toContain('Language:** go');
  });

  it('skips the root install command when a moon repo has no root package.json', async () => {
    const agents = (await generate('moon-config')).file('AGENTS.md') ?? '';
    expect(agents).toContain('`rtk test moon run :test`');
    expect(agents).not.toContain('npm install');
  });

  it.each(['nextjs', 'turborepo', 'fullstack', 'django', 'moonrepo'])('keeps %s AGENTS.md under the 32 KiB agent limit', async (name) => {
    const agents = (await generate(name)).file('AGENTS.md') ?? '';
    expect(Buffer.byteLength(agents)).toBeLessThan(AGENTS_MD_MAX_BYTES);
  });

  // Agents read the root AGENTS.md at the start of every session, so every byte costs tokens each time.
  // 12 KiB is about 3,000 tokens; install steps and rule/skill details belong in the files AGENTS.md links to.
  it.each(readdirSync(path.join(import.meta.dirname, 'fixtures')))('keeps the %s root AGENTS.md within the 12 KiB token budget', async (name) => {
    const agents = (await generate(name)).file('AGENTS.md') ?? '';
    expect(Buffer.byteLength(agents)).toBeLessThanOrEqual(12 * 1024);
  });

  it('puts the official Next.js block in the AGENTS.md next to the Next.js app', async () => {
    const single = (await generate('nextjs')).file('AGENTS.md') ?? '';
    expect(single).toContain('<!-- BEGIN:nextjs-agent-rules -->');
    const mono = await generate('turborepo');
    expect(mono.file('apps/web/AGENTS.md')).toContain('<!-- BEGIN:nextjs-agent-rules -->');
    expect(mono.file('apps/api/AGENTS.md')).not.toContain('nextjs-agent-rules');
    expect(mono.file('AGENTS.md')).not.toContain('nextjs-agent-rules');
  });

  it('renders version-matched framework docs per package', async () => {
    const mono = await generate('turborepo');
    expect(mono.file('AGENTS.md')).toContain('node_modules/turbo/docs/README.md');
    expect(mono.file('apps/api/AGENTS.md')).toContain('https://docs.nestjs.com/llms.txt');
    expect((await generate('fastapi')).file('AGENTS.md')).toContain('fastapi/.agents/skills/fastapi/SKILL.md');
  });

  it('indexes skills already in .agents/skills and mirrors them for Claude Code', async () => {
    const { file, paths } = await generate('nx-skills');
    expect(file('AGENTS.md')).toContain('[nx-run-tasks](.agents/skills/nx-run-tasks/SKILL.md)');
    expect(paths).toContain('.claude/skills/nx-run-tasks/SKILL.md');
    expect(paths).not.toContain('.agents/skills/nx-run-tasks/SKILL.md');
  });
});

describe('Project knowledge section', () => {
  /** Minimal root AGENTS.md input; only the tooling list varies between tests. */
  const input = (tooling: string[]) => ({
    projectName: 'demo',
    kind: 'library' as const,
    stack: 'TypeScript',
    packages: [],
    commands: [],
    tooling,
    docs: [],
    agentsMdBlocks: [],
    conventions: [],
    must: [],
    never: [],
    rules: [],
    skills: [],
  });

  it('mentions graphify only when graphify is a required tool', async () => {
    const { renderRootAgentsMd } = await import('../src/render/agents-md.js');
    const withGraphify = renderRootAgentsMd(input(['graphify']));
    const withoutGraphify = renderRootAgentsMd(input([]));
    expect(withGraphify).toContain('graphify affected');
    expect(withoutGraphify).toContain('## Project knowledge');
    expect(withoutGraphify).toContain('AI agents read the English pages only');
    expect(withoutGraphify).not.toContain('graphify affected');
  });

  it('audits Go modules without installing govulncheck first', async () => {
    expect((await generate('go')).file('AGENTS.md')).toContain('`rtk proxy go run golang.org/x/vuln/cmd/govulncheck@latest ./...`');
  });

  it('writes no CI pipeline: CI stays the repository owner\'s choice', async () => {
    const { paths } = await generate('turborepo');
    expect(paths.filter((p) => p.startsWith('.github/') || p === '.gitlab-ci.yml')).toEqual([]);
  });

  it('keeps AGENTS.md compact: always rules on one line, on-demand rules with their purpose, skills by name', async () => {
    const agents = (await generate('express')).file('AGENTS.md') ?? '';
    expect(agents).toMatch(/- \*\*Always:\*\* \[code-quality\]\(\.agents\/rules\/code-quality\.md\), /);
    expect(agents).toContain('- [api-design](.agents/rules/api-design.md) — on demand: Backend/API standards');
    expect(agents).toContain('- [required-tooling](.agents/rules/required-tooling.md) — on demand: Required tooling');
    expect(agents).toContain('[commit](.agents/skills/commit/SKILL.md), ');
    expect(agents).not.toContain('```bash');
  });

  it('leaves out every tool that is not installed: no rtk prefix, no graphify, no tooling section', async () => {
    const project = await detectProject(fixture('turborepo'));
    const { files } = generateFiles(project, registry, { ...options, installedTools: [] });
    const file = (p: string) => files.find((f) => f.path === p)?.content ?? '';
    const root = file('AGENTS.md');
    expect(root).toContain('| test | `pnpm run test` |');
    expect(root).not.toMatch(/rtk|graphify|ponytail|caveman|ui-ux-pro-max/);
    expect(root).not.toContain('## Required tooling');
    expect(file('apps/web/AGENTS.md')).not.toContain('rtk');
    expect(files.map((f) => f.path)).not.toContain('.graphifyignore');
    expect(files.map((f) => f.path)).not.toContain('.agents/rules/required-tooling.md');
  });

  it('makes installed tools required and mentions only those', async () => {
    const project = await detectProject(fixture('nextjs'));
    const { files } = generateFiles(project, registry, { ...options, installedTools: ['rtk', 'ui-ux-pro-max'] });
    const agents = files.find((f) => f.path === 'AGENTS.md')?.content ?? '';
    expect(agents).toContain('| test | `rtk test pnpm run test` |');
    expect(agents).toContain('- **rtk (Rust Token Killer)** — Prefix every shell command with `rtk`');
    expect(agents).toContain('- **UI UX Pro Max** —');
    expect(agents).not.toMatch(/graphify|ponytail|caveman/);
    expect(files.find((f) => f.path === '.agents/rules/required-tooling.md')?.content).not.toContain('graphify');
  });

  it('writes shell commands in skills and rules with the rtk prefix only when rtk is installed', async () => {
    const generated = async (fixtureName: string, installedTools: string[]) =>
      generateFiles(await detectProject(fixture(fixtureName)), registry, { ...options, installedTools }).files;
    const read = (files: Array<{ path: string; content: string }>, p: string) => files.find((f) => f.path === p)?.content ?? '';

    const withRtk = await generated('nextjs', ['rtk']);
    expect(read(withRtk, '.claude/skills/commit/SKILL.md')).toContain('`rtk git status` and `rtk git diff --staged`');
    expect(read(withRtk, 'AGENTS.md')).toContain('| install | `rtk proxy pnpm install` |');
    expect(read(await generated('moonrepo', ['rtk']), '.agents/rules/moonrepo.md')).toContain('`rtk moon run :test`');

    const plain = await generated('nextjs', []);
    expect(read(plain, '.claude/skills/commit/SKILL.md')).toContain('`git status` and `git diff --staged`');
    expect(read(plain, 'AGENTS.md')).toContain('| install | `pnpm install` |');
  });

  it.each(['nextjs', 'turborepo', 'moonrepo', 'nx', 'go'])('leaves no {{placeholder}} unfilled in %s rules and skills', async (name) => {
    const { files } = await generate(name);
    const leftovers = files.filter((f) => f.path.startsWith('.agents/') || f.path.startsWith('.claude/')).filter((f) => /\{\{\w+\}\}/.test(f.content));
    expect(leftovers.map((f) => f.path)).toEqual([]);
  });

  it('tells agents on machines without a tool to check once and skip it instead of retrying', async () => {
    const { renderRootAgentsMd } = await import('../src/render/agents-md.js');
    const full = renderRootAgentsMd(input(['rtk', 'graphify']));
    expect(full).toContain('Check once per session which are installed (`command -v rtk graphify`).');
    expect(full).toContain('without rtk, run each command without its `rtk`, `rtk test`, `rtk err` or `rtk proxy` prefix');
    const pluginsOnly = renderRootAgentsMd(input(['ponytail']));
    expect(pluginsOnly).toContain('If a tool is missing on your machine, skip its instructions instead of retrying.');
    expect(pluginsOnly).not.toContain('command -v');
  });

  it('reads the core rules on every task and topic rules (wiki, architecture, privacy, observability) on demand', async () => {
    const agents = (await generate('express')).file('AGENTS.md') ?? '';
    const always = agents.split('\n').find((line) => line.startsWith('- **Always:**')) ?? '';
    for (const rule of ['code-quality', 'error-handling-logging', 'git-workflow', 'llm-discipline', 'naming-conventions', 'security', 'testing']) {
      expect(always, rule).toContain(`[${rule}]`);
    }
    for (const rule of ['documentation', 'architecture', 'data-privacy', 'observability']) {
      expect(always, rule).not.toContain(`[${rule}]`);
      expect(agents).toContain(`- [${rule}](.agents/rules/${rule}.md) — on demand: `);
    }
  });
});

