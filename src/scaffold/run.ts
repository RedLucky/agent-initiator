import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { exists } from '../fs-utils.js';
import { moonProjectConfig } from './templates.js';
import type { Step } from './types.js';

export type StepLogger = (step: Step, index: number, total: number) => void;

// Env vars that make scaffolders switch to "AI agent mode" (Nx then writes its own AGENTS.md/CLAUDE.md and agent folders).
const AGENT_ENV_VARS = ['CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT', 'OPENCODE'];

/** Environment for scaffolders: the user's env minus agent-detection variables, so output is the same inside or outside an agent. */
export function scaffoldEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const clean = { ...env };
  for (const key of AGENT_ENV_VARS) delete clean[key];
  return clean;
}

/** Runs a command with inherited stdio (scaffolders print their own progress) and rejects on a non-zero exit. */
export function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // stdin is closed so a scaffolder can never hang waiting for input. (No CI=1: pnpm would then force a frozen lockfile.)
    const child = spawn(command, args, { cwd, env: scaffoldEnv(), stdio: ['ignore', 'inherit', 'inherit'], shell: process.platform === 'win32' });
    child.on('error', (error) => reject(new Error(`Could not start "${command}": ${error.message}`)));
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`"${command} ${args.join(' ')}" failed with exit code ${code}`))));
  });
}

/** Executes scaffold steps in order and stops at the first failure. */
export async function runSteps(steps: Step[], log: StepLogger = () => {}): Promise<void> {
  for (const [index, step] of steps.entries()) {
    log(step, index, steps.length);
    switch (step.type) {
      case 'run':
        await runCommand(step.command, step.args, step.cwd);
        break;
      case 'mkdir':
        await mkdir(step.path, { recursive: true });
        break;
      case 'write':
        await mkdir(path.dirname(step.path), { recursive: true });
        await writeFile(step.path, step.content, 'utf8');
        break;
      case 'replace': {
        const content = await readFile(step.path, 'utf8');
        if (!content.includes(step.search)) throw new Error(`Expected to find "${step.search}" in ${step.path}; the scaffolder output changed.`);
        await writeFile(step.path, content.replace(step.search, step.replace), 'utf8');
        break;
      }
      case 'append':
        await appendFile(step.path, step.content, 'utf8');
        break;
      case 'remove':
        // Only ever points at files a scaffolder just generated inside the new project.
        await rm(step.path, { force: true, recursive: true });
        break;
      case 'moon-tasks': {
        const target = path.join(step.dir, 'moon.yml');
        if (await exists(target)) break; // the scaffolder (or the user) already defined the tasks
        const pkg = await readFile(path.join(step.dir, 'package.json'), 'utf8').catch(() => null);
        const scripts = pkg === null ? [] : Object.keys((JSON.parse(pkg) as { scripts?: Record<string, string> }).scripts ?? {});
        await writeFile(target, moonProjectConfig(step.framework, step.packageManager, scripts), 'utf8');
        break;
      }
      case 'expect':
        if (!(await exists(step.path))) throw new Error(`Scaffolding did not create ${step.path} — the scaffolder probably failed; see its output above.`);
        break;
    }
  }
}
