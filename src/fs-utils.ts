import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

/** Returns true when the path exists (file or directory). */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Reads a UTF-8 file, returning null when it does not exist so callers can treat "missing" as a normal case. */
export async function readText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Reads and parses a JSON file; a malformed file throws with the path in the message to ease debugging. */
export async function readJson<T>(filePath: string): Promise<T | null> {
  const text = await readText(filePath);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${(error as Error).message}`);
  }
}

/** Lists sub-directory names (sorted), skipping hidden folders and node_modules. */
export async function listSubdirs(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/** Recursively lists files under dir as POSIX paths relative to dir. */
export async function walkFiles(dir: string, prefix = ''): Promise<string[]> {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walkFiles(path.join(dir, entry.name), rel)));
    else files.push(rel);
  }
  return files;
}

