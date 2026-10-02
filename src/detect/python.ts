import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { readText } from '../fs-utils.js';
import type { PackageInfo } from '../types.js';
import { detectPythonPackageManager } from './package-manager.js';

/**
 * Lists the names of the files directly in a folder.
 * @returns File names; empty when the folder does not exist (any other read error is thrown).
 */
async function fileNames(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * Detects a Python project that has no pyproject.toml or requirements.txt, such as a folder of scripts with a
 * `tests/` folder. Only used for the repository root: a stray `scripts/*.py` folder elsewhere is not a package.
 * @returns The package, or null when the folder has no `.py` files and no `tests/test_*.py`.
 */
async function detectPlainPython(dir: string, relPath: string): Promise<PackageInfo | null> {
  const rootFiles = (await fileNames(dir)).filter((name) => name.endsWith('.py'));
  const testFiles = (await fileNames(path.join(dir, 'tests'))).filter((name) => /^test_.*\.py$/.test(name));
  if (rootFiles.length === 0 && testFiles.length === 0) return null;

  // Without a manifest nothing says pytest is installed, so pytest is used only when the tests import it.
  const testSources = await Promise.all(testFiles.map((name) => readText(path.join(dir, 'tests', name))));
  const usesPytest = testSources.some((source) => /^\s*(import pytest|from pytest\b)/m.test(source ?? ''));

  return {
    path: relPath,
    name: path.basename(dir),
    language: 'python',
    packageManager: 'pip',
    presets: ['python'],
    scripts: [],
    manifests: [],
    pythonTestRunner: usesPytest ? 'pytest' : 'unittest',
  };
}

/**
 * Detects a Python package from pyproject.toml or requirements.txt. At the repository root, a folder with `.py`
 * files or `tests/test_*.py` but no manifest is detected too.
 * @returns The package, or null when the folder is not a Python project.
 */
export async function detectPythonPackage(root: string, relPath: string): Promise<PackageInfo | null> {
  const dir = path.join(root, relPath);
  const pyproject = await readText(path.join(dir, 'pyproject.toml'));
  const requirements = await readText(path.join(dir, 'requirements.txt'));
  if (pyproject === null && requirements === null) return relPath === '.' ? detectPlainPython(dir, relPath) : null;

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
