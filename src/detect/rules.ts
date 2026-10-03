import path from 'node:path';
import matter from 'gray-matter';
import { exists, readText, walkFiles } from '../fs-utils.js';
import type { RuleFile } from '../types.js';

/** The frontmatter fields rule files use across agents (Cursor-style and Antigravity/Windsurf-style). */
interface RuleFrontmatter {
  description?: unknown;
  globs?: unknown;
  alwaysApply?: unknown;
  /** Antigravity/Windsurf: `always_on`, `glob`, `model_decision` or `manual`. */
  trigger?: unknown;
}

/** Globs as a list: rule files write them as a YAML list or as one comma-separated string. */
function toGlobs(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((g): g is string => typeof g === 'string' && g.trim() !== '');
  if (typeof value === 'string') return value.split(',').map((g) => g.trim()).filter(Boolean);
  return [];
}

/**
 * Reads one rule file another tool wrote and describes it the way AGENTS.md lists rules.
 * Frontmatter that is not valid YAML is treated as no frontmatter: the file is still a rule, just without metadata.
 * @returns The rule, or null when the file is empty.
 */
export function parseExistingRule(file: string, text: string): RuleFile | null {
  if (text.trim() === '') return null;
  let data: RuleFrontmatter = {};
  let body = text;
  try {
    const parsed = matter(text);
    data = parsed.data as RuleFrontmatter;
    body = parsed.content;
  } catch {
    // Invalid YAML in someone else's file: index it without metadata instead of failing init.
  }
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const description = typeof data.description === 'string' && data.description.trim() !== '' ? data.description.trim() : (heading ?? file.replace(/\.md$/, ''));
  return {
    file,
    description,
    globs: toGlobs(data.globs),
    alwaysApply: data.alwaysApply === true || data.trigger === 'always_on',
    content: text,
    presetId: 'existing',
  };
}

/**
 * Reads the rules already in <root>/.agents/rules, so AGENTS.md can link the ones other tools wrote (for example
 * graphify or ponytail installers): agents such as Codex or Claude Code only read the rules AGENTS.md points to.
 * generateFiles drops the ones with the same file name as a preset rule.
 */
export async function detectExistingRules(root: string): Promise<RuleFile[]> {
  const rulesDir = path.join(root, '.agents', 'rules');
  if (!(await exists(rulesDir))) return [];
  const rules: RuleFile[] = [];
  for (const file of (await walkFiles(rulesDir)).filter((f) => f.endsWith('.md') && !f.includes('/'))) {
    const rule = parseExistingRule(file, (await readText(path.join(rulesDir, file))) ?? '');
    if (rule) rules.push(rule);
  }
  return rules;
}
