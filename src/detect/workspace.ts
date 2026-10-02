import path from 'node:path';
import { exists, listSubdirs, readJson, readText } from '../fs-utils.js';

export interface WorkspaceInfo {
  /** Monorepo preset id. */
  tool: 'turborepo' | 'nx' | 'moonrepo' | 'workspaces';
  /** Package directories relative to the root, sorted. */
  packageDirs: string[];
  /** moon project IDs declared with map syntax (`web: apps/web`), keyed by folder. Other projects use their folder name. */
  moonProjectIds?: Record<string, string>;
}

// Used when a turbo/nx/moon repo declares no explicit workspace globs.
const DEFAULT_PATTERNS = ['apps/*', 'packages/*', 'libs/*'];

/** One entry of the `projects:` section in .moon/workspace.yml: a folder or glob, plus its ID when map syntax names it. */
interface MoonProjectEntry {
  source: string;
  id?: string;
}

/**
 * Reads the `projects:` section of .moon/workspace.yml without a YAML parser.
 * Supports list syntax (`- 'apps/*'`) and map syntax (`web: 'apps/web'`), also nested under `globs:`/`sources:`.
 */
function moonProjectEntries(yaml: string): MoonProjectEntry[] {
  const entries: MoonProjectEntry[] = [];
  let inProjects = false;
  for (const line of yaml.split('\n')) {
    if (/^projects:\s*$/.test(line)) {
      inProjects = true;
      continue;
    }
    if (inProjects && /^\S/.test(line)) break; // next top-level key ends the projects section
    if (!inProjects) continue;

    // List syntax: - "apps/*" or - apps/*
    const listItem = line.match(/^\s*-\s*["']?([^"'#\s]+)["']?/);
    if (listItem?.[1]) {
      entries.push({ source: listItem[1] });
      continue;
    }

    // Map syntax: web: "apps/web" — the key is the project ID moon uses in targets like `web:test`.
    const mapItem = line.match(/^\s*([\w.-]+):\s*["']?([^"'#\s]+)["']?/);
    if (mapItem?.[1] && mapItem[2]) entries.push({ source: mapItem[2], id: mapItem[1] });
  }
  return entries;
}

/** Extracts project directories or globs from .moon/workspace.yml. */
export function parseMoonWorkspace(yaml: string): string[] {
  return moonProjectEntries(yaml).map((entry) => entry.source);
}

/** Maps folder → project ID for projects declared with map syntax in .moon/workspace.yml. */
export function parseMoonProjectIds(yaml: string): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const entry of moonProjectEntries(yaml)) if (entry.id) ids[entry.source] = entry.id;
  return ids;
}

/** Extracts the `packages:` list from pnpm-workspace.yaml without pulling in a YAML parser. */
export function parsePnpmWorkspace(yaml: string): string[] {
  const patterns: string[] = [];
  let inPackages = false;
  for (const line of yaml.split('\n')) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/.test(line)) break; // next top-level key ends the list
    const item = inPackages ? line.match(/^\s*-\s*["']?([^"'#\s]+)["']?/) : null;
    if (item?.[1]) patterns.push(item[1]);
  }
  return patterns;
}

// moon v2 also accepts `.config/moon` instead of `.moon`.
const MOON_DIRS = ['.moon', path.join('.config', 'moon')];

/** Reads the moon workspace config (YAML only); null when the repo has none. */
async function readMoonWorkspace(root: string): Promise<string | null> {
  for (const dir of MOON_DIRS) {
    for (const file of ['workspace.yml', 'workspace.yaml']) {
      const text = await readText(path.join(root, dir, file));
      if (text !== null) return text;
    }
  }
  return null;
}

/** True when the repo has a moon config folder (`.moon` or `.config/moon`). */
async function isMoonWorkspace(root: string): Promise<boolean> {
  for (const dir of MOON_DIRS) if (await exists(path.join(root, dir))) return true;
  return false;
}

async function readPatterns(root: string): Promise<string[]> {
  const moonYaml = await readMoonWorkspace(root);
  if (moonYaml !== null) {
    const moonPatterns = parseMoonWorkspace(moonYaml);
    if (moonPatterns.length > 0) return moonPatterns;
  }

  const pnpmYaml = await readText(path.join(root, 'pnpm-workspace.yaml'));
  if (pnpmYaml !== null) return parsePnpmWorkspace(pnpmYaml);

  const pkg = await readJson<{ workspaces?: string[] | { packages?: string[] } }>(path.join(root, 'package.json'));
  const ws = pkg?.workspaces;
  if (Array.isArray(ws)) return ws;
  return ws?.packages ?? [];
}

/** Expands simple workspace globs ("apps/*", "apps/**", "tools/cli"); negated globs are ignored. */
async function expandPatterns(root: string, patterns: string[]): Promise<string[]> {
  const dirs = new Set<string>();
  for (const pattern of patterns) {
    if (pattern.startsWith('!')) continue;
    const base = pattern.replace(/\/\*\*?$/, '');
    if (base !== pattern) {
      for (const sub of await listSubdirs(path.join(root, base))) dirs.add(`${base}/${sub}`);
    } else if (await exists(path.join(root, pattern))) {
      dirs.add(pattern);
    }
  }
  return [...dirs].sort();
}

/** Returns workspace info when the root is a monorepo, otherwise null. */
export async function detectWorkspace(root: string): Promise<WorkspaceInfo | null> {
  const patterns = await readPatterns(root);
  let tool: WorkspaceInfo['tool'] | null = null;
  if (await exists(path.join(root, 'turbo.json'))) tool = 'turborepo';
  else if (await exists(path.join(root, 'nx.json'))) tool = 'nx';
  else if (await isMoonWorkspace(root)) tool = 'moonrepo';
  else if (patterns.length > 0) tool = 'workspaces';
  if (!tool) return null;

  const packageDirs = await expandPatterns(root, patterns.length > 0 ? patterns : DEFAULT_PATTERNS);
  if (tool !== 'moonrepo') return { tool, packageDirs };
  const moonYaml = await readMoonWorkspace(root);
  return { tool, packageDirs, moonProjectIds: moonYaml === null ? {} : parseMoonProjectIds(moonYaml) };
}
