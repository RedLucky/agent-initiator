---
name: hono-add-endpoint
description: Add a Hono route with zod validation, service logic, error handling and app.request tests. Use when the user asks for a new endpoint in a Hono app.
---

# Add Hono Endpoint

1. **Route** — add to the feature sub-app; validate with `zValidator`.
2. **Logic** — call a service function; throw `HTTPException` for expected HTTP errors.
3. **Test** — `app.request()` for success, validation (400) and error cases.
4. Finish with `definition-of-done`.
