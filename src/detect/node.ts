import path from 'node:path';
import { exists, readJson } from '../fs-utils.js';
import type { PackageInfo, PackageManager } from '../types.js';
import { detectNodePackageManager } from './package-manager.js';

interface PackageJson {
  name?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface FrameworkMatcher {
  preset: string;
  requires: string[];
  /** Presets that make this one redundant (e.g. Nuxt already implies Vue). */
  unless?: string[];
}

// Order matters: presets listed earlier are evaluated first so `unless` can refer to them.
const FRAMEWORKS: FrameworkMatcher[] = [
  { preset: 'nextjs', requires: ['next'] },
  { preset: 'nuxt', requires: ['nuxt'] },
  { preset: 'react-vite', requires: ['react', 'vite'], unless: ['nextjs'] },
  { preset: 'vue-vite', requires: ['vue', 'vite'], unless: ['nuxt'] },
  { preset: 'nestjs', requires: ['@nestjs/core'] },
  { preset: 'express', requires: ['express'], unless: ['nestjs'] },
  { preset: 'fastify', requires: ['fastify'], unless: ['nestjs'] },
  { preset: 'hono', requires: ['hono'] },
];

export function matchFrameworks(deps: Set<string>): string[] {
  const matched: string[] = [];
  for (const fw of FRAMEWORKS) {
    const required = fw.requires.every((dep) => deps.has(dep));
    const excluded = fw.unless?.some((id) => matched.includes(id)) ?? false;
    if (required && !excluded) matched.push(fw.preset);
  }
  return matched;
}

/** Detects a Node.js package; returns null when the directory has no package.json. */
export async function detectNodePackage(root: string, relPath: string, fallbackPm?: PackageManager): Promise<PackageInfo | null> {
  const dir = path.join(root, relPath);
  const pkg = await readJson<PackageJson>(path.join(dir, 'package.json'));
  if (!pkg) return null;

  const deps = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
  const isTypeScript = deps.has('typescript') || (await exists(path.join(dir, 'tsconfig.json')));

  return {
    path: relPath,
    name: pkg.name ?? path.basename(dir),
    language: isTypeScript ? 'typescript' : 'javascript',
    packageManager: await detectNodePackageManager([dir, root], fallbackPm),
    presets: [isTypeScript ? 'typescript' : 'node', ...matchFrameworks(deps)],
    scripts: Object.keys(pkg.scripts ?? {}),
    manifests: ['package.json'],
    ...(typeof pkg.packageManager === 'string' ? { pinnedPackageManager: pkg.packageManager } : {}),
  };
}
