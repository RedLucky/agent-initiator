import path from 'node:path';
import { getFramework, languageFor, type FrameworkInfo } from './frameworks.js';
import { djangoExtraFiles, expressDependencies, expressFiles, fastapiFiles, goFiles, workspaceRootFiles, type TemplateFile } from './templates.js';
import type { AppSpec, Layout, NodePackageManager, ScaffoldLanguage, ScaffoldSpec, Step } from './types.js';

interface AppContext {
  root: string;
  /** App folder relative to the root ("." for the single layout). */
  dir: string;
  name: string;
  language: ScaffoldLanguage;
  pm: NodePackageManager;
  /** Whether this scaffolder should install dependencies itself. Monorepos install once at the root instead. */
  install: boolean;
  layout: Layout;
}

// Always run scaffolders through npx with --yes so npm never stops to ask "Ok to proceed?".
const npx = (ctx: AppContext, pkg: string, args: string[], label: string): Step => ({
  type: 'run',
  label,
  cwd: ctx.root,
  command: 'npx',
  args: ['--yes', pkg, ...args],
});

const inApp = (ctx: AppContext, command: string, args: string[], label: string): Step => ({
  type: 'run',
  label,
  cwd: path.join(ctx.root, ctx.dir),
  command,
  args,
});

const writeAll = (ctx: AppContext, files: TemplateFile[]): Step[] =>
  files.map((file) => ({ type: 'write', label: `write ${path.posix.join(ctx.dir, file.path)}`, path: path.join(ctx.root, ctx.dir, file.path), content: file.content }));

const expect = (ctx: AppContext, file: string): Step => ({ type: 'expect', label: `check ${path.posix.join(ctx.dir, file)}`, path: path.join(ctx.root, ctx.dir, file) });

const mkdirApp = (ctx: AppContext): Step => ({ type: 'mkdir', label: `create ${ctx.dir}`, path: path.join(ctx.root, ctx.dir) });

/** `<pm> add` arguments; runtime and dev dependencies are separate calls. */
function addArgs(pm: NodePackageManager, packages: string[], dev: boolean): [string, string[]] {
  const verb = pm === 'npm' ? 'install' : 'add';
  const devFlag = pm === 'bun' ? '-d' : '-D';
  return [pm, [verb, ...(dev ? [devFlag] : []), ...packages]];
}

const installStep = (ctx: AppContext): Step => inApp(ctx, ctx.pm, ['install'], `install dependencies in ${ctx.dir}`);

/** Steps that create one app with its official scaffolder (or a minimal template when none exists). */
function appSteps(framework: FrameworkInfo, ctx: AppContext): Step[] {
  const ts = ctx.language === 'typescript';
  const label = `scaffold ${framework.label} in ${ctx.dir}`;
  switch (framework.id) {
    case 'nextjs':
      return [
        npx(ctx, 'create-next-app@latest', [
          ctx.dir, '--yes', ts ? '--ts' : '--js', '--app', '--eslint', '--src-dir', '--import-alias', '@/*',
          `--use-${ctx.pm}`, '--disable-git', '--no-agents-md', ...(ctx.install ? [] : ['--skip-install']),
        ], label),
        expect(ctx, 'package.json'),
      ];
    case 'react-vite':
    case 'vue-vite': {
      const base = framework.id === 'react-vite' ? 'react' : 'vue';
      return [
        npx(ctx, 'create-vite@latest', [ctx.dir, '--template', ts ? `${base}-ts` : base, '--no-interactive'], label),
        expect(ctx, 'package.json'),
        ...(ctx.install ? [installStep(ctx)] : []),
      ];
    }
    case 'nuxt':
      return [
        npx(ctx, 'create-nuxt@latest', [
          ctx.dir, '--template', 'minimal', '--packageManager', ctx.pm, '--no-gitInit', '--modules', '',
          ...(ctx.install ? [] : ['--no-install']),
          // The single layout scaffolds into the (verified empty) root, which already exists.
          ...(ctx.dir === '.' ? ['--force'] : []),
        ], label),
        expect(ctx, 'package.json'),
      ];
    case 'nestjs':
      return [
        npx(ctx, '@nestjs/cli@latest', [
          'new', ctx.name, '--directory', ctx.dir, '--package-manager', ctx.pm, '--skip-git',
          '--language', ts ? 'TS' : 'JS', '--strict', ...(ctx.install ? [] : ['--skip-install']),
        ], label),
        expect(ctx, 'package.json'),
      ];
    case 'hono':
      // create-hono has no "skip install" flag and prompts without --install, so it always installs.
      return [npx(ctx, 'create-hono@latest', [ctx.dir, '--template', 'nodejs', '--pm', ctx.pm, '--install'], label), expect(ctx, 'package.json')];
    case 'fastify':
      return [
        mkdirApp(ctx),
        inApp(ctx, 'npx', ['--yes', 'fastify-cli@latest', 'generate', '.', ts ? '--lang=ts' : '--esm'], label),
        expect(ctx, 'package.json'),
        ...(ctx.install ? [installStep(ctx)] : []),
      ];
    case 'express': {
      // No modern official generator: write a minimal app, then let the package manager pin current versions.
      const { deps, devDeps } = expressDependencies(ctx.language);
      const [cmd, runtimeArgs] = addArgs(ctx.pm, deps, false);
      const [, devArgs] = addArgs(ctx.pm, devDeps, true);
      return [
        mkdirApp(ctx),
        ...writeAll(ctx, expressFiles(ctx.name, ctx.language)),
        inApp(ctx, cmd, runtimeArgs, `add express to ${ctx.dir}`),
        inApp(ctx, cmd, devArgs, `add dev dependencies to ${ctx.dir}`),
      ];
    }
    case 'fastapi':
      return [
        mkdirApp(ctx),
        inApp(ctx, 'uv', ['init', '--bare', '--name', ctx.name], `init Python project in ${ctx.dir}`),
        inApp(ctx, 'uv', ['add', 'fastapi[standard]'], `add FastAPI to ${ctx.dir}`),
        inApp(ctx, 'uv', ['add', '--dev', 'pytest', 'ruff', 'mypy', 'pip-audit'], `add dev tools to ${ctx.dir}`),
        ...writeAll(ctx, fastapiFiles()),
        expect(ctx, 'pyproject.toml'),
        // Lets `fastapi dev` / `fastapi run` find the app without a path argument (official FastAPI recommendation).
        { type: 'append', label: `set FastAPI entrypoint in ${ctx.dir}`, path: path.join(ctx.root, ctx.dir, 'pyproject.toml'), content: '\n[tool.fastapi]\nentrypoint = "app.main:app"\n' },
      ];
    case 'django':
      return [
        mkdirApp(ctx),
        inApp(ctx, 'uv', ['init', '--bare', '--name', ctx.name], `init Python project in ${ctx.dir}`),
        inApp(ctx, 'uv', ['add', 'django'], `add Django to ${ctx.dir}`),
        inApp(ctx, 'uv', ['add', '--dev', 'pytest', 'pytest-django', 'ruff', 'mypy', 'django-stubs[compatible-mypy]', 'pip-audit'], `add dev tools to ${ctx.dir}`),
        inApp(ctx, 'uv', ['run', 'django-admin', 'startproject', 'config', '.'], label),
        expect(ctx, 'manage.py'),
        ...writeAll(ctx, djangoExtraFiles()),
        // mypy needs the django-stubs plugin, and startproject leaves one un-annotated list that strict typing rejects.
        { type: 'append', label: `configure mypy in ${ctx.dir}`, path: path.join(ctx.root, ctx.dir, 'pyproject.toml'), content: DJANGO_MYPY_CONFIG },
        { type: 'replace', label: `annotate ALLOWED_HOSTS in ${ctx.dir}`, path: path.join(ctx.root, ctx.dir, 'config', 'settings.py'), search: 'ALLOWED_HOSTS = []', replace: 'ALLOWED_HOSTS: list[str] = []' },
      ];
    case 'go-http':
      return [
        mkdirApp(ctx),
        inApp(ctx, 'go', ['mod', 'init', ctx.name], `init Go module in ${ctx.dir}`),
        ...writeAll(ctx, goFiles()),
        inApp(ctx, 'go', ['get', 'github.com/gin-gonic/gin@latest'], `add Gin to ${ctx.dir}`),
        inApp(ctx, 'go', ['mod', 'tidy'], `tidy Go module in ${ctx.dir}`),
        expect(ctx, 'go.mod'),
      ];
    default:
      throw new Error(`No scaffold recipe for "${framework.id}"`);
  }
}

const DJANGO_MYPY_CONFIG = '\n[tool.mypy]\nplugins = ["mypy_django_plugin.main"]\n\n[tool.django-stubs]\ndjango_settings_module = "config.settings"\n';

function appDir(layout: Layout, app: AppSpec): string {
  if (layout === 'single') return '.';
  if (layout === 'folders') return app.name;
  return `apps/${app.name}`;
}

/** Nx apps use Nx generators when a plugin exists; everything else falls back to the framework's own scaffolder. */
function nxAppSteps(framework: FrameworkInfo, ctx: AppContext, addedPlugins: Set<string>): Step[] {
  if (!framework.nx || ctx.language === 'javascript') return appSteps(framework, ctx);
  const steps: Step[] = [];
  if (!addedPlugins.has(framework.nx.plugin)) {
    addedPlugins.add(framework.nx.plugin);
    steps.push({ type: 'run', label: `add Nx plugin ${framework.nx.plugin}`, cwd: ctx.root, command: 'npx', args: ['nx', 'add', framework.nx.plugin] });
  }
  steps.push(
    {
      type: 'run',
      label: `generate ${framework.label} app ${ctx.dir}`,
      cwd: ctx.root,
      command: 'npx',
      // Vitest so every app has a working unit-test target (Nx's Jest setup currently fails to parse its config on TS 6).
      args: ['nx', 'g', framework.nx.generator, ctx.dir, '--no-interactive', '--e2eTestRunner=none', '--unitTestRunner=vitest', ...framework.nx.args],
    },
    expect(ctx, 'package.json'),
  );
  return steps;
}

// Agent files shipped by nrwl/empty-template that would compete with ours. Kept: the official Nx skills in
// .agents/skills (indexed in our AGENTS.md) and CI workflows in .github/workflows. monitor-ci needs Nx Cloud, which we skip.
const NX_TEMPLATE_AGENT_FILES = [
  'AGENTS.md', 'CLAUDE.md', '.claude', '.codex', '.cursor', '.gemini', '.opencode', 'opencode.json',
  '.github/prompts', '.github/skills', '.github/agents', '.agents/skills/monitor-ci',
];

function rootSteps(spec: ScaffoldSpec, name: string): Step[] {
  const { root, layout, packageManager: pm } = spec;
  if (layout === 'nx') {
    // create-nx-workspace creates the folder itself and always installs. The empty template gives package-based
    // projects (each app has a package.json), matching our detection and the other monorepo layouts.
    return [
      {
        type: 'run',
        label: 'create Nx workspace',
        cwd: path.dirname(root),
        command: 'npx',
        args: ['--yes', 'create-nx-workspace@latest', path.basename(root), '--template=nrwl/empty-template', `--pm=${pm}`, '--nxCloud=skip', '--interactive=false', '--skipGit', '--aiAgents=none'],
      },
      { type: 'expect', label: 'check nx.json', path: path.join(root, 'nx.json') },
      // The template ships its own agent config regardless of --aiAgents; remove it so our AGENTS.md is authoritative.
      ...NX_TEMPLATE_AGENT_FILES.map((file): Step => ({ type: 'remove', label: `remove template ${file}`, path: path.join(root, file) })),
    ];
  }
  const steps: Step[] = [{ type: 'mkdir', label: `create ${path.basename(root)}`, path: root }];
  if (layout === 'turborepo' || layout === 'workspaces' || layout === 'moonrepo') {
    for (const file of workspaceRootFiles(name, pm, layout, spec.packageManagerVersion)) {
      steps.push({ type: 'write', label: `write ${file.path}`, path: path.join(root, file.path), content: file.content });
    }
    // Scaffolders such as create-next-app refuse to run when the parent folder does not exist yet.
    steps.push({ type: 'mkdir', label: 'create apps/', path: path.join(root, 'apps') });
  }
  return steps;
}

// Files a scaffolder may leave inside a monorepo app that would split it from the workspace.
const NESTED_WORKSPACE_FILES = ['pnpm-workspace.yaml', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];

/** Final monorepo steps: drop nested workspace/lock files, add turbo, install once at the root. */
function finishSteps(spec: ScaffoldSpec): Step[] {
  const { root, layout, packageManager: pm, apps } = spec;
  if (layout === 'single' || layout === 'folders') return [];
  const steps: Step[] = [];
  for (const app of apps.filter((a) => getFramework(a.framework).runtime === 'node')) {
    const dir = appDir(layout, app);
    for (const file of NESTED_WORKSPACE_FILES) {
      steps.push({ type: 'remove', label: `remove nested ${dir}/${file}`, path: path.join(root, dir, file) });
    }
  }
  if (layout === 'turborepo') {
    const args = pm === 'pnpm' ? ['add', '-D', '-w', 'turbo'] : pm === 'yarn' ? ['add', '-D', '-W', 'turbo'] : addArgs(pm, ['turbo'], true)[1];
    steps.push({ type: 'run', label: 'add turbo', cwd: root, command: pm, args });
  }
  if (spec.install) steps.push({ type: 'run', label: 'install workspace dependencies', cwd: root, command: pm, args: ['install'] });
  return steps;
}

/** Turns a scaffold spec into an ordered list of steps. Pure: nothing is executed here. */
export function buildScaffoldSteps(spec: ScaffoldSpec): Step[] {
  const name = path.basename(spec.root);
  const monorepo = spec.layout === 'turborepo' || spec.layout === 'workspaces' || spec.layout === 'nx' || spec.layout === 'moonrepo';
  const addedPlugins = new Set<string>();
  const steps = rootSteps(spec, name);

  for (const app of spec.apps) {
    const framework = getFramework(app.framework);
    const ctx: AppContext = {
      root: spec.root,
      dir: appDir(spec.layout, app),
      name: spec.layout === 'single' ? name : app.name,
      language: languageFor(framework, spec.language),
      pm: spec.packageManager,
      install: spec.install && !monorepo,
      layout: spec.layout,
    };
    steps.push(...(spec.layout === 'nx' ? nxAppSteps(framework, ctx, addedPlugins) : appSteps(framework, ctx)));
  }
  return [...steps, ...finishSteps(spec)];
}
