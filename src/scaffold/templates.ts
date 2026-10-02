/**
 * Minimal starter files for stacks without a modern official scaffolder (Express, FastAPI, Django extras, Go)
 * and for monorepo roots. Kept deliberately tiny: one health endpoint plus one test, so DoD commands work from day one.
 */
import type { NodePackageManager, ScaffoldLanguage } from './types.js';

export interface TemplateFile {
  path: string;
  content: string;
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export const NODE_GITIGNORE = ['node_modules', 'dist', '.next', '.nuxt', '.output', '.turbo', 'coverage', '.env', '.env.*', '!.env.example', ''].join('\n');

export function expressFiles(name: string, language: ScaffoldLanguage): TemplateFile[] {
  const ts = language === 'typescript';
  const ext = ts ? 'ts' : 'js';
  const files: TemplateFile[] = [
    {
      path: 'package.json',
      content: json({
        name,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: ts
          ? { dev: 'tsx watch src/server.ts', build: 'tsc -p tsconfig.json', start: 'node dist/server.js', test: 'vitest run' }
          : { dev: 'node --watch src/server.js', start: 'node src/server.js', test: 'vitest run' },
      }),
    },
    {
      path: `src/app.${ext}`,
      content: `import express from 'express';

/** Builds the Express app without listening, so tests can exercise it directly. */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Liveness probe used by load balancers and uptime checks.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
`,
    },
    {
      path: `src/server.${ext}`,
      content: `import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  console.info(JSON.stringify({ level: 'info', msg: 'server started', port }));
});
`,
    },
    {
      path: `src/app.test.${ext}`,
      content: `import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('GET /health', () => {
  it('returns ok', async () => {
    const response = await request(createApp()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
`,
    },
    { path: '.gitignore', content: NODE_GITIGNORE },
  ];
  if (ts) {
    files.push({
      path: 'tsconfig.json',
      content: json({
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          outDir: 'dist',
          rootDir: 'src',
          types: ['node'],
        },
        include: ['src'],
        exclude: ['src/**/*.test.ts'],
      }),
    });
  }
  return files;
}

export function expressDependencies(language: ScaffoldLanguage): { deps: string[]; devDeps: string[] } {
  const devDeps = ['vitest', 'supertest'];
  if (language === 'typescript') devDeps.push('typescript', 'tsx', '@types/node', '@types/express', '@types/supertest');
  return { deps: ['express'], devDeps };
}

export function fastapiFiles(): TemplateFile[] {
  return [
    { path: 'app/__init__.py', content: '' },
    {
      path: 'app/main.py',
      content: `"""FastAPI application entry point."""

from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe used by load balancers and uptime checks."""
    return {"status": "ok"}
`,
    },
    { path: 'tests/__init__.py', content: '' },
    {
      path: 'tests/test_main.py',
      content: `from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
`,
    },
    { path: '.gitignore', content: ['.venv', '__pycache__', '*.pyc', '.pytest_cache', '.env', ''].join('\n') },
  ];
}

export function djangoExtraFiles(): TemplateFile[] {
  return [
    { path: 'tests/__init__.py', content: '' },
    {
      path: 'tests/test_smoke.py',
      content: `from django.test import TestCase


class AdminLoginPageTests(TestCase):
    """Smoke test: the project boots, migrates a test database and serves a page."""

    def test_admin_login_page_loads(self) -> None:
        response = self.client.get("/admin/login/")
        self.assertEqual(response.status_code, 200)
`,
    },
    { path: 'pytest.ini', content: '[pytest]\nDJANGO_SETTINGS_MODULE = config.settings\npython_files = tests.py test_*.py *_tests.py\n' },
    { path: '.gitignore', content: ['.venv', '__pycache__', '*.pyc', '.pytest_cache', 'db.sqlite3', '.env', ''].join('\n') },
  ];
}

export function goFiles(): TemplateFile[] {
  return [
    {
      path: 'main.go',
      content: `package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// newRouter builds the HTTP router without starting a server, so tests can exercise it directly.
func newRouter() *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())

	// Liveness probe used by load balancers and uptime checks.
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	return router
}

func main() {
	addr := ":" + envOr("PORT", "8080")
	slog.Info("server starting", slog.String("addr", addr))
	if err := newRouter().Run(addr); err != nil {
		slog.Error("server stopped", slog.Any("error", err))
		os.Exit(1)
	}
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
`,
    },
    {
      path: 'main_test.go',
      content: `package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthReturnsOK(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/health", nil)

	newRouter().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
}
`,
    },
  ];
}

// Workspace-wide scripts for plain package-manager workspaces (no task runner).
const WORKSPACE_RUN: Record<NodePackageManager, (task: string) => string> = {
  pnpm: (task) => `pnpm -r --if-present run ${task}`,
  npm: (task) => `npm run ${task} --workspaces --if-present`,
  yarn: (task) => `yarn workspaces run ${task}`,
  bun: (task) => `bun run --filter '*' ${task}`,
};

/** Root files for Turborepo, moonrepo or plain workspaces. pnpm declares packages in pnpm-workspace.yaml, others in package.json. */
export function workspaceRootFiles(
  name: string,
  pm: NodePackageManager,
  tool: 'turborepo' | 'workspaces' | 'moonrepo',
  pmVersion?: string,
): TemplateFile[] {
  const patterns = ['apps/*', 'packages/*'];
  const run = (task: string) =>
    tool === 'turborepo'
      ? `turbo run ${task}`
      : tool === 'moonrepo'
        ? task === 'lint'
          ? 'moon check'
          : `moon run :${task}`
        : WORKSPACE_RUN[pm](task);
  const pkg: Record<string, unknown> = {
    name,
    private: true,
    scripts: { build: run('build'), dev: run('dev'), lint: run('lint'), test: run('test') },
  };
  if (pmVersion) pkg.packageManager = `${pm}@${pmVersion}`;
  if (pm !== 'pnpm') pkg.workspaces = patterns;

  const files: TemplateFile[] = [
    { path: 'package.json', content: json(pkg) },
    { path: '.gitignore', content: NODE_GITIGNORE },
  ];
  if (pm === 'pnpm') files.push({ path: 'pnpm-workspace.yaml', content: `packages:\n${patterns.map((p) => `  - '${p}'`).join('\n')}\n` });
  if (tool === 'turborepo') {
    files.push({
      path: 'turbo.json',
      content: json({
        $schema: 'https://turborepo.com/schema.json',
        tasks: {
          build: { dependsOn: ['^build'], outputs: ['dist/**', '.next/**', '!.next/cache/**', '.output/**'] },
          dev: { cache: false, persistent: true },
          lint: {},
          test: { dependsOn: ['^build'] },
        },
      }),
    });
  }
  if (tool === 'moonrepo') {
    files.push({
      path: '.moon/workspace.yml',
      content: `projects:\n  - 'apps/*'\n  - 'packages/*'\n`,
    });
  }
  return files;
}
