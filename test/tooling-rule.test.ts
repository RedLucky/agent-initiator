/** Tests the rendered required-tooling rule, which holds the install steps AGENTS.md no longer repeats. */
import { describe, expect, it } from 'vitest';
import { renderToolingRule } from '../src/render/tooling-rule.js';

describe('renderToolingRule', () => {
  it('lists purpose, usage and install steps for each required tool, as an on-demand rule', () => {
    const rule = renderToolingRule(['rtk', 'graphify']);
    expect(rule?.file).toBe('required-tooling.md');
    expect(rule?.alwaysApply).toBe(false);
    expect(rule?.globs).toEqual([]);
    expect(rule?.content).toMatch(/^---\ndescription: Required tooling — [^\n]+\nglobs: \[\]\nalwaysApply: false\n---\n/);
    expect(rule?.content).toContain('## [rtk (Rust Token Killer)](https://github.com/rtk-ai/rtk)\nFilters shell command output');
    expect(rule?.content).toContain('```bash\nuv tool install graphifyy');
    expect(rule?.content).not.toContain('ponytail');
  });

  it('is left out when no tool is required', () => {
    expect(renderToolingRule([])).toBeNull();
  });
});
