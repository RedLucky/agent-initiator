---
name: fastapi-add-endpoint
description: Add a FastAPI endpoint with Pydantic schemas, service layer, dependency injection and tests. Use when the user asks for a new route or API endpoint in a FastAPI app.
---

# Add FastAPI Endpoint

0. **Read** the official FastAPI skill bundled with the installed package (AGENTS.md → Framework docs).
1. **Schemas** — request/response Pydantic models in the feature's `schemas.py` (no Ellipsis defaults, no `RootModel`).
2. **Router** — add the path operation with a return type annotation (`response_model` only if the public schema differs), status code, and `Annotated` dependency aliases for session/auth.
3. **Service** — business logic in `service.py`; raise domain errors/`HTTPException`.
4. **Test** — `TestClient` with dependency overrides: success, 422 validation, not found/forbidden.
5. Finish with `definition-of-done`.
