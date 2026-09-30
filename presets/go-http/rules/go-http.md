---
description: Go HTTP service conventions — handler/service/repository, request validation, context, graceful shutdown
globs: ["**/*.go"]
alwaysApply: false
---

# Go HTTP Service

- Layers: `internal/<feature>/{handler.go, service.go, repository.go}`; handlers only decode, validate, call the service and encode.
- Decode JSON with size limits and validate input (e.g. `go-playground/validator`) before calling the service.
- Map domain errors to status codes in one place (error-to-response helper).
- Pass `r.Context()` down to every I/O call; set timeouts on the server and outbound clients.
- Middleware for request ID, structured `slog` request logging, panic recovery and auth.
- Graceful shutdown on SIGINT/SIGTERM with `server.Shutdown(ctx)`.
- Test handlers with `httptest.NewRecorder` and fake services (interfaces defined by the consumer).
