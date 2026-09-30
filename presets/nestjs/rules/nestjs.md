---
description: NestJS conventions — feature modules, DI, DTO validation, exceptions, Logger, testing
globs: ["src/**/*.ts", "test/**/*.ts"]
alwaysApply: false
---

# NestJS

- One feature module per domain: `src/<feature>/{<feature>.module.ts, <feature>.controller.ts, <feature>.service.ts, dto/, entities/}`.
- File naming `<name>.<type>.ts` (`order.service.ts`, `create-order.dto.ts`); classes `PascalCase` with type suffix (`OrderService`).
- Controllers handle HTTP only; business logic lives in services; data access in repositories/providers.
- Inject dependencies via constructors; never `new` a provider manually.
- Validate every input with DTO classes + `class-validator` and a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` (or zod pipes if the repo uses them).
- Throw Nest `HttpException` subclasses (`NotFoundException`) from services/controllers, or domain errors mapped by an exception filter.
- Use `Logger` (`private readonly logger = new Logger(OrderService.name)`) or the configured pino logger — no `console.log`.
- Config via `@nestjs/config` with schema validation.
- Unit test services with `Test.createTestingModule` and mocked providers; e2e test controllers with supertest.
