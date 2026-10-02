---
description: TypeScript conventions — strict typing, runtime validation at boundaries, type naming
globs: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
alwaysApply: false
---

# TypeScript

- `strict: true`; no `any`. Use `unknown` for untrusted data and narrow it.
- Validate external data (HTTP bodies, env, JSON, third-party APIs) at runtime with a schema library (e.g. `zod`) and derive types from the schema (`z.infer`).
- Types/interfaces `PascalCase`, no `I` prefix. Generic params descriptive (`TItem`) when more than one.
- Prefer `type` unions and discriminated unions for state (`{ status: 'ok'; data } | { status: 'error'; error }`) over optional-field soup.
- Explicit return types on exported functions.
- `readonly` for data that must not change; `as const` for literal tables.
- Prefer `import type` for type-only imports.
- No enums unless the codebase already uses them; prefer string literal unions.
- Avoid type assertions (`as`); if unavoidable, add a comment explaining why it is safe.
- **Mandatory JSDoc**: Document all functions, classes, methods, interfaces, type aliases, and object schemas with JSDoc (`/** ... */`): explain purpose, generic parameters, `@param`, `@returns`, and `@throws`.
- **Specific inline comments**: Use targeted inline comments to explain non-obvious type narrowing, business rules, or why a type assertion is safe.
