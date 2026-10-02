/**
 * Tests the GitHub Actions workflow renderer: language setup, install from the lockfile,
 * the check steps in order, and package folders in multi-package repos.
 */
import { describe, expect, it } from 'vitest';
import { renderGithubCi, type CiJob } from '../src/render/github-ci.js';

/** A single-package pnpm job; tests override what they need. */
const job = (overrides: Partial<CiJob>): CiJob => ({
  path: '.',
  language: 'typescript',
  packageManager: 'pnpm',
  install: 'pnpm install --frozen-lockfile',
  installAtRoot: false,
  steps: [
    { name: 'lint', run: 'pnpm run lint' },
    { name: 'test', run: 'pnpm run test' },
  ],
  ...overrides,
});

describe('renderGithubCi', () => {
  it('runs on pushes to the main branch and pull requests, with read-only permissions', () => {
    const yaml = renderGithubCi([job({})]);
    expect(yaml).toContain('on:\n  push:\n    branches: [main, master]\n  pull_request:\n');
    expect(yaml).toContain('permissions:\n  contents: read\n');
  });

  it('sets up Node.js and pnpm through corepack, then installs and runs the checks in order', () => {
    const yaml = renderGithubCi([job({})]);
    expect(yaml).toContain(
      [
        '  ci:',
        '    name: "checks"',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - uses: actions/checkout@v7',
        '      - uses: actions/setup-node@v7',
        '        with:',
        '          node-version: lts/*',
        '      - run: npm install -g corepack && corepack enable',
        '      - name: install',
        '        run: "pnpm install --frozen-lockfile"',
        '      - name: lint',
        '        run: "pnpm run lint"',
        '      - name: test',
        '        run: "pnpm run test"',
      ].join('\n'),
    );
    expect(yaml).toContain("COREPACK_ENABLE_DOWNLOAD_PROMPT: '0'");
  });

  it('needs no corepack for npm, and uses setup-bun for bun', () => {
    expect(renderGithubCi([job({ packageManager: 'npm', install: 'npm ci' })])).not.toContain('corepack enable');
    const bun = renderGithubCi([job({ packageManager: 'bun', install: 'bun install --frozen-lockfile' })]);
    expect(bun).toContain('- uses: oven-sh/setup-bun@v2');
    expect(bun).not.toContain('setup-node');
  });

  it('runs a workspace package in its folder but installs from the repo root', () => {
    const yaml = renderGithubCi([job({ path: 'apps/web', installAtRoot: true })]);
    expect(yaml).toContain('  apps-web:\n    name: "checks (apps/web)"');
    expect(yaml).toContain('    defaults:\n      run:\n        working-directory: "apps/web"');
    expect(yaml).toContain('        run: "pnpm install --frozen-lockfile"\n        working-directory: .\n');
  });

  it('sets up Python with uv, or with setup-python plus poetry', () => {
    const uv = renderGithubCi([job({ language: 'python', packageManager: 'uv', install: 'uv sync --locked' })]);
    expect(uv).toContain('- uses: astral-sh/setup-uv@v10');
    const poetry = renderGithubCi([job({ language: 'python', packageManager: 'poetry', install: 'poetry install' })]);
    expect(poetry).toContain("- uses: actions/setup-python@v7\n        with:\n          python-version: '3.x'\n      - run: pipx install poetry");
    const pip = renderGithubCi([job({ language: 'python', packageManager: 'pip', install: 'pip install -e .' })]);
    expect(pip).not.toContain('poetry');
  });

  it('reads the Go version from the package go.mod', () => {
    const yaml = renderGithubCi([job({ path: 'services/api', language: 'go', packageManager: 'go', install: 'go mod download' })]);
    expect(yaml).toContain('- uses: actions/setup-go@v7\n        with:\n          go-version-file: "services/api/go.mod"');
  });

  it('quotes commands so special characters cannot break the YAML', () => {
    const yaml = renderGithubCi([job({ steps: [{ name: 'build', run: "python -m compileall -x '\\.venv' ." }] })]);
    expect(yaml).toContain(`run: "python -m compileall -x '\\\\.venv' ."`);
  });
});
