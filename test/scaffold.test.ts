import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspectDir, parseApps, postScaffoldNotes, requiredBinaries, validateSpec } from '../src/scaffold/index.js';
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

  it('builds a moonrepo root, scaffolds apps without installing, then installs once', () => {
    const steps = buildScaffoldSteps(
      spec({ layout: 'moonrepo', packageManagerVersion: '10.19.0', apps: [{ framework: 'nextjs', name: 'web' }, { framework: 'nestjs', name: 'api' }] }),
    );
    const written = steps.filter((s) => s.type === 'write').map((s) => (s.type === 'write' ? path.relative(root, s.path) : ''));
    expect(written).toEqual(['package.json', '.gitignore', 'pnpm-workspace.yaml', '.moon/workspace.yml']);
    expect(steps.some((s) => s.type === 'mkdir' && s.path === `${root}/apps`)).toBe(true);
    const rootPkg = steps.find((s) => s.type === 'write' && s.path === `${root}/package.json`);
    expect(rootPkg?.type === 'write' && JSON.parse(rootPkg.content).packageManager).toBe('pnpm@10.19.0');
    expect(runs(steps)).toEqual([
      '.$ npx --yes create-next-app@latest apps/web --yes --ts --app --eslint --src-dir --import-alias @/* --use-pnpm --disable-git --no-agents-md --skip-install',
      '.$ npx --yes @nestjs/cli@latest new api --directory apps/api --package-manager pnpm --skip-git --language TS --strict --skip-install',
      '.$ pnpm add -D -w @moonrepo/cli',
      '.$ pnpm install',
    ]);
    const moonSteps = steps.filter((s) => s.type === 'moon-tasks').map((s) => (s.type === 'moon-tasks' ? path.relative(root, s.dir) : ''));
    expect(moonSteps).toEqual(['apps/web', 'apps/api']);
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

describe('moon project tasks', () => {
  it('maps only the package scripts that exist', async () => {
    const { moonProjectConfig } = await import('../src/scaffold/templates.js');
    const yaml = moonProjectConfig('nextjs', 'pnpm', ['dev', 'build', 'lint']);
    expect(yaml).toContain("  build:\n    command: 'pnpm run build'");
    expect(yaml).toContain("  lint:\n    command: 'pnpm run lint'");
    expect(yaml).not.toContain('test:');
    expect(yaml).not.toContain('dev:');
  });

  it('uses fixed commands for Python and Go apps', async () => {
    const { moonProjectConfig } = await import('../src/scaffold/templates.js');
    expect(moonProjectConfig('fastapi', 'pnpm', [])).toContain("command: 'uv run pytest'");
    expect(moonProjectConfig('go-http', 'pnpm', [])).toContain("command: 'go test ./...'");
  });

  it('writes moon.yml from the real package.json and never overwrites an existing one', async () => {
    const { runSteps } = await import('../src/scaffold/run.js');
    const { readFile } = await import('node:fs/promises');
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-moon-'));
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'vitest run' } }));
    const step = { type: 'moon-tasks' as const, label: 'moon', dir, framework: 'nestjs', packageManager: 'npm' as const };
    await runSteps([step]);
    expect(await readFile(path.join(dir, 'moon.yml'), 'utf8')).toContain("command: 'npm run test'");
    await writeFile(path.join(dir, 'moon.yml'), 'mine');
    await runSteps([step]);
    expect(await readFile(path.join(dir, 'moon.yml'), 'utf8')).toBe('mine');
  });

  it('reports a broken package.json with its path instead of hiding the error', async () => {
    const { runSteps } = await import('../src/scaffold/run.js');
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-moon-bad-'));
    await writeFile(path.join(dir, 'package.json'), '{ not json');
    const step = { type: 'moon-tasks' as const, label: 'moon', dir, framework: 'nestjs', packageManager: 'npm' as const };
    await expect(runSteps([step])).rejects.toThrow(`Invalid JSON in ${path.join(dir, 'package.json')}`);
  });

  it('writes fixed tasks for apps without a package.json', async () => {
    const { runSteps } = await import('../src/scaffold/run.js');
    const { readFile } = await import('node:fs/promises');
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-moon-py-'));
    await runSteps([{ type: 'moon-tasks', label: 'moon', dir, framework: 'fastapi', packageManager: 'npm' }]);
    expect(await readFile(path.join(dir, 'moon.yml'), 'utf8')).toContain("command: 'uv run pytest'");
  });
});

describe('postScaffoldNotes', () => {
  it('reminds moonrepo users about the first commit and moon setup', () => {
    const [note] = postScaffoldNotes({ layout: 'moonrepo' });
    expect(note).toContain('first git commit');
    expect(note).toContain('moon setup');
  });

  it('has nothing to say for other layouts', () => {
    expect(postScaffoldNotes({ layout: 'turborepo' })).toEqual([]);
    expect(postScaffoldNotes({ layout: 'single' })).toEqual([]);
  });
});

describe('scaffoldProject guards (offline, with fake tools on PATH)', () => {
  const isWindows = process.platform === 'win32';

  /** Creates a temp bin folder with tiny shell scripts standing in for real tools, and returns it. */
  async function fakeBin(tools: Record<string, number>): Promise<string> {
    const { chmod } = await import('node:fs/promises');
    const bin = await mkdtemp(path.join(tmpdir(), 'agent-initiator-bin-'));
    for (const [name, exitCode] of Object.entries(tools)) {
      const file = path.join(bin, name);
      await writeFile(file, `#!/bin/sh\nexit ${exitCode}\n`);
      await chmod(file, 0o755);
    }
    return bin;
  }

  /** Runs `fn` with PATH limited to `bin`, restoring the real PATH afterwards. */
  async function withPath<T>(bin: string, fn: () => Promise<T>): Promise<T> {
    const original = process.env.PATH;
    process.env.PATH = bin;
    try {
      return await fn();
    } finally {
      process.env.PATH = original;
    }
  }

  it.skipIf(isWindows)('refuses a folder that already has files', async () => {
    const { scaffoldProject } = await import('../src/scaffold/index.js');
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-busy-'));
    await writeFile(path.join(dir, 'README.md'), 'mine');
    await expect(scaffoldProject(spec({ root: dir }))).rejects.toThrow(/is not empty/);
  });

  it.skipIf(isWindows)('lists every missing tool with an install hint before touching the disk', async () => {
    const { missingBinaries, scaffoldProject } = await import('../src/scaffold/index.js');
    const bin = await fakeBin({});
    const root = path.join(await mkdtemp(path.join(tmpdir(), 'agent-initiator-new-')), 'app');
    const goSpec = spec({ root, apps: [{ framework: 'go-http', name: 'api' }] });
    await withPath(bin, async () => {
      expect(await missingBinaries(goSpec)).toEqual(['git', 'go']);
      await expect(scaffoldProject(goSpec)).rejects.toThrow(/Missing required tools:\n {2}- git: .*\n {2}- go: https:\/\/go.dev/);
    });
    expect(await inspectDir(root)).toBe('missing');
  });

  it.skipIf(isWindows)('asks for a completely empty folder for Nx (never deletes .git)', async () => {
    const { mkdir } = await import('node:fs/promises');
    const { scaffoldProject } = await import('../src/scaffold/index.js');
    const bin = await fakeBin({ git: 0, npx: 0, pnpm: 0 });
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-nx-'));
    await mkdir(path.join(dir, '.git'));
    await withPath(bin, async () => {
      await expect(scaffoldProject(spec({ root: dir, layout: 'nx' }))).rejects.toThrow(/Nx needs a new or completely empty folder; .* contains \.git/);
    });
  });

  it.skipIf(isWindows)('keeps partial files and says so when a step fails', async () => {
    const { scaffoldProject } = await import('../src/scaffold/index.js');
    const bin = await fakeBin({ git: 0, npx: 0, npm: 1 });
    const root = path.join(await mkdtemp(path.join(tmpdir(), 'agent-initiator-fail-')), 'api');
    const expressSpec = spec({ root, packageManager: 'npm', apps: [{ framework: 'express', name: 'api' }] });
    await withPath(bin, async () => {
      await expect(scaffoldProject(expressSpec)).rejects.toThrow(/partial files remain in .*api\. Remove that folder and retry\./);
    });
    expect(await inspectDir(root)).toBe('project');
  });

  it.skipIf(isWindows)('treats a folder as a git repo only when git says so', async () => {
    const { isInsideGitRepo } = await import('../src/scaffold/index.js');
    const dir = await tempDirFor('git');
    await withPath(await fakeBin({ git: 0 }), async () => expect(isInsideGitRepo(dir)).toBe(true));
    await withPath(await fakeBin({ git: 1 }), async () => expect(isInsideGitRepo(dir)).toBe(false));
  });

  /** A fresh temp folder; the tag makes failing test output easy to trace. */
  function tempDirFor(tag: string): Promise<string> {
    return mkdtemp(path.join(tmpdir(), `agent-initiator-${tag}-`));
  }
});
