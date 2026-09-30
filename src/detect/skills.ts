import path from 'node:path';
import matter from 'gray-matter';
import { exists, listSubdirs, readText, walkFiles } from '../fs-utils.js';
import type { Skill } from '../types.js';

/**
 * Reads skills already present in <root>/.agents/skills (for example the official Nx skills),
 * so AGENTS.md can index them and they can be mirrored for Claude Code. Invalid skills are ignored.
 */
export async function detectExistingSkills(root: string): Promise<Skill[]> {
  const skillsDir = path.join(root, '.agents', 'skills');
  if (!(await exists(skillsDir))) return [];
  const skills: Skill[] = [];
  for (const dirName of await listSubdirs(skillsDir)) {
    const skillDir = path.join(skillsDir, dirName);
    const skillMd = await readText(path.join(skillDir, 'SKILL.md'));
    if (skillMd === null) continue;
    const { name, description } = matter(skillMd).data as { name?: unknown; description?: unknown };
    if (typeof name !== 'string' || typeof description !== 'string') continue;
    const files = await Promise.all(
      (await walkFiles(skillDir)).map(async (rel) => ({ path: rel, content: (await readText(path.join(skillDir, rel))) ?? '' })),
    );
    skills.push({ name, description, files, presetId: 'existing' });
  }
  return skills;
}
