# Catatan Perubahan

Entri terbaru di atas. Format:

```
## YYYY-MM-DD — <type>(#<issue>|TASK-<n>): <subject>
- Apa: ...
- Kenapa: ...
- File: ...
```

## 2026-09-30 — docs(TASK-1): add architecture page and dogfood agent config
- Apa: Menjalankan agent-initiator pada repo ini sendiri, menambahkan konteks khusus repo ke AGENTS.md, halaman wiki arsitektur, dan graph graphify (di-ignore git). README ditulis ulang (why / what / how).
- Kenapa: Memakai aturan kita sendiri saat mengembangkan tool ini dan mempermudah onboarding.
- File: AGENTS.md, docs/wiki/{en,id}/architecture.md, README.md, .gitignore

## 2026-09-30 — chore: initialise agent configuration
- Apa: Menambahkan AGENTS.md, rules/skills .agents dan wiki ini melalui agent-initiator.
- Kenapa: Memberi AI coding assistant aturan, batasan, dan alur kerja yang konsisten.
- File: AGENTS.md, CLAUDE.md, .agents/, .claude/skills/, docs/wiki/
