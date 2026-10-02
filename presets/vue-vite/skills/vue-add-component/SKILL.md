---
name: vue-add-component
description: Create a Vue 3 single-file component with typed props/emits, accessible markup and a behaviour test. Use when the user asks for a new Vue component or screen section.
---

# Add Vue Component

1. **Reuse first** — check existing components and composables.
2. **Create** `PascalCase.vue` with `<script setup lang="ts">`, typed `defineProps`/`defineEmits`.
3. **Logic** — move reusable stateful logic into a `useX` composable; shared state into a Pinia store.
4. **Markup** — semantic and accessible; use the ui-ux-pro-max skill for design decisions when it is installed.
5. **States** — loading, empty and error for async data.
6. **Test** — render + main interaction.
7. Finish with `definition-of-done`.
