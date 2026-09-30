---
description: Vue 3 conventions — Composition API with script setup, SFC naming, composables, Pinia
globs: ["src/**/*.vue", "src/**/*.ts", "src/**/*.js"]
alwaysApply: false
---

# Vue 3

- Use `<script setup lang="ts">` with the Composition API; type props with `defineProps<...>()` and emits with `defineEmits<...>()`.
- Component files `PascalCase.vue`, multi-word names (`OrderList.vue`, not `List.vue`).
- Reusable stateful logic goes in composables `useX` under `src/composables/`.
- Shared state in Pinia stores (`useOrderStore`); keep component-local state local.
- **Props down, events up**: never mutate props; emit events. Use `v-model` only for genuine two-way contracts, and provide/inject for deep dependencies instead of prop drilling.
- Keep source state minimal (`ref`/`reactive`) and derive everything else with `computed`.
- Keep root and route components thin; split components by concern.
- Make it correct first; optimise only after measuring.
- `v-for` always with a stable `:key`; never combine `v-if` and `v-for` on the same element.
- Only `VITE_*` env vars reach the browser — no secrets.
- Test components with Vue Test Utils/Testing Library by user-visible behaviour.
