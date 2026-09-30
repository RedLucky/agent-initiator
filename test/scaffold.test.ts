import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspectDir, parseApps, requiredBinaries, validateSpec } from '../src/scaffold/index.js';
import { buildScaffoldSteps } from '../src/scaffold/recipes.js';
import type { ScaffoldSpec, Step } from '../src/scaffold/types.js';

const root = '/work/acme';
const spec = (overrides: Partial<ScaffoldSpec>): ScaffoldSpec => ({
  root,
  layout: 'single',
  apps: [{ framework: 'nextjs', name: 'web' }],
  language: 'typescript',
  packageManager: 'pnpm',
  install: true,
  ...overrides,
});

const runs = (steps: Step[]) => steps.filter((s) => s.type === 'run').map((s) => (s.type === 'run' ? `${path.relative(root, s.cwd) || '.'}$ ${s.command} ${s.args.join(' ')}` : ''));

describe('buildScaffoldSteps', () => {
  it('scaffolds a single Next.js app into the root without git or AGENTS.md', () => {
    expect(runs(buildScaffoldSteps(spec({})))).toEqual([
      '.$ npx --yes create-next-app@latest . --yes --ts --app --eslint --src-dir --import-alias @/* --use-pnpm --disable-git --no-agents-md',
    ]);
  });

  it('passes skip-install and JS choices through', () => {
    const [cmd] = runs(buildScaffoldSteps(spec({ language: 'javascript', install: false, packageManager: 'npm' })));
    expect(cmd).toContain('--js');
    expect(cmd).toContain('--use-npm');
    expect(cmd).toContain('--skip-install');
  });

  it('falls back to TypeScript for TS-only frameworks', () => {
    const [cmd] = runs(buildScaffoldSteps(spec({ language: 'javascript', apps: [{ framework: 'hono', name: 'api' }] })));
    expect(cmd).toBe('.$ npx --yes create-hono@latest . --template nodejs --pm pnpm --install');
  });

  it('scaffolds web/ + api/ folders for a fullstack repo, each installing itself', () => {
    const steps = buildScaffoldSteps(spec({ layout: 'folders', apps: [{ framework: 'react-vite', name: 'web' }, { framework: 'fastapi', name: 'api' }] }));
    expect(runs(steps)).toEqual([
      '.$ npx --yes create-vite@latest web --template react-ts --no-interactive',
      'web$ pnpm install',
      'api$ uv init --bare --name api',
      'api$ uv add fastapi[standard]',
      'api$ uv add --dev pytest ruff mypy pip-audit',
    ]);
    expect(steps.some((s) => s.type === 'write' && s.path === `${root}/api/app/main.py`)).toBe(true);
    expect(steps.find((s) => s.type === 'append')).toMatchObject({ path: `${root}/api/pyproject.toml`, content: expect.stringContaining('entrypoint = "app.main:app"') });
  });

  it('builds a turborepo root, scaffolds apps without installing, then installs once', () => {
    const steps = buildScaffoldSteps(
      spec({ layout: 'turborepo', packageManagerVersion: '10.19.0', apps: [{ framework: 'nextjs', name: 'web' }, { framework: 'nestjs', name: 'api' }] }),
    );
    const written = steps.filter((s) => s.type === 'write').map((s) => (s.type === 'write' ? path.relative(root, s.path) : ''));
    expect(written).toEqual(['package.json', '.gitignore', 'pnpm-workspace.yaml', 'turbo.json']);
    expect(steps.some((s) => s.type === 'mkdir' && s.path === `${root}/apps`)).toBe(true);
    const rootPkg = steps.find((s) => s.type === 'write' && s.path === `${root}/package.json`);
    expect(rootPkg?.type === 'write' && JSON.parse(rootPkg.content).packageManager).toBe('pnpm@10.19.0');
    expect(runs(steps)).toEqual([
      '.$ npx --yes create-next-app@latest apps/web --yes --ts --app --eslint --src-dir --import-alias @/* --use-pnpm --disable-git --no-agents-md --skip-install',
      '.$ npx --yes @nestjs/cli@latest new api --directory apps/api --package-manager pnpm --skip-git --language TS --strict --skip-install',
      '.$ pnpm add -D -w turbo',
      '.$ pnpm install',
    ]);
    expect(steps.some((s) => s.type === 'remove' && s.path === `${root}/apps/web/pnpm-workspace.yaml`)).toBe(true);
  });

  it('uses Nx generators when a plugin exists and falls back otherwise', () => {
    const steps = buildScaffoldSteps(
      spec({ layout: 'nx', apps: [{ framework: 'nextjs', name: 'web' }, { framework: 'nestjs', name: 'api' }, { framework: 'go-http', name: 'svc' }] }),
    );
    expect(runs(steps)).toEqual([
      '..$ npx --yes create-nx-workspace@latest acme --template=nrwl/empty-template --pm=pnpm --nxCloud=skip --interactive=false --skipGit --aiAgents=none',
      '.$ npx nx add @nx/next',
      '.$ npx nx g @nx/next:app apps/web --no-interactive --e2eTestRunner=none --unitTestRunner=vitest',
      '.$ npx nx add @nx/nest',
      '.$ npx nx g @nx/nest:app apps/api --no-interactive --e2eTestRunner=none --unitTestRunner=vitest',
      'apps/svc$ go mod init svc',
      'apps/svc$ go get github.com/gin-gonic/gin@latest',
      'apps/svc$ go mod tidy',
      '.$ pnpm install',
    ]);
  });

  it('keeps the official Nx skills but removes competing agent files from the template', () => {
    const removed = buildScaffoldSteps(spec({ layout: 'nx' }))
      .filter((s) => s.type === 'remove')
      .map((s) => (s.type === 'remove' ? path.relative(root, s.path) : ''));
    expect(removed).toEqual(expect.arrayContaining(['AGENTS.md', 'CLAUDE.md', '.claude', '.agents/skills/monitor-ci']));
    expect(removed).not.toContain('.agents');
  });

  it('makes a new Django project pass tests and mypy out of the box', () => {
    const steps = buildScaffoldSteps(spec({ apps: [{ framework: 'django', name: 'api' }] }));
    expect(steps.some((s) => s.type === 'write' && s.path === `${root}/tests/test_smoke.py`)).toBe(true);
    expect(steps.find((s) => s.type === 'append')).toMatchObject({ content: expect.stringContaining('mypy_django_plugin.main') });
    expect(steps.find((s) => s.type === 'replace')).toMatchObject({ path: `${root}/config/settings.py`, replace: 'ALLOWED_HOSTS: list[str] = []' });
  });

  it('writes an Express app and lets the package manager pin versions', () => {
    const steps = buildScaffoldSteps(spec({ packageManager: 'bun', apps: [{ framework: 'express', name: 'api' }] }));
    expect(runs(steps)).toEqual([
      '.$ bun add express',
      '.$ bun add -d vitest supertest typescript tsx @types/node @types/express @types/supertest',
    ]);
  });

  it('verifies scaffolder output so silent failures are caught', () => {
    const steps = buildScaffoldSteps(spec({ apps: [{ framework: 'hono', name: 'api' }] }));
    expect(steps.at(-1)).toMatchObject({ type: 'expect', path: `${root}/package.json` });
  });
});

describe('scaffold helpers', () => {
  it('parses --apps with and without names', () => {
    expect(parseApps('web:nextjs, api:nestjs,fastapi')).toEqual([
      { name: 'web', framework: 'nextjs' },
      { name: 'api', framework: 'nestjs' },
      { name: 'api', framework: 'fastapi' },
    ]);
  });

  it('rejects duplicate or invalid app names and unknown frameworks', () => {
    expect(() => validateSpec(spec({ layout: 'folders', apps: [{ framework: 'nextjs', name: 'web' }, { framework: 'nuxt', name: 'web' }] }))).toThrow(/used twice/);
    expect(() => validateSpec(spec({ layout: 'folders', apps: [{ framework: 'nextjs', name: 'Web App' }] }))).toThrow(/kebab-case/);
    expect(() => validateSpec(spec({ apps: [{ framework: 'rails', name: 'web' }] }))).toThrow(/Unknown framework "rails"/);
    expect(() => validateSpec(spec({ apps: [{ framework: 'nextjs', name: 'a' }, { framework: 'nestjs', name: 'b' }] }))).toThrow(/exactly one app/);
  });

  it('lists required binaries per runtime', () => {
    expect(requiredBinaries(spec({ layout: 'folders', packageManager: 'bun', apps: [{ framework: 'nextjs', name: 'web' }, { framework: 'django', name: 'api' }, { framework: 'go-http', name: 'svc' }] }))).toEqual(
      ['git', 'npx', 'bun', 'uv', 'go'],
    );
    expect(requiredBinaries(spec({ apps: [{ framework: 'fastapi', name: 'api' }] }))).toEqual(['git', 'uv']);
  });

  it('classifies directories as missing, empty (ignoring .git) or project', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-scaffold-'));
    expect(await inspectDir(path.join(dir, 'nope'))).toBe('missing');
    await mkdir(path.join(dir, '.git'));
    expect(await inspectDir(dir)).toBe('empty');
    await writeFile(path.join(dir, 'README.md'), 'hi');
    expect(await inspectDir(dir)).toBe('project');
  });
});

describe('specFromFlags', () => {
  it('maps CLI flags to a spec (including --skip-install)', async () => {
    const { specFromFlags } = await import('../src/scaffold/flags.js');
    expect(specFromFlags('/x', { framework: 'nestjs', lang: 'js', pm: 'yarn', skipInstall: true }, 'pnpm')).toEqual({
      root: '/x',
      layout: 'single',
      apps: [{ framework: 'nestjs', name: 'api' }],
      language: 'javascript',
      packageManager: 'yarn',
      install: false,
    });
    expect(specFromFlags('/x', { apps: 'web:nextjs,api:fastapi' }, 'pnpm')).toMatchObject({ layout: 'folders', install: true, packageManager: 'pnpm' });
  });

  it('rejects invalid layout, language and package manager values', async () => {
    const { specFromFlags } = await import('../src/scaffold/flags.js');
    expect(() => specFromFlags('/x', { framework: 'nextjs', layout: 'lerna' }, 'npm')).toThrow(/Unknown layout/);
    expect(() => specFromFlags('/x', { framework: 'nextjs', lang: 'rust' }, 'npm')).toThrow(/--lang/);
    expect(() => specFromFlags('/x', { framework: 'nextjs', pm: 'deno' }, 'npm')).toThrow(/--pm/);
  });
});

describe('scaffoldEnv', () => {
  it('drops agent-detection variables but keeps the rest', async () => {
    const { scaffoldEnv } = await import('../src/scaffold/run.js');
    expect(scaffoldEnv({ CLAUDECODE: '1', OPENCODE: '1', PATH: '/bin', HOME: '/home/u' })).toEqual({ PATH: '/bin', HOME: '/home/u' });
  });
});
