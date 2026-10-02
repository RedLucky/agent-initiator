import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chooseCiProvider, ciHostFromRemote, findExistingCi, readOriginUrl } from '../src/detect/ci.js';
import { detectProject, overridePresets } from '../src/detect/index.js';
import { spawnSync } from 'node:child_process';
import { parseMoonProjectIds, parseMoonWorkspace } from '../src/detect/workspace.js';

const fixture = (name: string) => path.join(import.meta.dirname, 'fixtures', name);

describe('detectProject', () => {
  it.each([
    ['nextjs', 'shop-web', 'typescript', 'pnpm', ['typescript', 'nextjs']],
    ['react-vite', 'dashboard', 'javascript', 'npm', ['node', 'react-vite']],
    ['vue-vite', 'vue-app', 'typescript', 'npm', ['typescript', 'vue-vite']],
    ['nuxt', 'nuxt-app', 'javascript', 'bun', ['node', 'nuxt']],
    ['nestjs', 'orders-api', 'typescript', 'yarn', ['typescript', 'nestjs']],
    ['express', 'legacy-api', 'javascript', 'npm', ['node', 'express']],
    ['hono', 'edge-api', 'typescript', 'npm', ['typescript', 'hono']],
    ['fastify', 'fast-api-node', 'javascript', 'npm', ['node', 'fastify']],
    ['fastapi', 'billing-service', 'python', 'uv', ['python', 'fastapi']],
    ['django', 'django', 'python', 'pip', ['python', 'django']],
    ['go', 'inventory', 'go', 'go', ['go', 'go-http']],
  ])('detects single-package %s', async (dir, name, language, pm, presets) => {
    const project = await detectProject(fixture(dir));
    expect(project.monorepo).toBeUndefined();
    expect(project.packages).toHaveLength(1);
    const [pkg] = project.packages;
    expect(pkg).toMatchObject({ path: '.', name, language, packageManager: pm, presets });
  });

  it('reads package.json scripts', async () => {
    const project = await detectProject(fixture('nestjs'));
    expect(project.packages[0]?.scripts).toEqual(['build', 'start:dev', 'test', 'lint']);
  });

  it('detects a turborepo with pnpm workspaces', async () => {
    const project = await detectProject(fixture('turborepo'));
    expect(project.name).toBe('acme');
    expect(project.monorepo).toBe('turborepo');
    expect(project.packages.map((p) => [p.path, p.name, p.packageManager, p.presets])).toEqual([
      ['apps/api', '@acme/api', 'pnpm', ['typescript', 'nestjs']],
      ['apps/web', '@acme/web', 'pnpm', ['typescript', 'nextjs']],
      ['packages/ui', '@acme/ui', 'pnpm', ['typescript']],
    ]);
  });

  it('detects nx with package.json workspaces', async () => {
    const project = await detectProject(fixture('nx'));
    expect(project.monorepo).toBe('nx');
    expect(project.packages.map((p) => [p.path, p.presets])).toEqual([['apps/admin', ['typescript', 'vue-vite']]]);
  });

  it('detects a moonrepo with multi-language packages', async () => {
    const project = await detectProject(fixture('moonrepo'));
    expect(project.name).toBe('zoog-moon');
    expect(project.monorepo).toBe('moonrepo');
    expect(project.packages.map((p) => [p.path, p.name, p.language])).toEqual([
      ['apps/api', 'api', 'python'],
      ['apps/service', 'service', 'go'],
      ['apps/web', '@zoog/web', 'typescript'],
    ]);
  });

  it('detects a multi-folder fullstack repo without workspace tooling', async () => {
    const project = await detectProject(fixture('fullstack'));
    expect(project.monorepo).toBeUndefined();
    expect(project.packages.map((p) => [p.path, p.packageManager, p.presets])).toEqual([
      ['api', 'poetry', ['python', 'fastapi']],
      ['web', 'pnpm', ['typescript', 'react-vite']],
    ]);
  });

  it('returns no packages for an empty directory', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-'));
    const project = await detectProject(dir);
    expect(project.name).toBe(path.basename(dir));
    expect(project.packages).toEqual([]);
  });
});

describe('detectProject extras', () => {
  it('records root scripts and package manager for monorepos', async () => {
    const project = await detectProject(fixture('turborepo'));
    expect(project.rootScripts).toEqual(['build', 'test', 'dev', 'lint']);
    expect(project.rootPackageManager).toBe('pnpm');
  });

  it('records python manifests', async () => {
    const project = await detectProject(fixture('django'));
    expect(project.packages[0]?.manifests).toEqual(['requirements.txt']);
  });
});

describe('detectProject pinned package manager', () => {
  it('reads the packageManager field of a single package', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-pin-'));
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', packageManager: 'pnpm@10.19.0' }));
    expect((await detectProject(dir)).packages[0]?.pinnedPackageManager).toBe('pnpm@10.19.0');
  });

  it('reads the root packageManager field of a workspace and leaves it out when missing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-pin-'));
    await mkdir(path.join(dir, 'apps', 'web'), { recursive: true });
    await writeFile(path.join(dir, 'apps', 'web', 'package.json'), JSON.stringify({ name: 'web' }));
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'ws', workspaces: ['apps/*'], packageManager: 'yarn@4.5.0' }));
    const project = await detectProject(dir);
    expect(project.rootPinnedPackageManager).toBe('yarn@4.5.0');
    expect(project.packages[0]?.pinnedPackageManager).toBeUndefined();
  });
});

describe('CI host from the git remote', () => {
  it('picks GitLab for gitlab.com and self-hosted gitlab servers, GitHub for everything else', () => {
    expect(ciHostFromRemote('git@gitlab.com:acme/shop.git')).toBe('gitlab');
    expect(ciHostFromRemote('https://gitlab.acme.internal/team/shop.git')).toBe('gitlab');
    expect(ciHostFromRemote('git@github.com:acme/shop.git')).toBe('github');
    expect(ciHostFromRemote('https://bitbucket.org/acme/shop.git')).toBe('github');
    expect(ciHostFromRemote(null)).toBe('github');
  });

  it('reads the origin URL, and returns null without a remote or outside a repo', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-remote-'));
    expect(readOriginUrl(dir)).toBeNull();
    spawnSync('git', ['init', '-q'], { cwd: dir });
    expect(readOriginUrl(dir)).toBeNull();
    spawnSync('git', ['remote', 'add', 'origin', 'git@gitlab.com:acme/shop.git'], { cwd: dir });
    expect(readOriginUrl(dir)).toBe('git@gitlab.com:acme/shop.git');
  });
});

describe('existing CI', () => {
  it('finds GitHub workflows and other CI services, and nothing in a repo without CI', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-ci-'));
    expect(await findExistingCi(dir)).toEqual([]);
    await mkdir(path.join(dir, '.github', 'workflows'), { recursive: true });
    await writeFile(path.join(dir, '.github', 'workflows', 'test.yaml'), 'on: push\n');
    await writeFile(path.join(dir, '.github', 'workflows', 'README.md'), 'notes');
    await writeFile(path.join(dir, 'Jenkinsfile'), 'pipeline {}');
    expect(await findExistingCi(dir)).toEqual(['.github/workflows/test.yaml', 'Jenkinsfile']);
  });

  it('lets --ci win, skips CI when the repo has one, and otherwise follows the remote', () => {
    const existing = ['.github/workflows/test.yml'];
    expect(chooseCiProvider({ flag: 'gitlab', existingCi: existing, remoteUrl: null }).provider).toBe('gitlab');
    const skipped = chooseCiProvider({ existingCi: existing, remoteUrl: 'git@gitlab.com:a/b.git' });
    expect(skipped.provider).toBe('none');
    expect(skipped.reason).toContain('existing CI found (.github/workflows/test.yml)');
    expect(chooseCiProvider({ existingCi: [], remoteUrl: 'git@gitlab.com:a/b.git' })).toEqual({ provider: 'gitlab', reason: 'from the git remote origin' });
    expect(chooseCiProvider({ existingCi: [], remoteUrl: null }).provider).toBe('github');
  });
});

describe('detectProject options', () => {
  it('uses the given package manager when no lockfile exists yet', async () => {
    const project = await detectProject(fixture('express'), { nodePackageManager: 'pnpm' });
    expect(project.packages[0]?.packageManager).toBe('pnpm');
  });
});

describe('parseMoonWorkspace', () => {
  it('parses list syntax', () => {
    const yaml = `projects:
  - 'apps/*'
  - 'packages/*'
`;
    expect(parseMoonWorkspace(yaml)).toEqual(['apps/*', 'packages/*']);
  });

  it('parses map syntax', () => {
    const yaml = `projects:
  web: 'apps/web'
  api: apps/api
`;
    expect(parseMoonWorkspace(yaml)).toEqual(['apps/web', 'apps/api']);
  });

  it('reads project IDs from map syntax, including nested sources', () => {
    const yaml = `projects:
  globs:
    - 'packages/*'
  sources:
    website: 'apps/web'
`;
    expect(parseMoonWorkspace(yaml)).toEqual(['packages/*', 'apps/web']);
    expect(parseMoonProjectIds(yaml)).toEqual({ 'apps/web': 'website' });
  });

  it('detects moon v2 config in .config/moon and uses map keys as project IDs', async () => {
    const project = await detectProject(fixture('moon-config'));
    expect(project.monorepo).toBe('moonrepo');
    expect(project.packages.map((p) => [p.path, p.name, p.taskRunnerId])).toEqual([['apps/web', '@acme/site', 'site']]);
  });

  it('uses the folder name as moon project ID, not the package.json name', async () => {
    const project = await detectProject(fixture('moonrepo'));
    expect(project.packages.find((p) => p.path === 'apps/web')?.taskRunnerId).toBe('web');
  });
});

describe('overridePresets', () => {
  it('replaces detected stacks on the root package and keeps what was detected about it', async () => {
    const project = overridePresets(await detectProject(fixture('nestjs')), ['typescript', 'hono']);
    expect(project.packages).toHaveLength(1);
    expect(project.packages[0]).toMatchObject({ path: '.', presets: ['typescript', 'hono'], language: 'typescript', packageManager: 'yarn' });
    expect(project.packages[0]?.scripts).toContain('test');
  });

  it('creates a root package with a sensible language and package manager when nothing was detected', async () => {
    const empty = await detectProject(await mkdtemp(path.join(tmpdir(), 'agent-initiator-empty-')));
    expect(overridePresets(empty, ['python', 'fastapi']).packages[0]).toMatchObject({ language: 'python', packageManager: 'pip' });
    expect(overridePresets(empty, ['go-http']).packages[0]).toMatchObject({ language: 'go', packageManager: 'go' });
    expect(overridePresets(empty, ['express']).packages[0]).toMatchObject({ language: 'javascript', packageManager: 'npm' });
  });

  it('drops monorepo information because the override describes a single package', async () => {
    expect(overridePresets(await detectProject(fixture('turborepo')), ['typescript']).monorepo).toBeUndefined();
  });
});
