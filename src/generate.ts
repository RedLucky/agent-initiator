import type { Registry } from './presets/registry.js';
import { expandChain, resolvePresets } from './presets/resolve.js';
import { fillRtkCommands, fillTemplate, filterCommand, packageCommands, scriptCommands, templateVars, toCommandList, type Command } from './render/commands.js';
import { renderPackageAgentsMd, renderRootAgentsMd, type PackageSummary } from './render/agents-md.js';
import { renderToolingRule } from './render/tooling-rule.js';
import type { DetectedProject, PackageInfo, PlannedFile, ProjectKind, ResolvedConfig, RuleFile } from './types.js';

export interface GenerateOptions {
  /** ISO date (YYYY-MM-DD) stamped into the wiki log; injected so output is deterministic in tests. */
  date: string;
  /** agent-initiator version, written into the AGENTS.md marker. */
  version?: string;
  /**
   * Tool ids found on this machine. Only these tools become part of the instructions (and then they are required);
   * missing ones are left out completely. Omitted: every tool the presets list (deterministic for tests).
   */
  installedTools?: string[];
}

export interface GenerateResult {
  kind: ProjectKind;
  files: PlannedFile[];
  /** Every preset used (shared chain plus package stacks), for the manifest. */
  presets: string[];
  /** The helper tools written into AGENTS.md, for the manifest. */
  tools: string[];
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
 * @param rtk - Prefix the commands with rtk (only when rtk is installed).
 */
function rootCommands(project: DetectedProject, registry: Registry, configs: PackageConfig[], rtk: boolean): Command[] {
  const single = configs.length === 1 && configs[0]?.pkg.path === '.' ? configs[0] : undefined;
  if (single) return packageCommands(single.pkg, single.resolved.commands, undefined, rtk);
  if (!project.monorepo) return [];

  const pm = project.rootPackageManager ?? 'npm';
  const { install, ...withoutInstall } = resolvePresets(registry, [project.monorepo]).commands;
  // Without a root package.json there is nothing for a root `<pm> install` to install.
  const monorepoCommands = project.rootPackageManager && install ? { install, ...withoutInstall } : withoutInstall;
  const scripts = scriptCommands(project.rootScripts ?? [], pm);
  return toCommandList({ ...monorepoCommands, ...scripts }, templateVars({ packageManager: pm, manifests: [] }), rtk);
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
  // Tools are optional: only the ones installed here become (required) instructions; the rest are not mentioned.
  const tooling = options.installedTools ? root.tooling.filter((id) => options.installedTools?.includes(id)) : root.tooling;
  const rtk = tooling.includes('rtk');
  // Install steps for the required tools live in a rendered rule, so AGENTS.md only keeps how to use them.
  const toolingRule = renderToolingRule(tooling);
  const rootRules = toolingRule ? [...root.rules, toolingRule] : root.rules;
  // Rules other tools wrote are linked from AGENTS.md but never written: they are the user's files.
  const ruleNames = new Set(rootRules.map((r) => r.file));
  const existingRules = (project.existingRules ?? []).filter((r) => !ruleNames.has(r.file));

  files.push({
    path: 'AGENTS.md',
    content: renderRootAgentsMd({
      version: options.version,
      projectName: project.name,
      kind,
      stack: stackLabel(registry, [...new Set(project.packages.flatMap((p) => p.presets))]),
      packageManager: project.rootPackageManager ?? single?.pkg.packageManager,
      monorepoName: project.monorepo ? registry.get(project.monorepo)?.name : undefined,
      packages: summaries,
      commands: rootCommands(project, registry, configs, rtk),
      tooling,
      docs: multi ? listFrom(registry, shared, 'docs') : root.docs,
      agentsMdBlocks: multi ? [] : root.agentsMdBlocks,
      // In multi-package repos only shared items stay at the root; package items move to nested files.
      conventions: multi ? listFrom(registry, shared, 'conventions') : root.conventions,
      must: multi ? listFrom(registry, shared, 'must') : root.must,
      never: multi ? listFrom(registry, shared, 'never') : root.never,
      rules: [...scopeRules(configs, rootRules, shared, multi), ...existingRules],
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
        version: options.version,
        pkg: summary,
        language: pkg.language,
        commands: packageCommands(pkg, resolved.commands, project.monorepo, rtk),
        rtk,
        rootCommand:
          rootTest && (project.monorepo === 'moonrepo' || ['typescript', 'javascript'].includes(pkg.language))
            ? `${rtk ? 'rtk test ' : ''}${rootTest}`
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

  // Preset rules and skills mark shell commands as `{{rtk}}git status`: written with the rtk prefix when rtk is
  // installed (agents follow skill text literally), plain when it is not.
  for (const rule of rootRules) files.push({ path: `.agents/rules/${rule.file}`, content: fillRtkCommands(rule.content, rtk) });

  // Claude Code only reads .claude/skills, so every skill is mirrored there as a plain copy (symlinks break on Windows).
  for (const skill of root.skills) {
    for (const file of skill.files) {
      const content = fillRtkCommands(file.content, rtk);
      files.push({ path: `.agents/skills/${skill.name}/${file.path}`, content });
      files.push({ path: `.claude/skills/${skill.name}/${file.path}`, content });
    }
  }
  // Skills that were already in .agents/skills (e.g. official Nx skills) only need the Claude Code mirror.
  for (const skill of existingSkills) {
    for (const file of skill.files) files.push({ path: `.claude/skills/${skill.name}/${file.path}`, content: file.content });
  }

  const vars = { projectName: project.name, date: options.date };
  for (const file of root.files) {
    // .graphifyignore only matters to graphify; without graphify it would be a stray file.
    if (file.path === '.graphifyignore' && !tooling.includes('graphify')) continue;
    files.push({ path: file.path, content: fillTemplate(file.content, vars) });
  }

  return { kind, files, presets: root.presetIds, tools: tooling };
}

type ListKey = 'conventions' | 'must' | 'never' | 'docs';

/** Collects a list field from the given presets, preserving chain order and dropping duplicates. */
function listFrom(registry: Registry, presetIds: Iterable<string>, key: ListKey): string[] {
  return [...new Set([...presetIds].flatMap((id) => registry.get(id)?.[key] ?? []))];
}
