/**
 * Tests the GitLab CI renderer: when pipelines run, the image per language, package manager setup,
 * and the install-then-check script in the right folder.
 */
import { describe, expect, it } from 'vitest';
import { renderGitlabCi } from '../src/render/gitlab-ci.js';
import type { CiJob } from '../src/types.js';

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

describe('renderGitlabCi', () => {
  it('runs for merge requests and the default branch only', () => {
    expect(renderGitlabCi([job({})])).toContain(
      'workflow:\n  rules:\n    - if: $CI_PIPELINE_SOURCE == "merge_request_event"\n    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH\n',
    );
  });

  it('installs pnpm with corepack in the Node image, then installs and runs the checks in order', () => {
    expect(renderGitlabCi([job({})])).toContain(
      [
        '"checks":',
        '  image: node:lts',
        '  before_script:',
        '    - "npm install -g corepack && corepack enable"',
        '  script:',
        '    - "pnpm install --frozen-lockfile"',
        '    - "pnpm run lint"',
        '    - "pnpm run test"',
      ].join('\n'),
    );
  });

  it('installs a workspace package from the repo root, then runs its checks in its folder', () => {
    const yaml = renderGitlabCi([job({ path: 'apps/web', installAtRoot: true })]);
    expect(yaml).toContain('"checks (apps/web)":');
    expect(yaml).toContain('  script:\n    - "pnpm install --frozen-lockfile"\n    - "cd \\"apps/web\\""\n    - "pnpm run lint"');
  });

  it('enters a standalone package folder before installing', () => {
    const yaml = renderGitlabCi([job({ path: 'api', language: 'python', packageManager: 'uv', install: 'uv sync --locked' })]);
    expect(yaml).toContain('  image: python:3\n  before_script:\n    - "pip install uv"\n  script:\n    - "cd \\"api\\""\n    - "uv sync --locked"');
  });

  it('picks the image per language and needs no setup for npm, pip, bun or go', () => {
    const npm = renderGitlabCi([job({ packageManager: 'npm', install: 'npm ci' })]);
    expect(npm).not.toContain('before_script');
    expect(renderGitlabCi([job({ packageManager: 'bun', install: 'bun install --frozen-lockfile' })])).toContain('image: oven/bun:1');
    expect(renderGitlabCi([job({ language: 'go', packageManager: 'go', install: 'go mod download' })])).toContain('image: golang:1');
    expect(renderGitlabCi([job({ language: 'python', packageManager: 'poetry', install: 'poetry install' })])).toContain('- "pip install poetry"');
    expect(renderGitlabCi([job({ language: 'python', packageManager: 'pip', install: 'pip install -e .' })])).not.toContain('before_script');
  });
});
