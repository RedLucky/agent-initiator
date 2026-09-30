import path from 'node:path';
import { readText } from '../fs-utils.js';
import type { PackageInfo } from '../types.js';

// HTTP frameworks that mark a Go module as a web service.
const HTTP_FRAMEWORKS = ['github.com/gin-gonic/gin', 'github.com/labstack/echo', 'github.com/go-chi/chi', 'github.com/gofiber/fiber'];

/** Detects a Go module from go.mod; returns null when the directory has none. */
export async function detectGoPackage(root: string, relPath: string): Promise<PackageInfo | null> {
  const dir = path.join(root, relPath);
  const goMod = await readText(path.join(dir, 'go.mod'));
  if (goMod === null) return null;

  const modulePath = goMod.match(/^module\s+(\S+)/m)?.[1];
  const isHttpService = HTTP_FRAMEWORKS.some((fw) => goMod.includes(fw));

  return {
    path: relPath,
    name: modulePath ? path.posix.basename(modulePath) : path.basename(dir),
    language: 'go',
    packageManager: 'go',
    presets: isHttpService ? ['go', 'go-http'] : ['go'],
    scripts: [],
    manifests: ['go.mod'],
  };
}
