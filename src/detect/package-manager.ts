import path from 'node:path';
import { exists } from '../fs-utils.js';
import type { PackageManager } from '../types.js';

// Lockfile → package manager, checked in order; the first match wins.
const NODE_LOCKFILES: Array<[string, PackageManager]> = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm'],
];

const PYTHON_LOCKFILES: Array<[string, PackageManager]> = [
  ['uv.lock', 'uv'],
  ['poetry.lock', 'poetry'],
];

async function firstMatch(dirs: string[], table: Array<[string, PackageManager]>): Promise<PackageManager | null> {
  for (const dir of dirs) {
    for (const [file, pm] of table) {
      if (await exists(path.join(dir, file))) return pm;
    }
  }
  return null;
}

/**
 * Detects the node package manager for a package.
 * Looks in the package dir first, then the repo root (monorepos keep one lockfile at the root).
 * `fallback` is used when no lockfile exists yet (e.g. a project scaffolded with --skip-install).
 */
export async function detectNodePackageManager(dirs: string[], fallback: PackageManager = 'npm'): Promise<PackageManager> {
  return (await firstMatch(dirs, NODE_LOCKFILES)) ?? fallback;
}

export async function detectPythonPackageManager(dirs: string[]): Promise<PackageManager> {
  return (await firstMatch(dirs, PYTHON_LOCKFILES)) ?? 'pip';
}
