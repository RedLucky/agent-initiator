---
name: express-add-endpoint
description: Add an Express API endpoint with schema validation, service logic, central error handling and supertest tests. Use when the user asks for a new route or API endpoint in an Express app.
---

# Add Express Endpoint

1. **Route** — add to the feature router (`<feature>.routes`) with the validation middleware.
2. **Controller** — parse validated input, call the service, send status + JSON. No business logic here.
3. **Service** — business logic; throw typed errors (e.g. `NotFoundError`) handled by the central error middleware.
4. **Test** — supertest: success, validation error (400), not found/forbidden cases.
5. Finish with `definition-of-done`.
