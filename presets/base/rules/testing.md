---
description: Testing standards — mandatory unit tests, coverage threshold, integration tests at boundaries
globs: []
alwaysApply: true
---

# Testing

## Mandatory Unit Tests
- **Every function, class, or behaviour change MUST have unit tests**. Delivering code without accompanying unit tests is strictly prohibited.
- Every behaviour change ships with unit tests. Bug fixes start with a failing test that reproduces the bug.
- Test behaviour through the public API, not implementation details.
- Structure tests as Arrange → Act → Assert; one behaviour per test.
- Test names describe the behaviour: `returns 404 when order does not exist`.
- Cover the happy path, edge cases (empty, boundary, invalid input) and error paths.
- Unit tests are fast, deterministic and isolated: no real network, clock or shared state. Fake time/randomness via injected dependencies.
- **Mandatory mocking for external boundaries**: Always mock external infrastructure, data stores, and network calls in unit tests (e.g. database/SQL/ORM, Redis/cache, message queues, third-party HTTP APIs, file systems). Unit tests must NEVER connect to a real database, Redis instance, or external network service.
- Mock only at boundaries (HTTP clients, DB, Redis, queues), never the unit under test.
- Never delete, skip or weaken an existing test to make a change pass; if a test is wrong, explain why and ask.

## Coverage
- Changed/new code reaches **≥ 80% line and branch coverage** (or the stricter threshold configured in the repo). Run tests with coverage and check it.
- Coverage is a floor, not a goal: meaningful assertions matter more than the number. Never write assertion-free tests to raise coverage.

## Beyond unit tests
- **Integration tests** for boundaries a unit test cannot prove: DB queries/migrations, HTTP handlers end-to-end, message consumers, third-party adapters (use test containers or local fakes, never shared environments).
- **Test pyramid** — many unit tests, fewer integration tests, a few end-to-end tests for critical user journeys.
- Flaky tests are bugs: fix or quarantine with an issue reference, never ignore.
- Use the `write-unit-test` skill for the workflow.
