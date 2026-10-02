---
name: go-add-handler
description: Add a Go HTTP handler with validation, service logic, error mapping and httptest tests. Use when the user asks for a new endpoint in a Go service.
---

# Add Go Handler

1. **Service** — add the method to the feature service; accept `context.Context`; return wrapped errors.
2. **Handler** — decode + validate input, call the service, map errors to status codes, encode JSON.
3. **Route** — register in the router with the existing middleware chain.
4. **Test** — table-driven `httptest` tests: success, invalid input, not found, internal error.
5. Run the `lint` (go vet) and `test` commands exactly as AGENTS.md writes them; finish with `definition-of-done`.
