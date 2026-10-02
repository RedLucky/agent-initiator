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
      ]),
    );
    expect(file('CLAUDE.md')).toBe('@AGENTS.md\n');
    expect(file('docs/wiki/en/index.md')).toContain('# shop-web Wiki');
    expect(file('docs/wiki/en/log.md')).toContain('## 2026-09-30');
    expect(file('AGENTS.md')).toMatchSnapshot();
  });

  it('lists real scripts and rtk-prefixed DoD commands', async () => {
    const agents = (await generate('nextjs')).file('AGENTS.md') ?? '';
    expect(agents).toContain('| test | `rtk test pnpm run test` |');
    expect(agents).toContain('changed code: `rtk test pnpm run test`');
    expect(agents).toContain('Dependencies audited when they changed: `rtk proxy pnpm audit`');
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
    expect(root).toContain('| [nextjs](.agents/rules/nextjs.md) | `apps/web` |');

    const web = file('apps/web/AGENTS.md') ?? '';
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
    expect(root).toContain('| [moonrepo](.agents/rules/moonrepo.md) |');
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
    expect(file('AGENTS.md')).toContain('[nx-run-tasks](.agents/skills/nx-run-tasks/SKILL.md) — Helps with running tasks in an Nx workspace.');
    expect(paths).toContain('.claude/skills/nx-run-tasks/SKILL.md');
    expect(paths).not.toContain('.agents/skills/nx-run-tasks/SKILL.md');
  });
});
