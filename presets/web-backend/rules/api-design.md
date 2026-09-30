---
description: Backend/API standards — HTTP API design, validation, error responses, auth, persistence, observability
globs: []
alwaysApply: false
---

# Backend & API

## HTTP API
- Resource-oriented URLs with plural nouns (`/orders/{id}`); verbs via HTTP methods.
- Correct status codes: 200/201/204 success, 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 422 semantic errors, 500 unexpected.
- One consistent error body, e.g. `{ "error": { "code": "ORDER_NOT_FOUND", "message": "...", "requestId": "..." } }`.
- Validate request body, params and query with a schema at the controller/handler boundary.
- Paginate list endpoints; never return unbounded collections.
- Version public APIs (`/v1`) and keep changes backward compatible.

## Layers
- Handler/controller (HTTP only) → service (business logic) → repository (data access). No DB calls from handlers.

## Data
- Use migrations for every schema change; never edit applied migrations.
- Transactions around multi-step writes; idempotency for retries/webhooks.
- Parameterised queries only.

## Security
- AuthN/AuthZ checked server-side for every protected route. Rate-limit auth and expensive endpoints.

## Observability
- Structured request logging with request ID; health endpoint (`/health`); timeouts on all outbound calls.
