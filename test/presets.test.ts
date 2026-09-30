import { beforeAll, describe, expect, it } from 'vitest';
import { defaultPresetsDir, loadRegistry, type Registry } from '../src/presets/registry.js';
import { expandChain, resolvePresets } from '../src/presets/resolve.js';
import { TOOLS } from '../src/tooling.js';

let registry: Registry;

beforeAll(async () => {
  registry = await loadRegistry(await defaultPresetsDir());
});

describe('bundled presets (lint)', () => {
  it('loads all presets with valid rules and skills', () => {
    expect(registry.size).toBeGreaterThanOrEqual(20);
  });

  it('only extends existing presets, without cycles', () => {
    for (const id of registry.keys()) expect(() => expandChain(registry, [id])).not.toThrow();
  });

  it('every preset chain starts at base', () => {
    for (const id of registry.keys()) expect(expandChain(registry, [id])[0]).toBe('base');
  });

  it('skill names and rule files are unique across presets', () => {
    const skills = [...registry.values()].flatMap((p) => p.skills.map((s) => s.name));
    const rules = [...registry.values()].flatMap((p) => p.rules.map((r) => r.file));
    expect(new Set(skills).size).toBe(skills.length);
    expect(new Set(rules).size).toBe(rules.length);
  });

  it('only references known tools', () => {
    const known = new Set(TOOLS.map((t) => t.id));
    for (const preset of registry.values()) {
      for (const tool of preset.tooling ?? []) expect(known, `${preset.id} → ${tool}`).toContain(tool);
    }
  });

  it('keeps SKILL.md bodies under the 500-line guideline', () => {
    for (const preset of registry.values()) {
      for (const skill of preset.skills) {
        const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
        expect(skillMd?.content.split('\n').length).toBeLessThan(500);
      }
    }
  });
});

describe('resolvePresets', () => {
  it('orders the chain parent-first and de-duplicates shared parents', () => {
    expect(expandChain(registry, ['typescript', 'nextjs'])).toEqual(['base', 'node', 'typescript', 'web-frontend', 'nextjs']);
  });

  it('merges commands with later presets overriding earlier ones', () => {
    const resolved = resolvePresets(registry, ['python', 'django']);
    expect(resolved.commands.test).toBe('{{pyRun}}python manage.py test');
    expect(resolved.commands.lint).toBe('{{pyRun}}ruff check .');
  });

  it('collects rules, skills, tooling and constraints from the whole chain', () => {
    const resolved = resolvePresets(registry, ['typescript', 'nextjs']);
    expect(resolved.rules.map((r) => r.file)).toContain('llm-discipline.md');
    expect(resolved.rules.map((r) => r.file)).toContain('nextjs.md');
    expect(resolved.skills.map((s) => s.name)).toContain('nextjs-add-route');
    expect(resolved.tooling).toEqual(['ponytail', 'caveman', 'rtk', 'graphify', 'ui-ux-pro-max']);
    expect(resolved.never.some((n) => n.includes('`any`'))).toBe(true);
  });

  it('throws a helpful error for unknown presets', () => {
    expect(() => resolvePresets(registry, ['rails'])).toThrow(/Unknown preset "rails"/);
  });
});
