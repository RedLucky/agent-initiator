import { contentHash } from './render/manifest.js';
import type { PlannedFile } from './types.js';

/**
 * How one generated file compares with what is on disk.
 * - `up-to-date`: the file on disk already matches what this version generates.
 * - `outdated`: nobody changed the file, but this version generates something else; safe to update.
 * - `edited`: a person changed the file and this version generates the same as before; keep it.
 * - `conflict`: a person changed the file and this version generates something new; merge by hand.
 * - `differs`: the file differs and there is no record of what init wrote (a file the user already had, or a
 *   repository initialised before the manifest existed), so nobody can tell who changed it.
 * - `missing`: this version generates the file, but it is not on disk.
 * - `obsolete`: init once wrote the file, but this version no longer generates it; review and delete it yourself.
 */
export type FileState = 'up-to-date' | 'outdated' | 'edited' | 'conflict' | 'differs' | 'missing' | 'obsolete';

/** One file in the status report; `generated` is the content this version would write, when it writes one. */
export interface FileStatus {
  path: string;
  state: FileState;
  generated?: string;
}

/** What classifyFiles compares. */
export interface StatusInput {
  /** path → hash from the manifest, i.e. what init wrote; null when the repository has no manifest. */
  recorded: Record<string, string> | null;
  /** path → hash of the file on disk now, or null when it does not exist. */
  onDisk: Record<string, string | null>;
  /** What this version of agent-initiator generates for the repository. */
  generated: PlannedFile[];
}

/**
 * Files init writes once and then hands over to the team: the wiki skeleton becomes the team's knowledge base, so
 * a newer template means nothing for it and a page the team deleted on purpose must not come back.
 * `status` and `init --upgrade` leave these paths out completely; the manifest still records what init wrote.
 */
export const SEED_ONCE_PREFIXES = ['docs/wiki/'];

/** True for files init writes once and never compares or updates afterwards. */
export function isSeedOnce(filePath: string): boolean {
  return SEED_ONCE_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

/** States that need action: `status` exits with code 1 when any file has one of them. */
export const ACTION_STATES: FileState[] = ['outdated', 'conflict', 'missing'];

/**
 * Three-way comparison per file, like `copier update`: what init wrote (manifest), what is on disk, and what this
 * version generates. Pure, so every case is unit-tested without touching a repository.
 * @returns One entry per generated file, plus `obsolete` entries for recorded files that are no longer generated;
 *   seed-once files (the wiki) are left out.
 */
export function classifyFiles({ recorded, onDisk, generated }: StatusInput): FileStatus[] {
  const result: FileStatus[] = generated.filter((file) => !isSeedOnce(file.path)).map((file) => {
    const wrote = recorded?.[file.path];
    const disk = onDisk[file.path] ?? null;
    const fresh = contentHash(file.content);
    const entry = (state: FileState): FileStatus => ({ path: file.path, state, generated: file.content });
    if (disk === null) return entry('missing');
    if (disk === fresh) return entry('up-to-date');
    // No record of what init wrote: only "same or different" can be known.
    if (wrote === undefined) return entry('differs');
    if (disk === wrote) return entry('outdated');
    return entry(fresh === wrote ? 'edited' : 'conflict');
  });

  const generatedPaths = new Set(generated.map((file) => file.path));
  for (const path of Object.keys(recorded ?? {})) {
    // A recorded file the user already deleted needs no attention.
    if (!generatedPaths.has(path) && !isSeedOnce(path) && onDisk[path]) result.push({ path, state: 'obsolete' });
  }
  return result;
}

/** States `init --upgrade` writes: files nobody edited that the template changed, and files that are gone. */
export const UPGRADE_STATES: FileState[] = ['outdated', 'missing'];

/**
 * The files `init --upgrade` writes, with their new content. Edited, conflicting and unrecorded files are never
 * part of it, so a person's changes are never overwritten.
 */
export function upgradeFiles(statuses: FileStatus[]): PlannedFile[] {
  return statuses.flatMap((s) => (UPGRADE_STATES.includes(s.state) && s.generated !== undefined ? [{ path: s.path, content: s.generated }] : []));
}
