import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSteps, scaffoldEnv } from '../src/scaffold/run.js';
import { workspaceRootFiles } from '../src/scaffold/templates.js';
import type { Step } from '../src/scaffold/types.js';

// Temp folders created by the test itself are allowed as a local fake for the file system (testing rule).
const tempDir = () => mkdtemp(path.join(tmpdir(), 'agent-initiator-run-'));

describe('runSteps', () => {
  it('creates folders, writes, appends, replaces and removes files in order', async () => {
    const dir = await tempDir();
    const file = path.join(dir, 'nested', 'settings.py');
    const steps: Step[] = [
      { type: 'mkdir', label: 'mkdir', path: path.join(dir, 'empty') },
      { type: 'write', label: 'write', path: file, content: 'ALLOWED_HOSTS = []\n' },
      { type: 'append', label: 'append', path: file, content: 'DEBUG = False\n' },
      { type: 'replace', label: 'replace', path: file, search: 'ALLOWED_HOSTS = []', replace: 'ALLOWED_HOSTS: list[str] = []' },
      { type: 'write', label: 'write tmp', path: path.join(dir, 'tmp.txt'), content: 'x' },
      { type: 'remove', label: 'remove', path: path.join(dir, 'tmp.txt') },
      { type: 'expect', label: 'expect', path: file },
    ];
    const seen: string[] = [];
    await runSteps(steps, (step) => seen.push(step.label));

    expect(await readFile(file, 'utf8')).toBe('ALLOWED_HOSTS: list[str] = []\nDEBUG = False\n');
    await expect(readFile(path.join(dir, 'tmp.txt'), 'utf8')).rejects.toThrow();
    expect(seen).toEqual(steps.map((s) => s.label));
  });

  it('fails loudly when the text to replace is missing', async () => {
    const dir = await tempDir();
    const file = path.join(dir, 'settings.py');
    await writeFile(file, 'nothing here');
    await expect(runSteps([{ type: 'replace', label: 'r', path: file, search: 'ALLOWED_HOSTS = []', replace: 'x' }])).rejects.toThrow(
      /Expected to find "ALLOWED_HOSTS = \[\]"/,
    );
  });

  it('fails when a scaffolder did not create the expected file', async () => {
    const dir = await tempDir();
    await expect(runSteps([{ type: 'expect', label: 'e', path: path.join(dir, 'package.json') }])).rejects.toThrow(/did not create/);
  });

  it('runs commands and reports a non-zero exit code', async () => {
    const dir = await tempDir();
    await runSteps([{ type: 'run', label: 'ok', cwd: dir, command: 'node', args: ['-e', ''] }]);
    await expect(runSteps([{ type: 'run', label: 'bad', cwd: dir, command: 'node', args: ['-e', 'process.exit(2)'] }])).rejects.toThrow(
      /failed with exit code 2/,
    );
  });

  it('reports a command that cannot start', async () => {
    const dir = await tempDir();
    await expect(runSteps([{ type: 'run', label: 'missing', cwd: dir, command: 'definitely-not-a-real-binary-xyz', args: [] }])).rejects.toThrow(
      /Could not start/,
    );
  });

  it('removes agent-detection variables from the scaffolder environment', () => {
    expect(scaffoldEnv({ CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'cli', OPENCODE: '1', HOME: '/h' })).toEqual({ HOME: '/h' });
  });
});

describe('workspaceRootFiles scripts', () => {
  it.each([
    ['pnpm', 'pnpm -r --if-present run test'],
    ['npm', 'npm run test --workspaces --if-present'],
    ['yarn', 'yarn workspaces run test'],
    ['bun', "bun run --filter '*' test"],
  ] as const)('uses the %s workspace runner for plain workspaces', (pm, expected) => {
    const pkg = workspaceRootFiles('acme', pm, 'workspaces').find((f) => f.path === 'package.json');
    expect(JSON.parse(pkg?.content ?? '{}').scripts.test).toBe(expected);
  });

  it('runs every root task through moon for moonrepo', () => {
    const files = workspaceRootFiles('acme', 'pnpm', 'moonrepo');
    const scripts = JSON.parse(files.find((f) => f.path === 'package.json')?.content ?? '{}').scripts;
    expect(scripts).toEqual({ build: 'moon run :build', dev: 'moon run :dev', lint: 'moon run :lint', test: 'moon run :test' });
    expect(files.map((f) => f.path)).toContain('.moon/workspace.yml');
  });
});
