---
description: Go conventions — naming, package layout, error wrapping, slog logging, table-driven tests
globs: ["**/*.go"]
alwaysApply: false
---

# Go

## Naming
- `MixedCaps`; exported identifiers start upper case. Short names for short scopes (`i`, `r`), descriptive for wider scope.
- Package names: short, lowercase, singular, no underscores (`order`, not `order_utils`). Avoid `util`/`common`.
- Files: `snake_case.go`; tests `<file>_test.go` in the same package.
- Interfaces named by behaviour (`Reader`, `OrderStore`), defined where they are consumed.

## Layout
- `cmd/<app>/main.go` for binaries, `internal/` for private packages. Keep `main` thin: wire config, deps and start.

## Errors
- Always check errors. Wrap with context: `fmt.Errorf("load order %s: %w", id, err)`.
- Sentinel errors (`var ErrNotFound = errors.New(...)`) and `errors.Is`/`errors.As` for branching.
- No `panic` for expected failures.
- Pass `context.Context` as the first parameter for I/O; respect cancellation.

## Logging
- `log/slog` with structured attributes (`slog.String("order_id", id)`); JSON handler in production.

## Tests
- Table-driven tests with `t.Run`; `t.Helper()` in helpers; `httptest` for handlers.
- Keep `gofmt` and `go vet` clean.
