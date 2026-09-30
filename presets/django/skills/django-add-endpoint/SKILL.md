---
name: django-add-endpoint
description: Add a Django view/API endpoint (model, migration, serializer, URL, tests) following project conventions. Use when the user asks for a new page, endpoint or resource in a Django project.
---

# Add Django Endpoint

1. **Model** (if needed) — add fields, then `makemigrations` and review the migration.
2. **Service** — business logic outside the view.
3. **Serializer/Form** — validate input.
4. **View** — thin; permission classes/login required; correct status codes.
5. **URL** — register in the app's `urls.py`.
6. **Test** — success, validation error, permission denied.
7. Finish with `definition-of-done`.
