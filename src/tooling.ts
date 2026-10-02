/**
 * Required developer tooling that generated configs point agents to.
 * These tools are installed per machine (not per repo), so we only document and check them — never auto-install.
 */

export interface Tool {
  id: string;
  name: string;
  url: string;
  purpose: string;
  install: string[];
  usage: string;
  /** How `doctor` checks presence: a binary on PATH or a folder under the home directory. */
  check: { bins?: string[]; homePaths?: string[] };
}

export const TOOLS: Tool[] = [
  {
    id: 'rtk',
    name: 'rtk (Rust Token Killer)',
    url: 'https://github.com/rtk-ai/rtk',
    purpose: 'Filters shell command output so agents spend fewer tokens.',
    install: [
      'brew install rtk   # or: cargo install --git https://github.com/rtk-ai/rtk  (NOT `cargo install rtk`, a different crate)',
      'rtk init -g   # Claude Code / Copilot; use --codex, --gemini or --agent <name> for other agents',
    ],
    usage: 'Prefix every shell command with `rtk`, including git, file and script commands: `rtk test <cmd>` for tests, `rtk err <cmd>` for builds and checks, `rtk <tool>` for tools rtk filters (git, grep, ls, pnpm, npm, go, … see `rtk --help`), and `rtk proxy <cmd>` for anything else or when you need raw output; proxy runs it unchanged and keeps its exit code. The commands in AGENTS.md and the skills are already written this way.',
    check: { bins: ['rtk'] },
  },
  {
    id: 'graphify',
    name: 'graphify',
    url: 'https://github.com/Graphify-Labs/graphify',
    purpose:
      'Builds a queryable knowledge graph of the codebase. Output goes to `graphify-out/` (git-ignored unless the team shares it); `.graphifyignore` keeps the Indonesian wiki and change logs out of the graph. The git hooks from `graphify hook install` rebuild it after each commit.',
    install: ['uv tool install graphifyy   # package name has two "y"', 'graphify install   # or: graphify <codex|cursor|gemini|copilot> install'],
    usage:
      'Ask it before broad grep/find, with symbol names and `--budget <tokens>` (see Project knowledge); broad questions return noise. Refresh with `graphify update .` (code only: no LLM, no tokens). Run the full `/graphify` extraction, which uses an LLM, only occasionally: the English wiki already explains the concepts.',
    check: { bins: ['graphify'] },
  },
  {
    id: 'caveman',
    name: 'caveman',
    url: 'https://github.com/JuliusBrussee/caveman',
    purpose: 'Terse response mode that cuts output tokens without losing technical accuracy.',
    install: ['curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash   # review the script first'],
    usage: 'Keep chat responses terse. Code, commit messages, PR descriptions and security warnings stay in normal, complete prose.',
    check: { homePaths: ['.claude/plugins/cache/caveman', '.agents/skills/caveman', '.codex/skills/caveman', '.cursor/skills/caveman'] },
  },
  {
    id: 'ponytail',
    name: 'ponytail',
    url: 'https://github.com/DietrichGebert/ponytail',
    purpose: 'Keeps generated code minimal: the least code that fully solves the task.',
    install: [
      '# Claude Code (run inside a session):',
      '/plugin marketplace add DietrichGebert/ponytail',
      '/plugin install ponytail@ponytail',
      '# Other agents: see the README (Codex plugin, Gemini extension, Cursor/Windsurf rule files)',
    ],
    usage: 'Write the smallest solution that fully meets the requirement. Never drop validation, security, error handling or accessibility to save lines.',
    check: { homePaths: ['.claude/plugins/cache/ponytail', '.agents/skills/ponytail', '.codex/skills/ponytail', '.cursor/skills/ponytail'] },
  },
  {
    id: 'ui-ux-pro-max',
    name: 'UI UX Pro Max',
    url: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
    purpose: 'Design-intelligence skill for UI styles, palettes, typography and UX rules.',
    install: ['npm i -g ui-ux-pro-max-cli', 'uipro init --ai <claude|codex|cursor|gemini|...>   # run inside this repo'],
    usage: 'Use the ui-ux-pro-max skill for any UI/UX work (layout, colour, typography, components, accessibility).',
    check: { bins: ['uipro'] },
  },
];

export function getTool(id: string): Tool {
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) throw new Error(`Unknown tool id "${id}"`);
  return tool;
}
