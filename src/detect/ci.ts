import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { exists, walkFiles } from '../fs-utils.js';
import type { CiProvider } from '../types.js';

/** Git hosts with a CI pipeline agent-initiator can generate. */
export type CiHost = 'github' | 'gitlab';

/**
 * Picks the CI pipeline for a repository from its git remote URL.
 * A URL that mentions GitLab (gitlab.com or a self-hosted gitlab.* server) gets GitLab CI; everything else,
 * including a repo without a remote yet, gets GitHub Actions. `--ci` overrides this choice.
 * @param remoteUrl - The URL of the `origin` remote, or null when there is none.
 * @returns The CI host to generate for.
 */
export function ciHostFromRemote(remoteUrl: string | null): CiHost {
  return remoteUrl !== null && /gitlab/i.test(remoteUrl) ? 'gitlab' : 'github';
}

/**
 * Reads the URL of the `origin` remote. Read-only: it never changes the repository.
 * @param dir - A folder inside the repository.
 * @returns The URL, or null when the folder is not a git repo or has no `origin` remote.
 */
export function readOriginUrl(dir: string): string | null {
  const result = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: dir, encoding: 'utf8' });
  if (result.status !== 0) return null;
  const url = result.stdout.trim();
  return url === '' ? null : url;
}

// CI config files of common services, besides the GitHub Actions workflows folder.
const CI_FILES = ['.gitlab-ci.yml', '.circleci/config.yml', 'Jenkinsfile', 'azure-pipelines.yml', 'bitbucket-pipelines.yml', '.travis.yml'];

/**
 * Lists the CI configuration a repository already has (GitHub Actions workflows and other common services).
 * @param root - Repository root.
 * @returns Paths relative to the root; empty when the repo has no CI yet.
 */
export async function findExistingCi(root: string): Promise<string[]> {
  const workflows = (await walkFiles(path.join(root, '.github', 'workflows')))
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .map((file) => `.github/workflows/${file}`);
  const others: string[] = [];
  for (const file of CI_FILES) if (await exists(path.join(root, file))) others.push(file);
  return [...workflows, ...others];
}

/** What decides the CI pipeline: the --ci flag, CI the repo already has, and the git remote. */
export interface CiChoiceInput {
  flag?: CiProvider;
  existingCi: string[];
  remoteUrl: string | null;
}

/**
 * Chooses which CI pipeline init writes.
 * - `--ci` always wins (an existing file with the same name is still never overwritten).
 * - A repo that already has CI gets none, so its checks do not run twice; the user compares it with AGENTS.md.
 * - Otherwise the git remote decides: GitLab or GitHub.
 * @returns The provider and a short reason to show the user.
 */
export function chooseCiProvider({ flag, existingCi, remoteUrl }: CiChoiceInput): { provider: CiProvider; reason: string } {
  if (flag) return { provider: flag, reason: 'chosen with --ci' };
  if (existingCi.length > 0) {
    return {
      provider: 'none',
      reason: `existing CI found (${existingCi.join(', ')}), kept; make sure it runs lint → typecheck → test → build → audit with the AGENTS.md commands, or add ours with --ci github|gitlab`,
    };
  }
  return { provider: ciHostFromRemote(remoteUrl), reason: remoteUrl ? 'from the git remote origin' : 'default, no git remote yet' };
}
