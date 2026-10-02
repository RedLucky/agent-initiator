import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { graphifyHookState } from '../src/doctor.js';

/** Creates a temp bin folder with a fake `graphify` that prints `output` and exits with `code`. */
async function fakeGraphify(output: string, code = 0): Promise<string> {
  const bin = await mkdtemp(path.join(tmpdir(), 'agent-initiator-graphify-'));
  const file = path.join(bin, 'graphify');
  await writeFile(file, `#!/bin/sh\nprintf '%s\\n' "${output}"\nexit ${code}\n`);
  await chmod(file, 0o755);
  return bin;
}

/** Runs `fn` with PATH limited to `bin`, restoring the real PATH afterwards. */
function withPath<T>(bin: string, fn: () => T): T {
  const original = process.env.PATH;
  process.env.PATH = bin;
  try {
    return fn();
  } finally {
    process.env.PATH = original;
  }
}

describe.skipIf(process.platform === 'win32')('graphifyHookState', () => {
  it('reports installed hooks', async () => {
    const bin = await fakeGraphify('post-commit: installed');
    expect(withPath(bin, () => graphifyHookState(bin))).toBe('installed');
  });

  it('reports missing hooks', async () => {
    const bin = await fakeGraphify('post-commit: not installed');
    expect(withPath(bin, () => graphifyHookState(bin))).toBe('missing');
  });

  it('is unknown when graphify fails or is not installed', async () => {
    const failing = await fakeGraphify('error', 1);
    expect(withPath(failing, () => graphifyHookState(failing))).toBe('unknown');
    const empty = await mkdtemp(path.join(tmpdir(), 'agent-initiator-nobin-'));
    expect(withPath(empty, () => graphifyHookState(empty))).toBe('unknown');
  });
});

describe.skipIf(process.platform === 'win32')('checkTools', () => {
  it('finds tools by binary on PATH or by a folder in the home directory', async () => {
    const { checkTools } = await import('../src/doctor.js');
    const { mkdir } = await import('node:fs/promises');
    const bin = await fakeGraphify('ok'); // provides a `graphify` binary
    const home = await mkdtemp(path.join(tmpdir(), 'agent-initiator-home-'));
    await mkdir(path.join(home, '.claude', 'plugins', 'cache', 'caveman'), { recursive: true });

    // PATH must stay limited until the async check has finished, so restore it only after awaiting.
    const original = process.env.PATH;
    process.env.PATH = bin;
    let statuses;
    try {
      statuses = await checkTools(['graphify', 'caveman', 'rtk', 'ponytail'], home);
    } finally {
      process.env.PATH = original;
    }
    expect(Object.fromEntries(statuses.map((s) => [s.tool.id, s.installed]))).toEqual({
      graphify: true,
      caveman: true,
      rtk: false,
      ponytail: false,
    });
  });
});
