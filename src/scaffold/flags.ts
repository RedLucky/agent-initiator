import { getFramework } from './frameworks.js';
import { LAYOUTS, parseApps } from './index.js';
import type { Layout, NodePackageManager, ScaffoldSpec } from './types.js';

/** CLI flags that describe a project to scaffold (commander maps --skip-install to skipInstall). */
export interface ScaffoldFlags {
  layout?: string;
  framework?: string;
  apps?: string;
  lang?: string;
  pm?: string;
  skipInstall?: boolean;
}

const NODE_PMS: NodePackageManager[] = ['npm', 'pnpm', 'yarn', 'bun'];

/** Builds a scaffold spec from --layout/--framework/--apps/--lang/--pm/--skip-install, validating each value. */
export function specFromFlags(root: string, flags: ScaffoldFlags, defaultPm: NodePackageManager): ScaffoldSpec {
  const apps = flags.apps
    ? parseApps(flags.apps)
    : flags.framework
      ? [{ framework: flags.framework, name: getFramework(flags.framework).defaultName }]
      : [];
  const layout = flags.layout ?? (apps.length > 1 ? 'folders' : 'single');
  if (!LAYOUTS.some((l) => l.value === layout)) throw new Error(`Unknown layout "${layout}". Use one of: ${LAYOUTS.map((l) => l.value).join(', ')}`);
  if (flags.lang && !['ts', 'js'].includes(flags.lang)) throw new Error('--lang must be "ts" or "js"');
  if (flags.pm && !NODE_PMS.includes(flags.pm as NodePackageManager)) throw new Error(`--pm must be one of: ${NODE_PMS.join(', ')}`);
  return {
    root,
    layout: layout as Layout,
    apps,
    language: flags.lang === 'js' ? 'javascript' : 'typescript',
    packageManager: (flags.pm as NodePackageManager | undefined) ?? defaultPm,
    install: !flags.skipInstall,
  };
}
