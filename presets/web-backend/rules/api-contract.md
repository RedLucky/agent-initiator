---
description: API contract — OpenAPI as source of truth, versioning, breaking-change detection, contract tests
globs: ["**/openapi.*", "**/swagger.*", "**/*.proto"]
alwaysApply: false
---

# API Contract

- Every HTTP API has an **OpenAPI 3 spec** (generated from code annotations/schemas or written first) committed to the repo and kept in sync; gRPC uses `.proto` files.
- The spec documents every endpoint: request/response schemas, status codes, error body, auth, pagination and examples.
- **Breaking changes** (removing/renaming fields or endpoints, making fields required, changing types or status codes) require a new API version (`/v2`) or a deprecation period — never silently.
- Detect breaking changes automatically in CI (e.g. `oasdiff`, `openapi-diff`, `buf breaking`).
- Add contract tests that validate real responses against the spec; generate clients/types from the spec instead of hand-writing them.
- Mark deprecated endpoints/fields in the spec (`deprecated: true`) with a removal date.
