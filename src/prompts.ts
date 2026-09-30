import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { onPath } from './doctor.js';
import type { Registry } from './presets/registry.js';
import { FRAMEWORKS, getFramework, LAYOUTS, type AppSpec, type Layout, type NodePackageManager, type ScaffoldLanguage, type ScaffoldSpec } from './scaffold/index.js';

/** What to do with a new or empty directory. */
export type NewProjectChoice = { action: 'scaffold'; spec: ScaffoldSpec } | { action: 'presets'; presetIds: string[] } | { action: 'base' };

const NODE_PMS: NodePackageManager[] = ['pnpm', 'npm', 'yarn', 'bun'];

/** Unwraps a clack answer; a cancelled prompt (Ctrl+C) becomes null so callers can stop cleanly. */
function answer<T>(value: T): Exclude<T, symbol> | null {
  return p.isCancel(value) ? null : (value as Exclude<T, symbol>);
}

/** Preferred package manager: pnpm when installed, otherwise npm (always present with Node). */
export async function defaultPackageManager(): Promise<NodePackageManager> {
  return (await onPath('pnpm')) ? 'pnpm' : 'npm';
}

/** Lets the user pick presets manually when detection is wrong or there is nothing to detect. */
export async function choosePresets(registry: Registry): Promise<string[] | null> {
  const choices = [...registry.values()].filter((preset) => preset.category !== 'base' && !preset.id.startsWith('web-') && preset.id !== 'monorepo');
  return answer(
    await p.multiselect({
      message: 'Select presets (language + framework)',
      options: choices.map((preset) => ({ value: preset.id, label: preset.name, hint: preset.category })),
      required: true,
    }),
  );
}

function uniqueName(base: string, taken: Set<string>): string {
  let name = base;
  for (let i = 2; taken.has(name); i++) name = `${base}-${i}`;
  return name;
}

async function chooseApps(layout: Layout): Promise<AppSpec[] | null> {
  const options = FRAMEWORKS.map((f) => ({
    value: f.id,
    label: f.label,
    hint: layout === 'nx' && !f.nx ? `${f.kind}, plain folder (no Nx plugin)` : f.kind,
  }));

  if (layout === 'single') {
    const framework = answer(await p.select({ message: 'Framework', options }));
    return framework ? [{ framework, name: getFramework(framework).defaultName }] : null;
  }

  const frameworks = answer(await p.multiselect({ message: 'Frameworks (one app each)', options, required: true }));
  if (!frameworks) return null;

  const apps: AppSpec[] = [];
  const taken = new Set<string>();
  for (const framework of frameworks) {
    const suggested = uniqueName(getFramework(framework).defaultName, taken);
    const name = answer(
      await p.text({
        message: `Folder name for ${getFramework(framework).label}`,
        initialValue: suggested,
        validate: (value) => (!/^[a-z][a-z0-9-]*$/.test(value ?? '') ? 'Use lowercase kebab-case' : taken.has(value ?? '') ? 'Name already used' : undefined),
      }),
    );
    if (!name) return null;
    taken.add(name);
    apps.push({ framework, name });
  }
  return apps;
}

async function chooseScaffold(root: string): Promise<ScaffoldSpec | null> {
  const layout = answer(await p.select({ message: 'Repository layout', options: LAYOUTS }));
  if (!layout) return null;

  const apps = await chooseApps(layout);
  if (!apps) return null;

  const frameworks = apps.map((app) => getFramework(app.framework));
  const offersJs = layout !== 'nx' && frameworks.some((f) => f.languages.includes('javascript'));
  const language: ScaffoldLanguage | null = offersJs
    ? answer(
        await p.select({
          message: 'Language (Node apps)',
          options: [
            { value: 'typescript' as const, label: 'TypeScript', hint: 'recommended' },
            { value: 'javascript' as const, label: 'JavaScript' },
          ],
        }),
      )
    : 'typescript';
  if (!language) return null;

  let packageManager = await defaultPackageManager();
  const needsNode = layout !== 'single' && layout !== 'folders' ? true : frameworks.some((f) => f.runtime === 'node');
  if (needsNode) {
    const available = await Promise.all(NODE_PMS.map(async (pm) => ({ pm, installed: await onPath(pm) })));
    const picked = answer(
      await p.select({
        message: 'Package manager',
        initialValue: packageManager,
        options: available.map(({ pm, installed }) => ({ value: pm, label: pm, hint: installed ? undefined : 'not installed' })),
      }),
    );
    if (!picked) return null;
    packageManager = picked;
  }

  const install = answer(await p.confirm({ message: 'Install dependencies now?', initialValue: true }));
  if (install === null) return null;

  return { root, layout, apps, language, packageManager, install };
}

/** Interactive flow for a missing or empty directory: scaffold, pick presets, base only, or cancel. */
export async function promptNewProject(root: string, registry: Registry, state: 'missing' | 'empty'): Promise<NewProjectChoice | null> {
  const where = state === 'missing' ? `${path.basename(root)} does not exist yet.` : `${path.basename(root)} is empty.`;
  const action = answer(
    await p.select({
      message: `${where} What do you want to do?`,
      options: [
        { value: 'scaffold' as const, label: 'Create a new project, then generate agent config', hint: 'recommended — uses official scaffolders' },
        { value: 'presets' as const, label: 'Only pick presets (no app code yet)' },
        { value: 'base' as const, label: 'Base rules only' },
      ],
    }),
  );
  if (!action) return null;
  if (action === 'base') return { action };
  if (action === 'presets') {
    const presetIds = await choosePresets(registry);
    return presetIds ? { action, presetIds } : null;
  }

  const spec = await chooseScaffold(root);
  if (!spec) return null;
  const summary = [
    `${pc.bold('Layout:')} ${spec.layout}`,
    ...spec.apps.map((app) => `${pc.bold('App:')} ${getFramework(app.framework).label}${spec.layout === 'single' ? '' : ` → ${spec.layout === 'folders' ? app.name : `apps/${app.name}`}`}`),
    `${pc.bold('Language:')} ${spec.language} · ${pc.bold('PM:')} ${spec.packageManager} · ${pc.bold('Install:')} ${spec.install ? 'yes' : 'no'}`,
  ];
  p.note(summary.join('\n'), 'New project');
  const ok = answer(await p.confirm({ message: 'Create it?' }));
  return ok ? { action, spec } : null;
}
