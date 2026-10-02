import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { detectProject } from '../src/detect/index.js';
import { parseMoonWorkspace } from '../src/detect/workspace.js';

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
      ['apps/web', 'web', 'typescript'],
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
});
