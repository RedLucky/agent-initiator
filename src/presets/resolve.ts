import type { Preset, ResolvedConfig } from '../types.js';
import type { Registry } from './registry.js';

function getPreset(registry: Registry, id: string): Preset {
  const preset = registry.get(id);
  if (!preset) throw new Error(`Unknown preset "${id}". Run "agent-initiator list" to see available presets.`);
  return preset;
}

/**
 * Expands preset ids into a parent-first, de-duplicated chain.
 * Example: ["typescript", "nextjs"] → ["base", "node", "typescript", "nextjs"].
 */
export function expandChain(registry: Registry, ids: string[]): string[] {
  const ordered: string[] = [];
  const visiting = new Set<string>();

  const visit = (id: string, trail: string[]) => {
    if (ordered.includes(id)) return;
    if (visiting.has(id)) throw new Error(`Preset cycle detected: ${[...trail, id].join(' → ')}`);
    visiting.add(id);
    for (const parent of getPreset(registry, id).extends ?? []) visit(parent, [...trail, id]);
    visiting.delete(id);
    ordered.push(id);
  };

  for (const id of ids) visit(id, []);
  return ordered;
}

const unique = (items: string[]) => [...new Set(items)];

/**
 * Merges a preset chain into one config.
 * Lists are concatenated (duplicates dropped); commands, rules, skills and files
 * with the same key are overridden by presets later in the chain.
 */
export function resolvePresets(registry: Registry, ids: string[]): ResolvedConfig {
  const presetIds = expandChain(registry, ids);
  const presets = presetIds.map((id) => getPreset(registry, id));

  const byKey = <T>(items: T[], key: (item: T) => string) => [...new Map(items.map((i) => [key(i), i])).values()];

  return {
    presetIds,
    commands: Object.assign({}, ...presets.map((p) => p.commands ?? {})),
    conventions: unique(presets.flatMap((p) => p.conventions ?? [])),
    must: unique(presets.flatMap((p) => p.must ?? [])),
    never: unique(presets.flatMap((p) => p.never ?? [])),
    tooling: unique(presets.flatMap((p) => p.tooling ?? [])),
    docs: unique(presets.flatMap((p) => p.docs ?? [])),
    agentsMdBlocks: unique(presets.flatMap((p) => (p.agentsMd ? [p.agentsMd] : []))),
    rules: byKey(presets.flatMap((p) => p.rules), (r) => r.file),
    skills: byKey(presets.flatMap((p) => p.skills), (s) => s.name),
    files: byKey(presets.flatMap((p) => p.files), (f) => f.path),
  };
}
