import { createHash } from 'node:crypto';
import type { PlannedFile } from '../types.js';

/** Where init records what it generated, next to the rest of the agent configuration. */
export const MANIFEST_PATH = '.agents/agent-initiator.json';

/** The trace init leaves in a repository: which version wrote which files, from which presets and tools. */
export interface InitManifest {
  generator: 'agent-initiator';
  version: string;
  /**
   * ISO date (YYYY-MM-DD) of the init run. Kept on upgrade: generated content (the wiki log) uses this date, so
   * comparisons must keep regenerating with it.
   */
  generatedAt: string;
  /** ISO date of the last `init --upgrade`, when there was one. */
  upgradedAt?: string;
  presets: string[];
  /** Helper tools that were installed, and therefore written into AGENTS.md. */
  tools: string[];
  /**
   * Every file this run wrote, with a hash of its content. A later run can compare it with the file on disk to tell
   * files nobody changed (safe to update) from files a person edited (keep and report).
   */
  files: Record<string, string>;
}

/** What renderManifest needs to know about the init run. */
export interface ManifestInput {
  version: string;
  date: string;
  presets: string[];
  tools: string[];
  /** The files this run writes; files that already existed and were kept are not ours, so they are left out. */
  written: PlannedFile[];
}

/**
 * The sha256 of a file's content, in the `sha256:<hex>` form used in the manifest.
 * @param content - The file content as written (UTF-8).
 */
export function contentHash(content: string): string {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

/**
 * Builds the manifest file for one init run. Pure: no disk access, so it can be planned and previewed like any other
 * generated file.
 * @returns The manifest as a planned file at MANIFEST_PATH.
 */
export function renderManifest(input: ManifestInput): PlannedFile {
  const manifest: InitManifest = {
    generator: 'agent-initiator',
    version: input.version,
    generatedAt: input.date,
    presets: input.presets,
    tools: input.tools,
    files: Object.fromEntries(input.written.map((file) => [file.path, contentHash(file.content)])),
  };
  return { path: MANIFEST_PATH, content: `${JSON.stringify(manifest, null, 2)}\n` };
}

/**
 * The manifest after an upgrade: the new version and upgrade date, and new hashes for the files the upgrade wrote.
 * Every other hash stays as it was, so files people edited keep showing as edited or in conflict later.
 * @param manifest - The manifest before the upgrade.
 * @param written - The files the upgrade wrote.
 */
export function upgradeManifest(manifest: InitManifest, version: string, date: string, written: PlannedFile[]): PlannedFile {
  const files = { ...manifest.files };
  for (const file of written) files[file.path] = contentHash(file.content);
  const upgraded: InitManifest = { ...manifest, version, upgradedAt: date, files };
  return { path: MANIFEST_PATH, content: `${JSON.stringify(upgraded, null, 2)}\n` };
}
