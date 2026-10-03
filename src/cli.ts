import path from 'node:path';
import * as p from '@clack/prompts';
import { Command } from 'commander';
import pc from 'picocolors';
import { detectProject, overridePresets } from './detect/index.js';
import { detectInitState, readManifest } from './detect/initialised.js';
import { detectExistingSkills } from './detect/skills.js';
import { checkTools, graphifyHookState, type ToolStatus } from './doctor.js';
import { generateFiles } from './generate.js';
import { defaultPresetsDir, loadRegistry, type Registry } from './presets/registry.js';
import { contentHash, MANIFEST_PATH, renderManifest } from './render/manifest.js';
import { ACTION_STATES, classifyFiles, type FileState } from './status.js';
import { readJson, readText } from './fs-utils.js';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolvePresets } from './presets/resolve.js';
import { choosePresets, defaultPackageManager, promptNewProject } from './prompts.js';
import { specFromFlags, type ScaffoldFlags } from './scaffold/flags.js';
import { inspectDir, isInsideGitRepo, LAYOUTS, postScaffoldNotes, scaffoldProject, type NodePackageManager, type ScaffoldSpec } from './scaffold/index.js';
import { planToolSetup, runToolSetup, selectDefaultActions, type SetupAction, type SetupResult } from './setup.js';
import type { DetectedProject } from './types.js';
import { applyPlan, manualSteps, planFiles } from './write/index.js';

interface InitOptions extends ScaffoldFlags {
  preset?: string;
  yes?: boolean;
  dryRun?: boolean;
  setupTools?: boolean;
}

function describeProject(registry: Registry, project: DetectedProject): string {
  const label = (ids: string[]) => ids.map((id) => registry.get(id)?.name ?? id).join(', ');
  const lines = project.packages.map((pkg) => `${pc.cyan(pkg.path.padEnd(16))} ${pkg.name} — ${label(pkg.presets)} (${pkg.packageManager})`);
  if (project.monorepo) lines.unshift(`${pc.bold('Monorepo:')} ${registry.get(project.monorepo)?.name}`);
  return lines.length > 0 ? lines.join('\n') : 'No stack detected — base rules only.';
}

/**
 * Prints which tools are installed. All tools are optional: missing ones are only listed with their install steps.
 * @param statuses - The result of `checkTools`.
 */
function printToolStatus(statuses: ToolStatus[]): void {
  for (const { tool, installed } of statuses) {
    console.log(`${installed ? pc.green('✓') : pc.dim('○')} ${tool.name}${installed ? '' : pc.dim(`  (optional, not installed) → ${tool.url}`)}`);
    if (!installed) for (const line of tool.install) console.log(pc.dim(`    ${line}`));
  }
}

async function scaffold(spec: ScaffoldSpec): Promise<void> {
  await scaffoldProject(spec, (step, index, total) => {
    if (step.type === 'run' || step.type === 'mkdir') p.log.step(`${pc.dim(`[${index + 1}/${total}]`)} ${step.label}`);
  });
  p.log.success('Project scaffolded.');
  for (const note of postScaffoldNotes(spec)) p.log.info(note);
}

/**
 * Handles a missing/empty directory before detection: scaffolds a project, or returns presets chosen by the user.
 * An empty result means "continue with normal detection" (after scaffolding, for base-only, or for existing projects).
 */
async function prepareNewProject(
  root: string,
  registry: Registry,
  options: InitOptions,
): Promise<{ presetIds?: string[]; cancelled?: boolean; packageManager?: NodePackageManager }> {
  const state = await inspectDir(root);
  const wantsScaffold = Boolean(options.framework || options.apps || options.layout);

  if (wantsScaffold) {
    if (state === 'project') throw new Error(`${root} is not empty. Scaffolding flags (--framework/--apps/--layout) only work in a new or empty directory.`);
    const spec = specFromFlags(root, options, await defaultPackageManager());
    await scaffold(spec);
    return { packageManager: spec.packageManager };
  }
  if (state === 'project' || options.preset) return {};

  if (options.yes || !process.stdin.isTTY) {
    throw new Error(
      `${root} is ${state === 'missing' ? 'missing' : 'empty'} and no stack can be detected.\n` +
        'Scaffold a project:  agent-initiator init <dir> --framework nextjs   (or --apps web:nextjs,api:nestjs --layout turborepo)\n' +
        'Or pick presets:     agent-initiator init <dir> --preset typescript,nextjs',
    );
  }

  const choice = await promptNewProject(root, registry, state);
  if (!choice) return { cancelled: true };
  if (choice.action === 'scaffold') {
    await scaffold(choice.spec);
    return { packageManager: choice.spec.packageManager };
  }
  if (choice.action === 'presets') return { presetIds: choice.presetIds };
  return {};
}

function logSetupResult({ action, outcome, reason }: SetupResult): void {
  if (outcome === 'done') p.log.success(action.label);
  else p.log.warn(`${action.label}: ${outcome}${reason ? ` — ${reason}` : ''}`);
}

/**
 * Chooses which per-repo setup actions to run.
 * --setup-tools runs all of them. In --yes / non-interactive mode only safe defaults run (graphify git hooks,
 * unless that would change an existing file); everything else needs --setup-tools. Otherwise the user is asked.
 * --dry-run only lists the actions.
 * @returns The actions to run now (possibly none).
 */
async function chooseSetupActions(root: string, options: InitOptions, actions: SetupAction[]): Promise<SetupAction[]> {
  if (actions.length === 0) return [];
  const listing = actions.map((a) => `${pc.cyan(`${a.command} ${a.args.join(' ')}`)}  ${pc.dim(a.label)}`).join('\n');
  if (options.dryRun) {
    p.note(listing, `Tool setup ${options.setupTools ? 'that would run' : 'available (--setup-tools; graphify hooks run by default)'}`);
    return [];
  }
  if (options.setupTools) return actions;
  if (options.yes || !process.stdin.isTTY) {
    const { run, skipped } = await selectDefaultActions(root, actions);
    for (const { action, reason } of skipped) p.log.warn(`${action.label}: skipped — ${reason}`);
    return run;
  }
  p.note(listing, 'Per-repo tool setup');
  const ok = await p.confirm({ message: 'Run these setup commands now?', initialValue: true });
  return ok === true ? actions : [];
}

/**
 * Reads agent-initiator's own version from its package.json, which sits next to the bundled presets/ folder.
 * @throws When the version cannot be read: the installation is broken and the manifest would be wrong.
 */
async function toolVersion(): Promise<string> {
  const file = path.join(path.dirname(await defaultPresetsDir()), 'package.json');
  const pkg = await readJson<{ version?: unknown }>(file);
  if (typeof pkg?.version !== 'string') throw new Error(`Could not read the agent-initiator version from ${file}`);
  return pkg.version;
}

/** Tells the user when the repository was already initialised; existing files are kept either way. */
async function reportInitState(root: string): Promise<void> {
  const state = await detectInitState(root);
  if (state.kind === 'manifest') {
    p.log.info(`Already initialised with agent-initiator v${state.version} on ${state.generatedAt}; existing files are kept, only missing ones are added.`);
  } else if (state.kind === 'legacy') {
    p.log.info('Initialised by an earlier agent-initiator version (no manifest); existing files are kept, only missing ones are added.');
  }
}

async function runInit(dir: string, options: InitOptions): Promise<void> {
  const root = path.resolve(dir);
  const registry = await loadRegistry(await defaultPresetsDir());
  p.intro(pc.bold('agent-initiator'));

  const prepared = await prepareNewProject(root, registry, options);
  if (prepared.cancelled) return p.cancel('Cancelled.');
  const forcedPresets = prepared.presetIds ?? options.preset?.split(',').map((id) => id.trim()).filter(Boolean);

  let project = await detectProject(root, { nodePackageManager: prepared.packageManager });
  if (forcedPresets) project = overridePresets(project, forcedPresets);
  p.note(describeProject(registry, project), `Detected in ${root}`);

  if (!options.yes && !forcedPresets && project.packages.length > 0) {
    if (!process.stdin.isTTY) throw new Error('Non-interactive shell: re-run with --yes (or --preset <ids>).');
    const ok = await p.confirm({ message: 'Use these presets?' });
    if (p.isCancel(ok)) return p.cancel('Cancelled.');
    if (!ok) {
      const picked = await choosePresets(registry);
      if (!picked) return p.cancel('Cancelled.');
      project = overridePresets(project, picked);
    }
  }

  const rootIds = [...new Set(['base', ...(project.monorepo ? [project.monorepo] : []), ...project.packages.flatMap((pkg) => pkg.presets)])];
  // Every tool is optional: the ones installed on this machine become required instructions, the rest are left out.
  const toolStatus = await checkTools(resolvePresets(registry, rootIds).tooling);
  const installedTools = toolStatus.filter((s) => s.installed).map((s) => s.tool.id);

  // Runs before generation so skills installed by tools (UI UX Pro Max) get indexed in AGENTS.md.
  const setupActions = await chooseSetupActions(root, options, planToolSetup(installedTools));
  if (setupActions.length > 0) {
    await runToolSetup(root, setupActions, logSetupResult);
    project = { ...project, existingSkills: await detectExistingSkills(root) };
  }

  await reportInitState(root);
  const version = await toolVersion();
  const date = new Date().toISOString().slice(0, 10);
  const generated = generateFiles(project, registry, { date, installedTools, version });
  const { kind } = generated;
  const filePlan = await planFiles(root, generated.files);
  // The manifest records only the files this run writes; an existing manifest is kept like any other file.
  const manifest = renderManifest({ version, date, presets: generated.presets, tools: generated.tools, written: filePlan.filter((f) => f.status === 'create') });
  const plan = [...filePlan, ...(await planFiles(root, [manifest]))];
  const created = plan.filter((f) => f.status === 'create');
  const skipped = plan.filter((f) => f.status === 'skip');

  const listing = [...created.map((f) => `${pc.green('+')} ${f.path}`), ...skipped.map((f) => `${pc.yellow('=')} ${f.path} ${pc.dim('(exists, kept)')}`)];
  p.note(listing.join('\n'), `${kind} · ${created.length} to create, ${skipped.length} kept`);

  if (options.dryRun) return p.outro('Dry run — nothing written.');

  const written = await applyPlan(root, plan);
  for (const step of await manualSteps(root, plan)) p.log.warn(step);

  console.log(pc.bold('\nTools (optional; the installed ones are used in AGENTS.md):'));
  printToolStatus(toolStatus);

  p.outro(`Wrote ${written.length} file(s). Review them, then commit when ready.`);
}

// How each state is shown in `status`, in this order; `up-to-date` files are only counted.
const STATE_LABELS: Array<[FileState, string]> = [
  ['outdated', 'outdated — unchanged by you, this version generates something new (safe to update)'],
  ['conflict', 'conflict — you changed it and this version generates something new (merge by hand)'],
  ['missing', 'missing — this version generates it, but it is not on disk (run init to add it)'],
  ['differs', 'differs — no record of what init wrote, so it is unknown who changed it'],
  ['edited', 'edited — you changed it; this version generates the same as before (kept)'],
  ['obsolete', 'obsolete — init wrote it, but this version no longer generates it (review and delete it yourself)'],
];

/**
 * `status`: compares the repository with what this version of agent-initiator generates, without changing it.
 * It regenerates in memory with the date and tools recorded in the manifest, so only real template changes show up.
 * New content for files worth comparing goes to a temp folder outside the repository, with a `git diff` command.
 * Exits with code 1 when a file is outdated, in conflict or missing, so CI can use it like `cruft check`.
 */
async function runStatus(dir: string): Promise<void> {
  const root = path.resolve(dir);
  const registry = await loadRegistry(await defaultPresetsDir());
  const version = await toolVersion();
  const manifest = await readManifest(root);
  const project = await detectProject(root);

  const today = new Date().toISOString().slice(0, 10);
  const generated = generateFiles(project, registry, {
    date: manifest?.generatedAt ?? today,
    installedTools: manifest?.tools,
    version,
  });
  const paths = [...new Set([...generated.files.map((f) => f.path), ...Object.keys(manifest?.files ?? {})])].filter((p) => p !== MANIFEST_PATH);
  const onDisk: Record<string, string | null> = {};
  for (const file of paths) {
    const text = await readText(path.join(root, file));
    onDisk[file] = text === null ? null : contentHash(text);
  }
  const statuses = classifyFiles({ recorded: manifest?.files ?? null, onDisk, generated: generated.files });

  console.log(
    manifest
      ? `Initialised with agent-initiator v${manifest.version} on ${manifest.generatedAt}; this is v${version}.`
      : `No manifest in ${MANIFEST_PATH}: initialised before v${version} recorded one, or never; files can only be compared as same/different.`,
  );
  if (manifest) {
    const installed = (await checkTools(resolvePresets(registry, generated.presets).tooling)).filter((s) => s.installed).map((s) => s.tool.id);
    const added = installed.filter((id) => !manifest.tools.includes(id));
    if (added.length > 0) console.log(pc.dim(`Tools installed since init (left out of this comparison): ${added.join(', ')}`));
  }

  const compareDir = await mkdtemp(path.join(tmpdir(), 'agent-initiator-status-'));
  for (const [state, label] of STATE_LABELS) {
    const group = statuses.filter((s) => s.state === state);
    if (group.length === 0) continue;
    console.log(`\n${pc.bold(label)}`);
    for (const entry of group) {
      console.log(`  ${entry.path}`);
      if (entry.generated === undefined || state === 'missing' || state === 'edited') continue;
      const target = path.join(compareDir, entry.path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, entry.generated, 'utf8');
      console.log(pc.dim(`    git diff --no-index -- ${path.join(root, entry.path)} ${target}`));
    }
  }
  const upToDate = statuses.filter((s) => s.state === 'up-to-date').length;
  console.log(`\n${upToDate} of ${statuses.length} file(s) up to date.`);
  process.exitCode = statuses.some((s) => ACTION_STATES.includes(s.state)) ? 1 : 0;
}

async function runList(): Promise<void> {
  const registry = await loadRegistry(await defaultPresetsDir());
  const categories = [...new Set([...registry.values()].map((preset) => preset.category))];
  for (const category of categories) {
    console.log(pc.bold(category));
    for (const preset of registry.values()) {
      if (preset.category === category) console.log(`  ${pc.cyan(preset.id.padEnd(16))} ${preset.description}`);
    }
  }
}

const program = new Command()
  .name('agent-initiator')
  .description('Generate AGENTS.md, rules, skills and constraints for AI coding assistants');

program
  .command('init', { isDefault: true })
  .argument('[dir]', 'repository directory', '.')
  .option('-p, --preset <ids>', 'comma-separated preset ids, overriding detection (e.g. typescript,nextjs)')
  .option('-y, --yes', 'accept detected presets without prompting')
  .option('--dry-run', 'show what would be written without writing files')
  .option('--framework <id>', 'scaffold a new single-app project with this framework (new/empty dir only)')
  .option('--apps <list>', 'scaffold several apps, e.g. web:nextjs,api:nestjs (new/empty dir only)')
  .option('--layout <layout>', `repository layout for scaffolding: ${LAYOUTS.map((l) => l.value).join(' | ')}`)
  .option('--lang <ts|js>', 'language for Node apps when scaffolding (default: ts)')
  .option('--pm <pm>', 'package manager for scaffolding: pnpm | npm | yarn | bun')
  .option('--skip-install', 'do not install dependencies after scaffolding (where the scaffolder allows it)')
  .option('--setup-tools', 'run per-repo tool setup without asking (graphify graph + git hooks, UI UX Pro Max skills)')
  .action(runInit);

program.command('list').description('list available presets').action(runList);

program
  .command('status')
  .description('compare the repository with what this version generates (exit code 1 when files are outdated or missing)')
  .argument('[dir]', 'repository directory', '.')
  .action(runStatus);

program
  .command('doctor')
  .description('show which optional tools are installed')
  .action(async () => {
    printToolStatus(await checkTools());
    // Hooks are per clone: report them for the current repo, but do not fail (CI clones never have them).
    const hooks = isInsideGitRepo(process.cwd()) ? graphifyHookState(process.cwd()) : 'unknown';
    if (hooks === 'installed') console.log(`${pc.green('✓')} graphify git hooks in this repo`);
    if (hooks === 'missing') console.log(`${pc.yellow('!')} graphify git hooks missing in this repo ${pc.dim('→ graphify hook install')}`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(pc.red(`Error: ${(error as Error).message}`));
  process.exitCode = 1;
});
