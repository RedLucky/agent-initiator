---
description: Hono conventions — route grouping, zod-validator, HTTPException, runtime-safe code
globs: ["src/**"]
alwaysApply: false
---

# Hono

- Group routes per feature with `new Hono()` sub-apps mounted via `app.route('/orders', orders)`.
- **Chain** route definitions (`new Hono().get(...).post(...)`) and export the app type so Hono RPC (`hc<AppType>`) infers request/response types.
- Build middleware with `createMiddleware` (code before `await next()` runs on the request, after it on the response); share env/binding types with `createFactory()`.
- Validate input with `@hono/zod-validator` (`zValidator('json', schema)`) and read via `c.req.valid('json')`.
- Throw `HTTPException` for HTTP errors; handle everything else in `app.onError` with the standard error body.
- Keep code runtime-agnostic when targeting edge runtimes (no Node-only APIs unless the runtime supports them); access env/bindings via `c.env`.
- Use a logger middleware with request IDs.
- Test with `app.request()`.
