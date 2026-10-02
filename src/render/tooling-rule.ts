import { getTool } from '../tooling.js';
import type { RuleFile } from '../types.js';

/**
 * Renders `.agents/rules/required-tooling.md`: what each required tool is for and how to install it.
 * AGENTS.md keeps only the one-line usage per tool, because agents read it every session; install steps are
 * needed only once per machine, so they live in this on-demand rule.
 * @param toolIds - Required tool ids, in display order.
 * @returns The rule, or null when no tool is required.
 */
export function renderToolingRule(toolIds: string[]): RuleFile | null {
  if (toolIds.length === 0) return null;
  const description = 'Required tooling — what each tool is for, how to install it once per machine and set it up per repository';
  const lines = [
    '---',
    `description: ${description}`,
    'globs: []',
    'alwaysApply: false',
    '---',
    '',
    '# Required tooling',
    '',
    'Mandatory for every contributor and agent. Read this when a tool is missing (`npx agent-initiator doctor` checks them) or when you set up a new machine or clone.',
    '',
  ];
  for (const tool of toolIds.map(getTool)) {
    lines.push(`## [${tool.name}](${tool.url})`, tool.purpose, '', `**Use:** ${tool.usage}`, '', '```bash', ...tool.install, '```', '');
  }
  return { file: 'required-tooling.md', description, globs: [], alwaysApply: false, content: lines.join('\n'), presetId: 'base' };
}
