---
description: Nuxt 3 conventions — pages, auto-imports, useFetch/useAsyncData, server routes, runtimeConfig
globs: ["pages/**", "components/**", "composables/**", "server/**", "app/**", "nuxt.config.*"]
alwaysApply: false
---

# Nuxt 3

- File-based routing in `pages/`; `kebab-case` route files, dynamic params `[id].vue`.
- Components in `components/` (auto-imported, `PascalCase`); composables `useX` in `composables/`.
- Fetch data with `useFetch`/`useAsyncData` (SSR-safe), always handling `pending` and `error`.
- Server API in `server/api/*.ts` with `defineEventHandler`; validate input (`readValidatedBody`) and throw `createError` with proper status codes.
- Config via `runtimeConfig`: secrets only in the private part; `public` keys reach the browser.
- Guard pages with route middleware; never rely on client checks for authorisation.
- Follow the Vue 3 rules for components (script setup, typed props, props down/events up, Pinia).
- Use the official Nuxt MCP server (AGENTS.md → Framework docs) to check APIs for the installed Nuxt major before writing code.
