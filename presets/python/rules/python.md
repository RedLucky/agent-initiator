---
description: Python conventions — PEP 8 naming, type hints, exceptions, logging, pytest
globs: ["**/*.py"]
alwaysApply: false
---

# Python

## Naming (PEP 8)
- `snake_case` functions, variables, modules and files; `PascalCase` classes; `UPPER_SNAKE_CASE` constants.
- Private helpers prefixed `_`. Packages are short lowercase names.
- Tests: `tests/test_<module>.py`, functions `test_<behaviour>`.

## Code
- Type hints on all public functions; keep `mypy` clean. Use `pydantic`/dataclasses for structured data.
- Format and lint with `ruff`; follow the repo's configured line length.
- Use context managers (`with`) for files, locks, connections.
- Read settings once (e.g. `pydantic-settings`) and pass them down; no scattered `os.environ` reads.

## Errors & logging
- Raise specific exceptions (custom subclasses for domain errors); chain with `raise NewError(...) from err`.
- Catch the narrowest exception possible; never bare `except:`.
- `logger = logging.getLogger(__name__)` per module (or `structlog`); use `logger.exception` inside `except` to keep the traceback. No `print` in production code.

## Tests
- `pytest` with fixtures; parametrize edge cases with `@pytest.mark.parametrize`.

## Documentation & Comments (Docstrings)
- **Mandatory docstrings**: Use PEP 257 docstrings (`"""..."""`) on all functions, classes, methods, modules, and data models: detail purpose, `Args:`, `Returns:`, and `Raises:`.
- **Specific inline comments**: Use targeted inline comments (`# ...`) to explain non-obvious logic, business rules, or edge case handling.
