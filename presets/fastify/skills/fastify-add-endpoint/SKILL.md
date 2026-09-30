---
name: fastify-add-endpoint
description: Add a Fastify route with request/response schemas, service logic and inject-based tests. Use when the user asks for a new endpoint in a Fastify app.
---

# Add Fastify Endpoint

1. **Plugin** — add the route inside the feature plugin.
2. **Schema** — body/params/query and response schemas with the project's type provider.
3. **Handler** — call a service; throw HTTP errors via `httpErrors`/typed errors; log with `request.log`.
4. **Test** — `app.inject()` for success, validation failure and error cases.
5. Finish with `definition-of-done`.
