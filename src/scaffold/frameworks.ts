import type { ScaffoldLanguage } from './types.js';

export type Runtime = 'node' | 'python' | 'go';

export interface FrameworkInfo {
  id: string;
  label: string;
  kind: 'frontend' | 'backend';
  runtime: Runtime;
  /** JS/TS variants the scaffolder can produce (first = default); empty for Python/Go. */
  languages: ScaffoldLanguage[];
  /** Default app folder name in multi-app layouts. */
  defaultName: string;
  /** Nx plugin + generator used inside Nx workspaces; frameworks without one are scaffolded as plain folders. */
  nx?: { plugin: string; generator: string; args: string[] };
}

export const FRAMEWORKS: FrameworkInfo[] = [
  { id: 'nextjs', label: 'Next.js', kind: 'frontend', runtime: 'node', languages: ['typescript', 'javascript'], defaultName: 'web', nx: { plugin: '@nx/next', generator: '@nx/next:app', args: [] } },
  { id: 'react-vite', label: 'React + Vite', kind: 'frontend', runtime: 'node', languages: ['typescript', 'javascript'], defaultName: 'web', nx: { plugin: '@nx/react', generator: '@nx/react:app', args: ['--bundler=vite'] } },
  { id: 'vue-vite', label: 'Vue + Vite', kind: 'frontend', runtime: 'node', languages: ['typescript', 'javascript'], defaultName: 'web', nx: { plugin: '@nx/vue', generator: '@nx/vue:app', args: [] } },
  { id: 'nuxt', label: 'Nuxt', kind: 'frontend', runtime: 'node', languages: ['typescript'], defaultName: 'web', nx: { plugin: '@nx/nuxt', generator: '@nx/nuxt:app', args: [] } },
  { id: 'nestjs', label: 'NestJS', kind: 'backend', runtime: 'node', languages: ['typescript', 'javascript'], defaultName: 'api', nx: { plugin: '@nx/nest', generator: '@nx/nest:app', args: [] } },
  { id: 'express', label: 'Express', kind: 'backend', runtime: 'node', languages: ['typescript', 'javascript'], defaultName: 'api', nx: { plugin: '@nx/express', generator: '@nx/express:app', args: [] } },
  { id: 'fastify', label: 'Fastify', kind: 'backend', runtime: 'node', languages: ['typescript', 'javascript'], defaultName: 'api' },
  { id: 'hono', label: 'Hono', kind: 'backend', runtime: 'node', languages: ['typescript'], defaultName: 'api' },
  { id: 'fastapi', label: 'FastAPI (Python, uv)', kind: 'backend', runtime: 'python', languages: [], defaultName: 'api' },
  { id: 'django', label: 'Django (Python, uv)', kind: 'backend', runtime: 'python', languages: [], defaultName: 'api' },
  { id: 'go-http', label: 'Go + Gin', kind: 'backend', runtime: 'go', languages: [], defaultName: 'api' },
];

export function getFramework(id: string): FrameworkInfo {
  const framework = FRAMEWORKS.find((f) => f.id === id);
  if (!framework) throw new Error(`Unknown framework "${id}". Choose one of: ${FRAMEWORKS.map((f) => f.id).join(', ')}`);
  return framework;
}

/** Language actually used for an app: the requested one when supported, otherwise the framework default. */
export function languageFor(framework: FrameworkInfo, requested: ScaffoldLanguage): ScaffoldLanguage {
  if (framework.languages.length === 0 || framework.languages.includes(requested)) return requested;
  return framework.languages[0] ?? requested;
}
