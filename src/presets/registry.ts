import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { exists, listSubdirs, readJson, readText, walkFiles } from '../fs-utils.js';
import type { Preset, PresetManifest, RuleFile, Skill, SkillFile, StaticFile } from '../types.js';

export type Registry = Map<string, Preset>;

// Agent Skills spec: lowercase letters, digits and single hyphens, 1–64 chars.
const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_SKILL_NAME = 64;
const MAX_SKILL_DESCRIPTION = 1024;

/**
 * Locates the bundled presets/ folder.
 * Walks up from this module so it works both from src/ (tests) and dist/ (published CLI).
 */
export async function defaultPresetsDir(): Promise<string> {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, 'presets');
    if (await exists(path.join(candidate, 'base', 'preset.json'))) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error('Could not locate the bundled presets/ directory');
}

async function readRequired(filePath: string): Promise<string> {
  const text = await readText(filePath);
  if (text === null) throw new Error(`Missing file: ${filePath}`);
  return text;
}

async function loadRules(presetDir: string, presetId: string): Promise<RuleFile[]> {
  const rulesDir = path.join(presetDir, 'rules');
  const files = (await walkFiles(rulesDir)).filter((f) => f.endsWith('.md'));
  return Promise.all(
    files.map(async (file) => {
      const content = await readRequired(path.join(rulesDir, file));
      const { data } = matter(content);
      if (typeof data.description !== 'string' || data.description.trim() === '') {
        throw new Error(`Rule ${presetId}/rules/${file} needs a "description" in its frontmatter`);
      }
      return {
        file,
        description: data.description,
        globs: Array.isArray(data.globs) ? data.globs.map(String) : [],
        alwaysApply: data.alwaysApply === true,
        content,
        presetId,
      };
    }),
  );
}

/** Validates SKILL.md frontmatter against the Agent Skills spec so we never ship a skill agents would reject. */
function validateSkill(presetId: string, dirName: string, data: Record<string, unknown>): { name: string; description: string } {
  const where = `Skill ${presetId}/skills/${dirName}`;
  const { name, description } = data;
  if (typeof name !== 'string' || !SKILL_NAME.test(name) || name.length > MAX_SKILL_NAME) {
    throw new Error(`${where}: "name" must match ${SKILL_NAME} and be at most ${MAX_SKILL_NAME} chars`);
  }
  if (name !== dirName) throw new Error(`${where}: "name" (${name}) must equal the folder name`);
  if (typeof description !== 'string' || description.length === 0 || description.length > MAX_SKILL_DESCRIPTION) {
    throw new Error(`${where}: "description" must be 1-${MAX_SKILL_DESCRIPTION} chars`);
  }
  return { name, description };
}

async function loadSkills(presetDir: string, presetId: string): Promise<Skill[]> {
  const skillsDir = path.join(presetDir, 'skills');
  const skills: Skill[] = [];
  for (const dirName of await listSubdirs(skillsDir)) {
    const skillDir = path.join(skillsDir, dirName);
    const skillMd = await readRequired(path.join(skillDir, 'SKILL.md'));
    const { name, description } = validateSkill(presetId, dirName, matter(skillMd).data);
    const files: SkillFile[] = await Promise.all(
      (await walkFiles(skillDir)).map(async (rel) => ({ path: rel, content: await readRequired(path.join(skillDir, rel)) })),
    );
    skills.push({ name, description, files, presetId });
  }
  return skills;
}

async function loadStaticFiles(presetDir: string): Promise<StaticFile[]> {
  const filesDir = path.join(presetDir, 'files');
  return Promise.all(
    (await walkFiles(filesDir)).map(async (rel) => ({ path: rel, content: await readRequired(path.join(filesDir, rel)) })),
  );
}

/** Loads every preset folder under presetsDir into a map keyed by preset id. */
export async function loadRegistry(presetsDir: string): Promise<Registry> {
  const registry: Registry = new Map();
  for (const dirName of await listSubdirs(presetsDir)) {
    const presetDir = path.join(presetsDir, dirName);
    const manifest = await readJson<PresetManifest>(path.join(presetDir, 'preset.json'));
    if (!manifest) continue;
    if (manifest.id !== dirName) throw new Error(`Preset folder ${dirName} declares id "${manifest.id}"`);
    registry.set(manifest.id, {
      ...manifest,
      rules: await loadRules(presetDir, manifest.id),
      skills: await loadSkills(presetDir, manifest.id),
      files: await loadStaticFiles(presetDir),
      agentsMd: (await readText(path.join(presetDir, 'agents-md.md')))?.trim() || undefined,
    });
  }
  return registry;
}
