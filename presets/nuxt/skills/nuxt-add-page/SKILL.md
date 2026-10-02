---
name: nuxt-add-page
description: Add a Nuxt page (and server API route if needed) with SSR-safe data fetching, validation and tests. Use when the user asks for a new page or endpoint in a Nuxt app.
---

# Add Nuxt Page

1. **Page** — `pages/<route>.vue` with `<script setup lang="ts">`; fetch with `useFetch`/`useAsyncData` and render pending/error/empty states.
2. **API** — if new data is needed, `server/api/<name>.<method>.ts` with `defineEventHandler`, schema validation and `createError` for failures.
3. **Meta** — `useSeoMeta`/`definePageMeta` as needed; middleware for protected pages.
4. **Design** — the ui-ux-pro-max skill (when installed) for UI decisions; reuse components.
5. **Test** — unit test server logic and component behaviour.
6. Finish with `definition-of-done`.
