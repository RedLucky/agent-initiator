/**
 * Shared domain types for agent-initiator.
 * Kept in one file so detect → resolve → render → write share a single vocabulary.
 */

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'uv' | 'poetry' | 'pip' | 'go';

export type Language = 'typescript' | 'javascript' | 'python' | 'go';

/** Preset category decides which layer a preset belongs to and how the project kind is classified. */
export type PresetCategory = 'base' | 'language' | 'frontend' | 'backend' | 'monorepo';

/** `library` = packages without an app framework; `unknown` = no package detected at all. */
export type ProjectKind = 'frontend' | 'backend' | 'fullstack' | 'monorepo' | 'library' | 'unknown';

/** One detected app/package. The root of a single-package repo uses path ".". */
export interface PackageInfo {
  /** Path relative to the repo root, POSIX separators ("." for root). */
  path: string;
  name: string;
  language: Language;
  packageManager: PackageManager;
  /** Preset ids detected for this package, language layer first (e.g. ["typescript", "nextjs"]). */
  presets: string[];
  /** Script/task names available in the package manifest (node only). */
  scripts: string[];
  /** Manifest files found in the package dir (e.g. "pyproject.toml", "requirements.txt"). */
  manifests: string[];
  /** ID the monorepo task runner uses for this package when it differs from `name` (moon: folder name or map key). */
  taskRunnerId?: string;
  /** The `packageManager` field of package.json (e.g. "pnpm@10.19.0"); CI installs exactly this version. */
  pinnedPackageManager?: string;
}

export interface DetectedProject {
  root: string;
  name: string;
  /** Monorepo preset id (turborepo | nx | moonrepo | workspaces) when a workspace tool is found. */
  monorepo?: string;
  /** Root package.json scripts and package manager (monorepos only), used for workspace-wide commands. */
  rootScripts?: string[];
  rootPackageManager?: PackageManager;
  /** The `packageManager` field of the root package.json (monorepos only). */
  rootPinnedPackageManager?: string;
  packages: PackageInfo[];
  /** Skills already present in .agents/skills (e.g. shipped by Nx) that are not from our presets. */
  existingSkills?: Skill[];
}

/** Task name → shell command template. Templates may use {{pm}} and {{pyRun}}. */
export type CommandMap = Record<string, string>;

/** Shape of presets/<id>/preset.json. */
export interface PresetManifest {
  id: string;
  name: string;
  category: PresetCategory;
  description: string;
  extends?: string[];
  commands?: CommandMap;
  /** Short one-line conventions rendered directly in AGENTS.md. */
  conventions?: string[];
  must?: string[];
  never?: string[];
  /** Tool ids from src/tooling.ts that this preset requires. */
  tooling?: string[];
  /** Version-matched documentation sources agents should read before using the framework (markdown, one line each). */
  docs?: string[];
}

export interface RuleFile {
  /** File name, e.g. "code-quality.md". */
  file: string;
  description: string;
  globs: string[];
  alwaysApply: boolean;
  content: string;
  presetId: string;
}

export interface SkillFile {
  /** Path relative to the skill directory, e.g. "SKILL.md". */
  path: string;
  content: string;
}

export interface Skill {
  name: string;
  description: string;
  files: SkillFile[];
  presetId: string;
}

/** Verbatim file shipped by a preset under presets/<id>/files/. */
export interface StaticFile {
  path: string;
  content: string;
}

export interface Preset extends PresetManifest {
  rules: RuleFile[];
  skills: Skill[];
  files: StaticFile[];
  /** Verbatim markdown from presets/<id>/agents-md.md, placed near the top of the AGENTS.md that uses this preset. */
  agentsMd?: string;
}

/** Result of merging an ordered preset chain. */
export interface ResolvedConfig {
  presetIds: string[];
  commands: CommandMap;
  conventions: string[];
  must: string[];
  never: string[];
  tooling: string[];
  docs: string[];
  agentsMdBlocks: string[];
  rules: RuleFile[];
  skills: Skill[];
  files: StaticFile[];
}

export interface PlannedFile {
  /** Path relative to the repo root. */
  path: string;
  content: string;
}

export type FileStatus = 'create' | 'skip';

export interface FilePlanEntry extends PlannedFile {
  status: FileStatus;
}

/** Where the generated CI pipeline runs; `none` writes no CI file. */
export type CiProvider = 'github' | 'gitlab' | 'none';

/** One CI job: the checks of one package, run in that package's folder. */
export interface CiJob {
  /** Package folder relative to the repo root ("." for a single-package repo). */
  path: string;
  language: Language;
  packageManager: PackageManager;
  /** Install command that refuses to change the lockfile, e.g. `pnpm install --frozen-lockfile`. */
  install: string;
  /** Run the install from the repo root: packages of a JavaScript workspace share one lockfile there. */
  installAtRoot: boolean;
  /** The checks in the order they run (lint, typecheck, test, build, audit); missing ones are left out. */
  steps: Array<{ name: string; run: string }>;
}
