import path from 'node:path';
import { readText } from '../fs-utils.js';
import type { PackageInfo } from '../types.js';
import { detectPythonPackageManager } from './package-manager.js';

/** Detects a Python package from pyproject.toml or requirements.txt; returns null when neither exists. */
export async function detectPythonPackage(root: string, relPath: string): Promise<PackageInfo | null> {
  const dir = path.join(root, relPath);
  const pyproject = await readText(path.join(dir, 'pyproject.toml'));
  const requirements = await readText(path.join(dir, 'requirements.txt'));
  if (pyproject === null && requirements === null) return null;

  // Plain text search is enough here: we only need to know whether a framework is declared.
  const manifest = `${pyproject ?? ''}\n${requirements ?? ''}`.toLowerCase();
  const presets = ['python'];
  if (/\bfastapi\b/.test(manifest)) presets.push('fastapi');
  if (/\bdjango\b/.test(manifest)) presets.push('django');

  const declaredName = pyproject?.match(/^name\s*=\s*["']([^"']+)["']/m)?.[1];

  return {
    path: relPath,
    name: declaredName ?? path.basename(dir),
    language: 'python',
    packageManager: await detectPythonPackageManager([dir, root]),
    presets,
    scripts: [],
    manifests: [pyproject !== null ? 'pyproject.toml' : null, requirements !== null ? 'requirements.txt' : null].filter(
      (m): m is string => m !== null,
    ),
  };
}
