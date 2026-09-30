---
description: React conventions — function components, hooks, state, effects, Vite env vars
globs: ["src/**/*.tsx", "src/**/*.jsx"]
alwaysApply: false
---

# React (Vite)

- Function components only; `PascalCase` component files (`OrderList.tsx`), hooks `useCamelCase` in `use-*.ts`/`useX.ts` per repo convention.
- Follow the Rules of Hooks; keep effects for synchronising with external systems only — derive state during render instead.
- Custom hooks encapsulate reusable stateful logic (data fetching, subscriptions).
- Use the project's data-fetching library (e.g. TanStack Query) instead of ad-hoc `useEffect` + `fetch`.
- Stable `key`s from data IDs, never array indexes for dynamic lists.
- Only `VITE_*` env vars are exposed to the browser — never put secrets there.
- Organise by feature: `src/features/<feature>/{components,hooks,api}`.
- Test components with Testing Library by user-visible behaviour (roles, text), not implementation details.

## Performance (from Vercel's React best practices, highest impact first)
- Eliminate async waterfalls: fire independent requests together (`Promise.all`), `await` only where the value is needed.
- Code-split routes and heavy components with `React.lazy` + `<Suspense>`.
- Import directly from modules instead of barrel files (`index.ts` re-exports) to keep bundles small.
- Optimise re-renders only after measuring (React DevTools Profiler); prefer moving state down or lifting content up over blanket `memo`.
