---
description: FastAPI conventions (aligned with the official FastAPI skill) — Annotated dependencies, return types, APIRouter, fastapi CLI
globs: ["**/*.py"]
alwaysApply: false
---

# FastAPI

Aligned with the official skill shipped inside the installed package (see AGENTS.md → Framework docs); that skill wins when it differs.

## Structure
- One `APIRouter` per feature (`app/<feature>/router.py`) with `service.py`, `schemas.py`, `repository.py`. Declare `prefix`, `tags` and shared dependencies on the `APIRouter`, not on every route.
- One HTTP method per path-operation function.
- Declare the app entrypoint in `pyproject.toml` (`[tool.fastapi] entrypoint = "app.main:app"`) and run it with `fastapi dev` (local) / `fastapi run` (production).

## Parameters & dependencies
- Always use `Annotated` for parameters and dependencies: `item_id: Annotated[int, Path(ge=1)]`, `q: Annotated[str | None, Query(max_length=50)] = None`.
- Create reusable type aliases for dependencies: `CurrentUserDep = Annotated[User, Depends(get_current_user)]`. Inject DB sessions, settings and auth this way; no module-level global state.
- Do not use `...` (Ellipsis) as a default for required parameters or model fields, and do not use `RootModel`; use `Annotated` types instead.

## Responses
- Prefer a **return type annotation** (`-> Item`): it validates, filters, documents and serialises the response.
- Use `response_model` only when the returned object differs from the public schema you want to expose.
- Do not use `ORJSONResponse`/`UJSONResponse` (deprecated); declared return types let Pydantic serialise on the Rust side.
- Server-Sent Events: `response_class=EventSourceResponse` with `yield`.

## Async
- Use plain `def` by default; use `async def` only when the code awaits truly non-blocking I/O. Never call blocking I/O inside `async def`.

## Errors & settings
- Raise `HTTPException` (or domain exceptions mapped with `@app.exception_handler`) with correct status codes.
- Settings via `pydantic-settings`; secrets from env only.

## Tooling & tests
- uv, Ruff, `ty`/mypy, HTTPX; SQLModel when the project uses it.
- Test with `TestClient` (or `httpx.AsyncClient`) and `app.dependency_overrides`.
