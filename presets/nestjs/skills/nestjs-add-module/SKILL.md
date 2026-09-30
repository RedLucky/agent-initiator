---
name: nestjs-add-module
description: Scaffold a NestJS feature module (module, controller, service, DTOs, tests) following project conventions. Use when the user asks for a new resource, feature or endpoint group in a NestJS app.
---

# Add NestJS Module

1. **Mirror** an existing module's structure and naming.
2. **Create** `src/<feature>/` with `<feature>.module.ts`, `.controller.ts`, `.service.ts`, `dto/create-<feature>.dto.ts` (validated with class-validator).
3. **Controller** — routes, status codes, DTOs only; delegate to the service.
4. **Service** — business logic; throw Nest exceptions / domain errors; log with `Logger`.
5. **Register** the module in `AppModule` (or the parent module).
6. **Test** — `<feature>.service.spec.ts` with mocked dependencies; controller spec for status codes/validation.
7. Finish with `definition-of-done`.
