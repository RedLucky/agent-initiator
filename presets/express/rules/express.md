---
description: Express conventions — routers, controllers/services, validation middleware, central error handler
globs: ["src/**", "routes/**", "*.js", "*.ts"]
alwaysApply: false
---

# Express

- Structure by feature: `src/<feature>/{<feature>.routes, <feature>.controller, <feature>.service}`; `app` setup separate from `server.listen` so the app is testable.
- Validate `req.body/params/query` with a schema middleware (zod/joi) before the controller.
- Async handlers must forward errors (`next(err)` or Express 5 native promise support); never leave unhandled rejections.
- One central error-handling middleware maps errors to status codes and the standard error body; it logs once.
- Security middleware: `helmet`, CORS allow-list, body size limits, rate limiting on auth routes.
- Request logging with `pino-http` (request ID per request).
- Test routes with `supertest` against the exported `app`.
