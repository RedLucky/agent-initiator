import { describe, expect, it } from 'vitest';
import { fillTemplate, filterCommand, packageCommands, packageTaskCommands, scriptCommands, templateVars } from '../src/render/commands.js';
import type { PackageInfo } from '../src/types.js';

const pkg = (overrides: Partial<PackageInfo>): PackageInfo => ({
  path: '.',
  name: 'app',
  language: 'typescript',
  packageManager: 'pnpm',
  presets: [],
  scripts: [],
  manifests: [],
  ...overrides,
});

describe('commands', () => {
  it('maps script aliases to canonical tasks', () => {
    expect(scriptCommands(['start:dev', 'build', 'check-types'], 'yarn')).toEqual({
      dev: 'yarn run start:dev',
      build: 'yarn run build',
      typecheck: 'yarn run check-types',
    });
  });

  it('builds python template vars per package manager', () => {
    expect(templateVars({ packageManager: 'uv', manifests: [] })).toMatchObject({ pyRun: 'uv run ', pyInstall: 'uv sync' });
    expect(templateVars({ packageManager: 'pip', manifests: ['requirements.txt'] })).toMatchObject({
      pyRun: '',
      pyInstall: 'pip install -r requirements.txt',
    });
    expect(templateVars({ packageManager: 'pip', manifests: ['pyproject.toml'] }).pyInstall).toBe('pip install -e .');
  });

  it('leaves unknown placeholders visible', () => {
    expect(fillTemplate('{{pm}} {{nope}}', { pm: 'npm' })).toBe('npm {{nope}}');
  });

  it('prefixes rtk by task type and orders tasks', () => {
    const commands = packageCommands(pkg({ scripts: ['test', 'build', 'dev'] }), {
      install: '{{pm}} install',
      typecheck: '{{pmx}} tsc --noEmit',
    });
    expect(commands).toEqual([
      { task: 'install', command: 'rtk proxy pnpm install' },
      { task: 'dev', command: 'rtk proxy pnpm run dev' },
      { task: 'build', command: 'rtk err pnpm run build' },
      { task: 'test', command: 'rtk test pnpm run test' },
      { task: 'typecheck', command: 'rtk err pnpm exec tsc --noEmit' },
    ]);
  });

  it('uses preset commands for non-node packages', () => {
    const commands = packageCommands(pkg({ language: 'python', packageManager: 'uv', scripts: ['ignored'] }), {
      test: '{{pyRun}}pytest',
    });
    expect(commands).toEqual([{ task: 'test', command: 'rtk test uv run pytest' }]);
  });

  it('gives plain commands by task, without rtk, for git hooks', () => {
    const commands = packageTaskCommands(pkg({ scripts: ['lint'] }), { typecheck: '{{pmx}} tsc --noEmit' });
    expect(commands).toEqual({ typecheck: 'pnpm exec tsc --noEmit', lint: 'pnpm run lint' });
  });

  it('builds workspace filter commands', () => {
    expect(filterCommand('turborepo', 'pnpm', '@acme/web', 'test')).toBe('pnpm exec turbo run test --filter=@acme/web');
    expect(filterCommand('nx', 'npm', 'admin', 'build')).toBe('npx nx run admin:build');
    expect(filterCommand('workspaces', 'npm', 'api', 'test')).toBe('npm run test -w api');
  });
});

describe('commands (nx + aliases)', () => {
  it('falls back to Nx targets for workspace projects without scripts', () => {
    const commands = packageCommands(pkg({ name: '@org/web', scripts: ['dev'] }), {}, 'nx');
    expect(commands.map((c) => c.command)).toEqual([
      'rtk proxy pnpm run dev',
      'rtk err pnpm exec nx run @org/web:build',
      'rtk test pnpm exec nx run @org/web:test',
      'rtk err pnpm exec nx run @org/web:lint',
      'rtk err pnpm exec nx run @org/web:typecheck',
    ]);
  });

  it('maps fastify-cli build:ts to build', () => {
    expect(scriptCommands(['build:ts'], 'npm')).toEqual({ build: 'npm run build:ts' });
  });
});
