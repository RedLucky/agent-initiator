/**
 * Requirements guard: every rule, skill and constraint agreed with the user must stay in the generated output.
 * If a future edit drops one of these, this test fails and names the missing requirement.
 */
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { detectProject } from '../src/detect/index.js';
import { generateFiles } from '../src/generate.js';
import { defaultPresetsDir, loadRegistry, type Registry } from '../src/presets/registry.js';

let registry: Registry;
const fixture = (name: string) => path.join(import.meta.dirname, 'fixtures', name);

beforeAll(async () => {
  registry = await loadRegistry(await defaultPresetsDir());
});

/** All generated files of a fixture joined into one searchable string, plus a per-path lookup. */
async function output(name: string) {
  const { files } = generateFiles(await detectProject(fixture(name)), registry, { date: '2026-09-30' });
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  return { all: files.map((f) => `### ${f.path}\n${f.content}`).join('\n'), get: (p: string) => byPath.get(p) ?? '', paths: [...byPath.keys()] };
}

// [requirement, file that must contain it, phrases (all required)]
const BASE_REQUIREMENTS: Array<[string, string, string[]]> = [
  // --- user's original rules
  ['anti AI slop / ngambang', '.agents/rules/code-quality.md', ['No AI slop', 'No vague or filler code', 'No hedging comments']],
  ['no over-engineering', '.agents/rules/code-quality.md', ['YAGNI', 'If 200 lines could be 50', 'No abstractions for single-use code']],
  ['clean, robust, SOLID, DRY, KISS', '.agents/rules/code-quality.md', ['**KISS**', '**DRY**', '**SOLID**']],
  ['readable for beginners', '.agents/rules/code-quality.md', ['Readability (beginner-friendly)', 'Early returns']],
  ['informative comments (new code only, explain why)', '.agents/rules/code-quality.md', ['explain **why**', 'Only comment new or changed code']],
  ['naming: variable, function, file, folder', '.agents/rules/naming-conventions.md', ['Functions start with a verb', 'Booleans read as questions', '## Files and folders']],
  ['error handling', '.agents/rules/error-handling-logging.md', ['Never swallow errors', 'Preserve the original cause', 'impossible scenarios']],
  ['logging', '.agents/rules/error-handling-logging.md', ['structured logger', 'Never log secrets']],
  ['security awareness & guardrails', '.agents/rules/security.md', ['parameterised queries', '## Secrets', '## Agent guardrails']],
  ['reusability, testability, maintainability', '.agents/rules/architecture.md', ['Reusability, Testability, Maintainability', 'Testability check', 'Reuse deliberately']],
  ['scalability', '.agents/rules/architecture.md', ['## Scalability', 'Stateless processes', 'Idempotency', 'measure before optimising']],
  ['always unit test', '.agents/rules/testing.md', ['Every function, class and behaviour change MUST have unit tests', 'including small private helpers', 'failing test that reproduces the bug']],
  ['mock external boundaries in unit tests', '.agents/rules/testing.md', ['Mandatory mocking for external boundaries', 'NEVER connect to a real database']],
  ['temp folders and fixtures may stand in for the file system', '.agents/rules/testing.md', ['Exception for the file system', 'mkdtemp', 'Never read or write real user folders']],
  ['repo rules win over plugin defaults (tests)', '.agents/rules/testing.md', ['This rule wins over plugin defaults']],
  ['mandatory doc comments in plain language', '.agents/rules/code-quality.md', ['This rule wins over plugin defaults', 'JSDoc', 'GoDoc', 'docstrings', '**Plain language**', 'junior']],
  ['constraints: tests, mocking, doc comments', 'AGENTS.md', ['including small private helpers', 'Always mock external boundaries', 'doc comment in the standard format']],
  ['no auto commit/push, always confirm', '.agents/rules/git-workflow.md', ['Never commit or push automatically', 'wait for explicit approval', 'Approval covers only that one commit/push']],
  ['no attribution trailers, exact approved message', '.agents/rules/git-workflow.md', ['**No attribution trailers**', 'exactly the message the user approved']],
  ['commit skill commits the exact approved message', '.agents/skills/commit/SKILL.md', ['with **exactly** the approved message', 'Co-Authored-By:']],
  ['one task = one commit', '.agents/rules/git-workflow.md', ['**One task = one commit.**', 'never batch several tasks into one commit']],
  ['commit skill checks a single task', '.agents/skills/commit/SKILL.md', ['exactly one task']],
  ['plan-task commits each task before the next', '.agents/skills/plan-task/SKILL.md', ['each task = exactly one commit', 'before starting the next task']],
  ['commit format with issue or plan task number', '.agents/rules/git-workflow.md', ['<type>(#<issue>): <subject>', '<type>(TASK-<n>): <subject>']],
  ['docs: bilingual wiki + log', '.agents/rules/documentation.md', ['docs/wiki/en/', 'docs/wiki/id/', '`log.md` gets a new entry']],
  ['wiki is a knowledge base for every reader', '.agents/rules/documentation.md', ['knowledge base', 'non-developer', '**In short**', 'glossary.md', 'faq.md', 'features/<topic>.md']],
  ['every change updates its topic page, created if missing', '.agents/rules/documentation.md', ['updates the wiki page of the topic you worked on. A log entry alone is never enough.', 'If no page covers the topic yet, create one']],
  ['update-wiki skill finds or creates the topic page', '.agents/skills/update-wiki/SKILL.md', ['**Find the topic**', 'create `features/<topic>.md`', 'A log entry alone is never enough']],
  ['wiki pages use diagrams (Mermaid or ASCII) for flows', '.agents/rules/documentation.md', ['## Diagrams', 'add a diagram', '**Mermaid**', '**ASCII**', 'update the diagram in the same change']],
  ['update-wiki skill adds or updates diagrams', '.agents/skills/update-wiki/SKILL.md', ['**Add or update a diagram**', 'Mermaid', 'ASCII']],
  ['AGENTS.md routes agents: English wiki first, then graphify, then grep', 'AGENTS.md', ['## Project knowledge', '`docs/wiki/en/index.md`', 'AI agents read the English pages only', 'Skip `docs/wiki/*/log.md`', 'graphify affected', 'Use grep only for what the wiki and graphify do not answer']],
  ['.graphifyignore keeps the Indonesian wiki and logs out of the graph', '.graphifyignore', ['docs/wiki/id/', 'docs/wiki/*/log.md']],
  ['graphify usage: code graph by default, symbol queries with a budget', 'AGENTS.md', ['`graphify update .`', 'only occasionally', '--budget <tokens>']],
  ['documentation rule: written for AI agents too', '.agents/rules/documentation.md', ['## Written for AI agents too', 'AI agents read the English pages only', 'For AI agents: task → page', 'Where it lives in the code', 'Link instead of repeating']],
  ['agents install missing graphify hooks', 'AGENTS.md', ['graphify hook status', 'run `graphify hook install` once']],
  ['wiki skeleton: getting started explains git hooks', 'docs/wiki/en/getting-started.md', ['## Git hooks', 'graphify hook install', 'lefthook install', '--no-verify']],
  ['git hooks for every language: lefthook commit-msg check', 'lefthook.yml', ['commit-msg:', '"check-message.sh":', 'lefthook install']],
  ['commit-msg script enforces the format and rejects attribution trailers', '.lefthook/commit-msg/check-message.sh', ['TASK-[0-9]+', 'co-authored-by']],
  ['never bypass git hooks', 'AGENTS.md', ['Bypass git hooks with `--no-verify`']],
  ['CI pipeline: least privilege, locked install, gates in order', '.github/workflows/ci.yml', ['permissions:\n  contents: read', '--frozen-lockfile', 'name: install']],
  ['wiki skeleton: task table for AI agents', 'docs/wiki/en/index.md', ['## For AI agents: task → page', 'AI agents read the English pages only']],
  ['DoD rejects log-only wiki updates', '.agents/skills/definition-of-done/SKILL.md', ['A log entry alone does not pass']],
  // --- Karpathy (minus Simplicity First, replaced by ponytail)
  ['Karpathy: think before coding', '.agents/rules/llm-discipline.md', ['## 1. Think Before Coding', 'State assumptions explicitly', 'present them — do not pick silently', 'push back when warranted']],
  ['Karpathy: surgical changes', '.agents/rules/llm-discipline.md', ['## 2. Surgical Changes', 'Match existing repository conventions', 'trace back to the user']],
  ['Karpathy: goal-driven execution', '.agents/rules/llm-discipline.md', ['## 3. Goal-Driven Execution', 'write a test reproducing the invalid case', 'Verify results with commands before claiming completion']],
  ['Karpathy simplicity handled by ponytail', '.agents/rules/llm-discipline.md', ['covered by **ponytail**']],
  // --- DoD
  ['DoD skill: tests, build, wiki, log', '.agents/skills/definition-of-done/SKILL.md', ['Unit tests & coverage', '**Build**', '`docs/wiki/en/`', '`docs/wiki/id/`', '`log.md`']],
  ['DoD in AGENTS.md', 'AGENTS.md', ['## Definition of Done', 'Unit tests pass', 'Build succeeds', 'Dependencies audited', 'Wiki updated in both', 'a log entry alone is not enough']],
  // --- mandatory tooling
  ['tooling: ponytail, caveman, rtk, graphify, lefthook', 'AGENTS.md', ['## Required tooling', 'ponytail', 'caveman', 'rtk (Rust Token Killer)', 'graphify', '[lefthook]']],
  ['rtk prefix on every command', 'AGENTS.md', ['Prefix every shell command with `rtk`, including git, file and script commands', 'runs any other command unchanged, keeping its exit code', '`rtk test ']],
  // --- skills & industry additions (items 1-10, 13, 14)
  ['commit skill asks for approval', '.agents/skills/commit/SKILL.md', ['**Ask for approval**', 'stop and wait', 'Push** requires its own separate approval']],
  ['plan-task with random task number', '.agents/skills/plan-task/SKILL.md', ['random 4-digit id', 'TASK-4821']],
  ['self-review', '.agents/skills/self-review/SKILL.md', ['Scope', 'Simplicity', 'Security']],
  ['dependencies + audit', '.agents/rules/dependencies.md', ['Justify every new dependency', 'licence', 'audit']],
  ['ADR', '.agents/skills/write-adr/SKILL.md', ['docs/wiki/en/adr/', 'docs/wiki/id/adr/', '## Options considered']],
  ['CI quality gates', '.agents/rules/ci-quality-gates.md', ['lint → typecheck → test (with coverage) → build → dependency audit', 'pre-commit hooks', 'lefthook', 'check-message.sh', '--no-verify']],
  ['coverage threshold', '.agents/rules/testing.md', ['≥ 80% line and branch coverage', '**Integration tests**']],
  ['observability', '.agents/rules/observability.md', ['Correlation', 'OpenTelemetry', 'golden signals']],
  ['data privacy (UU PDP / GDPR)', '.agents/rules/data-privacy.md', ['UU PDP', 'GDPR', '**Mask**']],
  ['release & versioning', '.agents/rules/release-versioning.md', ['**SemVer**', '**Changelog**', '**Feature flags**']],
  ['debugging workflow', '.agents/skills/debugging/SKILL.md', ['**Reproduce**', '**Hypothesise**', 'failing test']],
  ['write-unit-test + update-wiki skills', '.agents/skills/write-unit-test/SKILL.md', ['Arrange → Act → Assert']],
  ['update-wiki skill', '.agents/skills/update-wiki/SKILL.md', ['both languages', '`log.md`']],
  // --- framework-docs-first (latest round)
  ['version-matched docs first', '.agents/rules/llm-discipline.md', ['Framework docs', 'Never guess CLI flags']],
  // --- layout decisions
  ['Claude Code adapter', 'CLAUDE.md', ['@AGENTS.md']],
  ['wiki skeleton (en)', 'docs/wiki/en/log.md', ['## 2026-09-30']],
  ['wiki skeleton (id)', 'docs/wiki/id/index.md', ['Wiki']],
  ['wiki skeleton: reading paths per reader (en)', 'docs/wiki/en/index.md', ['## Where to start', 'Not a developer', 'A new developer', 'An experienced developer']],
  ['wiki skeleton: reading paths per reader (id)', 'docs/wiki/id/index.md', ['## Mulai dari mana', 'Bukan developer', 'Developer baru', 'Developer berpengalaman']],
  ['wiki skeleton: overview (en/id)', 'docs/wiki/en/overview.md', ['## In short', 'Written for non-developers first']],
  ['wiki skeleton: overview (id)', 'docs/wiki/id/overview.md', ['## Singkatnya']],
  ['wiki skeleton: getting started (en)', 'docs/wiki/en/getting-started.md', ['## In short', '## Install and run', '## Your first change']],
  ['wiki skeleton: getting started (id)', 'docs/wiki/id/getting-started.md', ['## Singkatnya', '## Instal dan jalankan']],
  ['wiki skeleton: architecture with a diagram (en)', 'docs/wiki/en/architecture.md', ['## In short', '```mermaid', 'In words:']],
  ['wiki skeleton: architecture with a diagram (id)', 'docs/wiki/id/architecture.md', ['## Singkatnya', '```mermaid', 'Dengan kata-kata:']],
  ['wiki skeleton: glossary (en/id)', 'docs/wiki/en/glossary.md', ['## In short', 'Definition of Done']],
  ['wiki skeleton: glossary (id)', 'docs/wiki/id/glossary.md', ['## Singkatnya', 'Definition of Done']],
  ['wiki skeleton: faq (en)', 'docs/wiki/en/faq.md', ['## In short', 'Where do I start reading?']],
  ['wiki skeleton: faq (id)', 'docs/wiki/id/faq.md', ['## Singkatnya', 'mulai membaca dari mana']],
];

describe('agreed requirements stay in the generated output', () => {
  it.each(BASE_REQUIREMENTS)('%s', async (_requirement, file, phrases) => {
    const content = (await output('nextjs')).get(file);
    expect(content, `${file} is missing`).not.toBe('');
    for (const phrase of phrases) expect(content, `"${phrase}" missing in ${file}`).toContain(phrase);
  });

  it('mirrors every skill to .claude/skills for Claude Code', async () => {
    const { paths } = await output('nextjs');
    const agentSkills = paths.filter((p) => p.startsWith('.agents/skills/')).map((p) => p.replace('.agents/', ''));
    for (const skill of agentSkills) expect(paths).toContain(`.claude/${skill}`);
  });

  it('adds UI UX Pro Max only for frontend stacks', async () => {
    expect((await output('nextjs')).get('AGENTS.md')).toContain('UI UX Pro Max');
    expect((await output('nestjs')).get('AGENTS.md')).not.toContain('UI UX Pro Max');
  });

  it('adapts rtk commands per stack', async () => {
    expect((await output('fastapi')).get('AGENTS.md')).toContain('`rtk test uv run pytest`');
    expect((await output('go')).get('AGENTS.md')).toContain('`rtk test go test ./...`');
    expect((await output('nestjs')).get('AGENTS.md')).toContain('`rtk test yarn run test`');
  });

  it('keeps backend-only rules for backend stacks', async () => {
    const backend = await output('nestjs');
    for (const rule of ['api-design.md', 'api-contract.md', 'database-migrations.md']) expect(backend.paths).toContain(`.agents/rules/${rule}`);
    expect(backend.get('.agents/rules/database-migrations.md')).toContain('expand → migrate → contract');
    expect(backend.get('.agents/rules/api-contract.md')).toContain('OpenAPI 3 spec');
  });

  it('keeps earlier framework rules while adding official guidance', async () => {
    const fastapi = (await output('fastapi')).get('.agents/rules/fastapi.md');
    for (const phrase of ['APIRouter', 'Depends', 'HTTPException', 'pydantic-settings', 'TestClient', 'Annotated', 'return type annotation']) {
      expect(fastapi).toContain(phrase);
    }
    const next = (await output('nextjs')).get('.agents/rules/nextjs.md');
    for (const phrase of ['Server Components by default', 'NEXT_PUBLIC_', 'loading.tsx', 'node_modules/next/dist/docs/', 'Promise.all']) expect(next).toContain(phrase);
    const nx = registry.get('nx')?.rules.find((r) => r.file === 'nx.md')?.content ?? '';
    for (const phrase of ['nx affected', 'enforce-module-boundaries', 'targetDefaults', 'nx graph', '--no-interactive']) expect(nx).toContain(phrase);
  });
});
