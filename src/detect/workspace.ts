import path from 'node:path';
import { exists, listSubdirs, readJson, readText } from '../fs-utils.js';

export interface WorkspaceInfo {
  /** Monorepo preset id. */
  tool: 'turborepo' | 'nx' | 'moonrepo' | 'workspaces';
  /** Package directories relative to the root, sorted. */
  packageDirs: string[];
}

// Used when a turbo/nx/moon repo declares no explicit workspace globs.
const DEFAULT_PATTERNS = ['apps/*', 'packages/*', 'libs/*'];

/** Extracts project directories or globs from .moon/workspace.yml without pulling in a YAML parser. */
export function parseMoonWorkspace(yaml: string): string[] {
  const patterns: string[] = [];
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
      patterns.push(listItem[1]);
      continue;
    }

    // Map/record syntax: web: "apps/web" or web: apps/web
    const mapItem = line.match(/^\s*[\w.-]+:\s*["']?([^"'#\s]+)["']?/);
    if (mapItem?.[1]) {
      patterns.push(mapItem[1]);
    }
  }
  return patterns;
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

async function readPatterns(root: string): Promise<string[]> {
  const moonYaml =
    (await readText(path.join(root, '.moon', 'workspace.yml'))) ??
    (await readText(path.join(root, '.moon', 'workspace.yaml')));
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
  else if (
    (await exists(path.join(root, '.moon', 'workspace.yml'))) ||
    (await exists(path.join(root, '.moon', 'workspace.yaml'))) ||
    (await exists(path.join(root, '.moon')))
  ) {
    tool = 'moonrepo';
  } else if (patterns.length > 0) {
    tool = 'workspaces';
  }
  if (!tool) return null;

  const packageDirs = await expandPatterns(root, patterns.length > 0 ? patterns : DEFAULT_PATTERNS);
  return { tool, packageDirs };
}
