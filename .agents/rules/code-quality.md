---
description: Code quality baseline — clean, SOLID, DRY, KISS, readable, no AI slop or over-engineering
globs: []
alwaysApply: true
---

# Code Quality

## Principles
- **KISS** — the simplest design that fully meets the requirement. No speculative flexibility.
- **DRY** — extract shared logic once it is used in two or more real places; not before.
- **SOLID** — one responsibility per module/class/function; depend on interfaces at boundaries (I/O, network, time, randomness) so code stays testable.
- **YAGNI** — do not build for hypothetical future needs.
- **No abstractions for single-use code** — no interfaces, factories, generics or config options for something used once; no premature "flexibility" nobody asked for. (Baseline even without ponytail installed.)

## No AI slop
- No vague or filler code: every line has a purpose you can explain.
- No placeholder logic (`// TODO: implement`), fake data or silently stubbed branches in delivered code.
- No wrapper layers that only forward calls. No "manager/helper/util" dumping grounds.
- No hedging comments ("this might work", "should be fine"). Verify instead.
- If 200 lines could be 50, write the 50.

## Readability (beginner-friendly)
- Small functions (aim for < 40 lines) with one level of abstraction each.
- Early returns instead of deep nesting (max ~3 levels).
- Descriptive names over abbreviations (`invoiceTotal`, not `it`/`tmp`).
- No magic numbers/strings: use named constants.
- Prefer explicit, boring code over clever one-liners.

## Comments
- Every exported function/class/module gets a short doc comment: what it does, key params, errors thrown.
- Inline comments explain **why** (business rule, constraint, trade-off, workaround link) — never restate the code.
- Only comment new or changed code; do not rewrite comments in untouched code.
- Keep comments true: update or delete them when the code changes.
