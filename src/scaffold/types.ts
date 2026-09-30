import type { PackageManager } from '../types.js';

/** How apps are arranged in a new repo. */
export type Layout = 'single' | 'folders' | 'turborepo' | 'nx' | 'workspaces';

export type NodePackageManager = Extract<PackageManager, 'npm' | 'pnpm' | 'yarn' | 'bun'>;

export type ScaffoldLanguage = 'typescript' | 'javascript';

export interface AppSpec {
  /** Framework preset id, e.g. "nextjs". */
  framework: string;
  /** Folder/package name (kebab-case). Ignored for the single layout, which scaffolds into the root. */
  name: string;
}

export interface ScaffoldSpec {
  /** Absolute path of the repo to create. */
  root: string;
  layout: Layout;
  apps: AppSpec[];
  language: ScaffoldLanguage;
  packageManager: NodePackageManager;
  /** Installed version of the package manager, written to the root "packageManager" field (required by Turborepo). */
  packageManagerVersion?: string;
  install: boolean;
}

/** One unit of scaffolding work; recipes return plain data so they can be unit-tested without running anything. */
export type Step =
  | { type: 'run'; label: string; cwd: string; command: string; args: string[] }
  | { type: 'mkdir'; label: string; path: string }
  | { type: 'write'; label: string; path: string; content: string }
  /** Replaces text in a file a scaffolder just created; fails loudly if the text is not found. */
  | { type: 'replace'; label: string; path: string; search: string; replace: string }
  /** Appends to a file a scaffolder just created (e.g. a [tool.fastapi] section in pyproject.toml). */
  | { type: 'append'; label: string; path: string; content: string }
  /** Deletes a file or folder that a scaffolder just generated (never pre-existing user files). */
  | { type: 'remove'; label: string; path: string }
  // Some scaffolders exit 0 even when they fail (create-hono), so we verify their output exists.
  | { type: 'expect'; label: string; path: string };
