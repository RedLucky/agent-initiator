---
description: Django conventions — apps per domain, fat models/services, migrations, DRF serializers, settings
globs: ["**/*.py", "**/templates/**"]
alwaysApply: false
---

# Django

- One Django app per domain; keep business logic in services/model methods, not in views or serializers.
- Every model change ships with a migration (`makemigrations`); never edit applied migrations.
- Use the ORM with `select_related`/`prefetch_related` to avoid N+1 queries; raw SQL only parameterised.
- DRF (if used): serializers validate input; viewsets/permissions enforce auth on every endpoint.
- Settings split per environment; secrets from env; `DEBUG=False` and strict `ALLOWED_HOSTS` in production.
- Use Django's `logging` config with per-module loggers.
- Tests with `TestCase`/pytest-django; factories for data.
