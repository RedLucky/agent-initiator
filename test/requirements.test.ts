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
  // --- Karpathy (minus Simplicity First, replaced by ponytail)
  ['Karpathy: think before coding', '.agents/rules/llm-discipline.md', ['## 1. Think Before Coding', 'State assumptions explicitly', 'present them — do not pick silently', 'push back when warranted']],
  ['Karpathy: surgical changes', '.agents/rules/llm-discipline.md', ['## 2. Surgical Changes', 'Match existing repository conventions', 'trace back to the user']],
  ['Karpathy: goal-driven execution', '.agents/rules/llm-discipline.md', ['## 3. Goal-Driven Execution', 'write a test reproducing the invalid case', 'Verify results with commands before claiming completion']],
  ['Karpathy simplicity handled by ponytail', '.agents/rules/llm-discipline.md', ['covered by **ponytail**']],
  // --- DoD
  ['DoD skill: tests, build, wiki, log', '.agents/skills/definition-of-done/SKILL.md', ['Unit tests & coverage', '**Build**', '`docs/wiki/en/`', '`docs/wiki/id/`', '`log.md`']],
  ['DoD in AGENTS.md', 'AGENTS.md', ['## Definition of Done', 'Unit tests pass', 'Build succeeds', 'Dependencies audited', 'Docs updated in both']],
  // --- mandatory tooling
  ['tooling: ponytail, caveman, rtk, graphify', 'AGENTS.md', ['## Required tooling', 'ponytail', 'caveman', 'rtk (Rust Token Killer)', 'graphify']],
  ['rtk prefix on commands', 'AGENTS.md', ['Prefix shell commands with `rtk`', '`rtk test ']],
  // --- skills & industry additions (items 1-10, 13, 14)
  ['commit skill asks for approval', '.agents/skills/commit/SKILL.md', ['**Ask for approval**', 'stop and wait', 'Push** requires its own separate approval']],
  ['plan-task with random task number', '.agents/skills/plan-task/SKILL.md', ['random 4-digit id', 'TASK-4821']],
  ['self-review', '.agents/skills/self-review/SKILL.md', ['Scope', 'Simplicity', 'Security']],
  ['dependencies + audit', '.agents/rules/dependencies.md', ['Justify every new dependency', 'licence', 'audit']],
  ['ADR', '.agents/skills/write-adr/SKILL.md', ['docs/wiki/en/adr/', 'docs/wiki/id/adr/', '## Options considered']],
  ['CI quality gates', '.agents/rules/ci-quality-gates.md', ['lint → typecheck → test (with coverage) → build → dependency audit', 'pre-commit hooks', 'commitlint']],
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
