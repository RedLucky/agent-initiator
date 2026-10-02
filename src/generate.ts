import type { Registry } from './presets/registry.js';
import { expandChain, resolvePresets } from './presets/resolve.js';
import { fillTemplate, filterCommand, packageCommands, packageTaskCommands, scriptCommands, templateVars, toCommandList, type Command } from './render/commands.js';
import { renderPackageAgentsMd, renderRootAgentsMd, type PackageSummary } from './render/agents-md.js';
import { renderGithubCi } from './render/github-ci.js';
import { renderGitlabCi } from './render/gitlab-ci.js';
import { renderLefthookConfig, type HookCheck } from './render/lefthook.js';
import type { CiJob, CiProvider, DetectedProject, PackageInfo, PackageManager, PlannedFile, ProjectKind, ResolvedConfig, RuleFile } from './types.js';

export interface GenerateOptions {
  /** ISO date (YYYY-MM-DD) stamped into the wiki log; injected so output is deterministic in tests. */
  date: string;
  /** Which CI pipeline to write (default: GitHub Actions). */
  ci?: CiProvider;
}

export interface GenerateResult {
  kind: ProjectKind;
  files: PlannedFile[];
  /** Things the user should do by hand for the generated files to work (shown after init writes them). */
  notes: string[];
}

interface PackageConfig {
  pkg: PackageInfo;
  resolved: ResolvedConfig;
}

/** Codex truncates project docs above 32 KiB, so the root AGENTS.md must stay below it. */
export const AGENTS_MD_MAX_BYTES = 32 * 1024;

/** Human-readable stack label, e.g. "TypeScript, Next.js". Language layers and shared presets are folded in. */
function stackLabel(registry: Registry, presetIds: string[]): string {
  return presetIds.map((id) => registry.get(id)?.name ?? id).join(', ');
}

/** Classifies the project from the categories of all presets used by its packages. */
export function classify(registry: Registry, project: DetectedProject): ProjectKind {
  if (project.monorepo) return 'monorepo';
  if (project.packages.length === 0) return 'unknown';
  const categories = new Set(
    project.packages.flatMap((p) => expandChain(registry, p.presets)).map((id) => registry.get(id)?.category),
  );
  if (categories.has('frontend') && categories.has('backend')) return 'fullstack';
  if (categories.has('frontend')) return 'frontend';
  if (categories.has('backend')) return 'backend';
  return 'library';
}

/** Items that come from presets outside the shared root chain, i.e. what is specific to one package. */
function packageSpecific<T extends { presetId: string }>(items: T[], shared: Set<string>): T[] {
  return items.filter((item) => !shared.has(item.presetId));
}

/**
 * Commands for the root AGENTS.md.
 * Single-package repos use that package's commands; monorepos use the workspace tool's commands,
 * overridden by real root package.json scripts. Other multi-folder repos have no root commands.
 */
function rootCommands(project: DetectedProject, registry: Registry, configs: PackageConfig[]): Command[] {
  const single = configs.length === 1 && configs[0]?.pkg.path === '.' ? configs[0] : undefined;
  if (single) return packageCommands(single.pkg, single.resolved.commands);
  if (!project.monorepo) return [];

  const pm = project.rootPackageManager ?? 'npm';
  const { install, ...withoutInstall } = resolvePresets(registry, [project.monorepo]).commands;
  // Without a root package.json there is nothing for a root `<pm> install` to install.
  const monorepoCommands = project.rootPackageManager && install ? { install, ...withoutInstall } : withoutInstall;
  const scripts = scriptCommands(project.rootScripts ?? [], pm);
  return toCommandList({ ...monorepoCommands, ...scripts }, templateVars({ packageManager: pm, manifests: [] }));
}

// Which git hook runs which task: quick, read-only checks before each commit; slower ones before each push.
// `format` is left out on purpose: many format scripts rewrite files, which a hook must not do behind your back.
const HOOK_TASKS: Array<{ task: string; hook: HookCheck['hook'] }> = [
  { task: 'lint', hook: 'pre-commit' },
  { task: 'typecheck', hook: 'pre-push' },
  { task: 'test', hook: 'pre-push' },
];

/**
 * Git hook checks for every package, from the same commands AGENTS.md lists (without rtk).
 * A package without a command for a task simply gets no check for it.
 * @param configs - Every detected package with its resolved presets.
 * @param monorepo - The monorepo tool id, which changes some commands (e.g. Nx targets).
 * @returns The checks, grouped by task: all lint checks first, then typecheck, then test.
 */
function hookChecks(configs: PackageConfig[], monorepo?: string): HookCheck[] {
  const checks: HookCheck[] = [];
  for (const { task, hook } of HOOK_TASKS) {
    for (const { pkg, resolved } of configs) {
      const run = packageTaskCommands(pkg, resolved.commands, monorepo)[task];
      if (!run) continue;
      const inPackage = pkg.path !== '.';
      checks.push({ hook, name: inPackage ? `${task} (${pkg.path})` : task, run, ...(inPackage ? { packagePath: pkg.path } : {}) });
    }
  }
  return checks;
}

// Install commands that fail instead of changing the lockfile, so CI tests exactly what was committed.
// pip and go have no lockfile mode; their normal install command (from the presets) is used.
const CI_INSTALL: Partial<Record<PackageManager, string>> = {
  npm: 'npm ci',
  pnpm: 'pnpm install --frozen-lockfile',
  yarn: 'yarn install --frozen-lockfile',
  bun: 'bun install --frozen-lockfile',
  uv: 'uv sync --locked',
  poetry: 'poetry install',
};

/**
 * Adjusts one command for the CI runner.
 * actions/setup-go sets GOTOOLCHAIN=local, which stops `go run …govulncheck@latest` when the latest govulncheck needs
 * a newer Go than the module's; `auto` lets Go fetch that newer toolchain just for the audit.
 * @returns The command to put in the workflow.
 */
function ciCommand(pkg: PackageInfo, task: string, command: string): string {
  // Harmless on GitLab, whose golang image already allows toolchain downloads.
  return pkg.language === 'go' && task === 'audit' ? `GOTOOLCHAIN=auto ${command}` : command;
}

// The CI pipeline order from the ci-quality-gates rule (install runs first, separately).
const CI_TASKS = ['lint', 'typecheck', 'test', 'build', 'audit'];

/**
 * CI jobs, one per package, from the same commands AGENTS.md lists (without rtk).
 * Node packages in a JavaScript workspace install from the repo root, where the shared lockfile lives.
 * @param configs - Every detected package with its resolved presets.
 * @param project - The detected project (monorepo tool and root package manager).
 * @returns Jobs for packages that have at least one check (a package with nothing to check gets no job), and notes
 *   for pnpm/yarn folders whose package.json does not pin a version: CI would then install the newest one.
 */
function ciJobs(configs: PackageConfig[], project: DetectedProject): { jobs: CiJob[]; notes: string[] } {
  const jobs: CiJob[] = [];
  const notes = new Set<string>();
  for (const { pkg, resolved } of configs) {
    const commands = packageTaskCommands(pkg, resolved.commands, project.monorepo);
    const steps = CI_TASKS.flatMap((task) => (commands[task] ? [{ name: task, run: ciCommand(pkg, task, commands[task]) }] : []));
    if (steps.length === 0) continue;
    const isNode = pkg.language === 'typescript' || pkg.language === 'javascript';
    const installAtRoot = isNode && project.rootPackageManager !== undefined;
    const pm = installAtRoot ? (project.rootPackageManager ?? pkg.packageManager) : pkg.packageManager;
    const install = CI_INSTALL[pm] ?? commands.install;
    if (!install) continue;
    jobs.push({ path: pkg.path, language: pkg.language, packageManager: pm, install, installAtRoot, steps });

    // corepack installs the version named in package.json → packageManager; without it CI gets the newest
    // release, which may reject a lockfile written by an older version.
    const pinned = installAtRoot ? project.rootPinnedPackageManager : pkg.pinnedPackageManager;
    if ((pm === 'pnpm' || pm === 'yarn') && !pinned) {
      const folder = installAtRoot || pkg.path === '.' ? 'the repo root' : pkg.path;
      notes.add(`CI installs ${pm} with corepack, which reads "packageManager" from package.json. Pin the version you use, in ${folder}: npm pkg set packageManager=${pm}@$(${pm} -v)`);
    }
  }
  return { jobs, notes: [...notes] };
}

/** Marks scoped rules with the packages that use them so the root table shows where they apply. */
function scopeRules(configs: PackageConfig[], rules: RuleFile[], shared: Set<string>, multi: boolean): Array<RuleFile & { scope?: string }> {
  if (!multi) return rules;
  return rules.map((rule) => {
    if (shared.has(rule.presetId)) return rule;
    const paths = configs.filter((c) => c.resolved.rules.some((r) => r.file === rule.file)).map((c) => `\`${c.pkg.path}\``);
    return { ...rule, scope: paths.join(', ') };
  });
}

/**
 * Builds every file agent-initiator would write for a detected project.
 * Pure function: no disk access, so it is easy to test and to preview with --dry-run.
 */
export function generateFiles(project: DetectedProject, registry: Registry, options: GenerateOptions): GenerateResult {
  const configs: PackageConfig[] = project.packages.map((pkg) => ({ pkg, resolved: resolvePresets(registry, pkg.presets) }));
  const sharedIds = ['base', ...(project.monorepo ? [project.monorepo] : [])];
  const shared = new Set(expandChain(registry, sharedIds));
  const root = resolvePresets(registry, [...sharedIds, ...project.packages.flatMap((p) => p.presets)]);
  const multi = configs.some((c) => c.pkg.path !== '.');
  const kind = classify(registry, project);

  const summaries: PackageSummary[] = configs
    .filter((c) => c.pkg.path !== '.')
    .map((c) => ({ path: c.pkg.path, name: c.pkg.name, stack: stackLabel(registry, c.pkg.presets) }));

  const single = configs.length === 1 && !multi ? configs[0] : undefined;
  const files: PlannedFile[] = [];
  const presetSkillNames = new Set(root.skills.map((s) => s.name));
  const existingSkills = (project.existingSkills ?? []).filter((s) => !presetSkillNames.has(s.name));
  const allSkills = [...root.skills, ...existingSkills];

  files.push({
    path: 'AGENTS.md',
    content: renderRootAgentsMd({
      projectName: project.name,
      kind,
      stack: stackLabel(registry, [...new Set(project.packages.flatMap((p) => p.presets))]),
      packageManager: project.rootPackageManager ?? single?.pkg.packageManager,
      monorepoName: project.monorepo ? registry.get(project.monorepo)?.name : undefined,
      packages: summaries,
      commands: rootCommands(project, registry, configs),
      tooling: root.tooling,
      docs: multi ? listFrom(registry, shared, 'docs') : root.docs,
      agentsMdBlocks: multi ? [] : root.agentsMdBlocks,
      // In multi-package repos only shared items stay at the root; package items move to nested files.
      conventions: multi ? listFrom(registry, shared, 'conventions') : root.conventions,
      must: multi ? listFrom(registry, shared, 'must') : root.must,
      never: multi ? listFrom(registry, shared, 'never') : root.never,
      rules: scopeRules(configs, root.rules, shared, multi),
      skills: allSkills,
    }),
  });

  for (const { pkg, resolved } of configs.filter((c) => c.pkg.path !== '.')) {
    const summary = summaries.find((s) => s.path === pkg.path);
    if (!summary) continue;
    const specificIds = resolved.presetIds.filter((id) => !shared.has(id));
    const rootTest = project.monorepo ? filterCommand(project.monorepo, pkg.packageManager, pkg.taskRunnerId ?? pkg.name, 'test') : null;
    files.push({
      path: `${pkg.path}/AGENTS.md`,
      content: renderPackageAgentsMd({
        pkg: summary,
        language: pkg.language,
        commands: packageCommands(pkg, resolved.commands, project.monorepo),
        rootCommand:
          rootTest && (project.monorepo === 'moonrepo' || ['typescript', 'javascript'].includes(pkg.language))
            ? `rtk test ${rootTest}`
            : undefined,
        docs: listFrom(registry, specificIds, 'docs'),
        agentsMdBlocks: specificIds.flatMap((id) => (registry.get(id)?.agentsMd ? [registry.get(id)?.agentsMd ?? ''] : [])),
        conventions: listFrom(registry, specificIds, 'conventions'),
        must: listFrom(registry, specificIds, 'must'),
        never: listFrom(registry, specificIds, 'never'),
        rules: packageSpecific(resolved.rules, shared),
        skills: packageSpecific(resolved.skills, shared),
      }),
    });
  }

  for (const rule of root.rules) files.push({ path: `.agents/rules/${rule.file}`, content: rule.content });

  // Claude Code only reads .claude/skills, so every skill is mirrored there as a plain copy (symlinks break on Windows).
  for (const skill of root.skills) {
    for (const file of skill.files) {
      files.push({ path: `.agents/skills/${skill.name}/${file.path}`, content: file.content });
      files.push({ path: `.claude/skills/${skill.name}/${file.path}`, content: file.content });
    }
  }
  // Skills that were already in .agents/skills (e.g. official Nx skills) only need the Claude Code mirror.
  for (const skill of existingSkills) {
    for (const file of skill.files) files.push({ path: `.claude/skills/${skill.name}/${file.path}`, content: file.content });
  }

  const vars = { projectName: project.name, date: options.date };
  for (const file of root.files) files.push({ path: file.path, content: fillTemplate(file.content, vars) });

  // lefthook.yml depends on the required tools (graphify adds a post-commit refresh), so it is rendered, not copied.
  if (root.tooling.includes('lefthook')) {
    files.push({ path: 'lefthook.yml', content: renderLefthookConfig({ graphify: root.tooling.includes('graphify'), checks: hookChecks(configs, project.monorepo) }) });
  }

  const provider = options.ci ?? 'github';
  const ci = provider === 'none' ? { jobs: [], notes: [] } : ciJobs(configs, project);
  if (ci.jobs.length > 0) {
    files.push(provider === 'gitlab' ? { path: '.gitlab-ci.yml', content: renderGitlabCi(ci.jobs) } : { path: '.github/workflows/ci.yml', content: renderGithubCi(ci.jobs) });
  }

  return { kind, files, notes: ci.notes };
}

type ListKey = 'conventions' | 'must' | 'never' | 'docs';

/** Collects a list field from the given presets, preserving chain order and dropping duplicates. */
function listFrom(registry: Registry, presetIds: Iterable<string>, key: ListKey): string[] {
  return [...new Set([...presetIds].flatMap((id) => registry.get(id)?.[key] ?? []))];
}
