---
description: Fastify conventions — plugins/encapsulation, schema validation, error handler, request.log
globs: ["src/**"]
alwaysApply: false
---

# Fastify

- Organise features as plugins (`fastify.register`) and respect encapsulation; shared decorators via `fastify-plugin`.
- Every route declares a `schema` (body/params/querystring/response) — use a type provider (TypeBox/zod) for typed handlers. Schemas drive both validation and fast serialisation, so define them first.
- Use async hooks and handlers (return values instead of calling `reply.send` in async handlers); prefer official `@fastify/*` plugins over ad-hoc code.
- Response schemas prevent leaking internal fields; always define them.
- Use `request.log`/`fastify.log` (built-in pino); no `console.log`.
- Central `setErrorHandler` maps errors to the standard error body; use `@fastify/sensible` `httpErrors` for HTTP errors.
- Build the app in a `buildApp()` function and test with `app.inject()`.
