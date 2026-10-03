# Status and upgrade: keeping a repository up to date

## In short
`agent-initiator status` tells you which of the files `init` wrote are out of date with the version you have now, without changing anything. It knows the difference between a file nobody touched (safe to update) and a file someone edited (keep it), because `init` records a fingerprint of every file it writes. It exits with code 1 when something needs attention, so it can also run in CI. `agent-initiator init --upgrade` then updates exactly the files nobody edited and adds missing ones; edited files are never overwritten.

## How it works
`init` writes `.agents/agent-initiator.json` (see [generated files](generated-files.md)) with a `sha256` hash of each file it wrote. `status` regenerates everything in memory, using the date and tools recorded in that manifest so the comparison is fair, and compares three things per file: what init wrote (A), what is on disk (B) and what this version generates (C). The version number alone is not enough: the content can change while the version stays the same.

```mermaid
flowchart TD
    S[File] --> M{On disk?}
    M -- no --> MI[missing]
    M -- yes --> N{Disk = new output?}
    N -- yes --> U[up to date]
    N -- no --> R{Recorded in manifest?}
    R -- no --> D[differs: unknown who changed it]
    R -- yes --> E{Disk = what init wrote?}
    E -- yes --> O[outdated: safe to update]
    E -- no --> C{New output = what init wrote?}
    C -- yes --> ED[edited: kept]
    C -- no --> CO[conflict: merge by hand]
```

In words: a missing file is reported first. A file that already matches the new output is up to date, whoever changed it. Without a record (a file the user already had, or a repository set up before the manifest existed) only "same or different" can be known. With a record, an untouched file is outdated when the template changed, an edited file is kept when the template did not change, and a file changed on both sides is a conflict. Files the manifest lists but this version no longer generates (for example an old `lefthook.yml`) are reported as obsolete; nothing is deleted.

| State | Meaning | Exit code |
|-------|---------|-----------|
| up to date | matches what this version generates | 0 |
| edited | you changed it; the template did not | 0 |
| differs | no record of what init wrote | 0 |
| obsolete | no longer generated; review and delete it yourself | 0 |
| outdated | untouched by you; the template changed | 1 |
| conflict | changed by you and by the template | 1 |
| missing | generated but not on disk | 1 |

For outdated, conflict and differs files, `status` writes the new content to a temp folder outside the repository and prints a `git diff --no-index -- <file> <new>` command to see the difference. Tools installed after init are listed but left out of the comparison. A new agent-initiator version always shows the generated AGENTS.md files as outdated (or in conflict, if they were edited), because their first-line marker names the version.

## Upgrading
`agent-initiator init --upgrade` (add `--dry-run` to see the plan first) uses the same comparison and:
- writes the **outdated** files with the new content and creates the **missing** ones;
- leaves **edited**, **conflict** and **differs** files alone and prints the `git diff` command for each, so you can merge by hand; **obsolete** files are only listed;
- re-checks each outdated file just before writing it and skips it when it changed since the comparison;
- updates the manifest: the new `version`, an `upgradedAt` date and new hashes for the files it wrote. `generatedAt` stays the same, because generated content (the wiki log skeleton) carries that date and later comparisons must keep regenerating with it.

Without a manifest (a repository set up before it existed) nothing can be told apart from an edited file, so only missing files are added; to start tracking, back up the agent files and run `init` again. Content is generated with the tools recorded in the manifest; tools installed later are listed but not added (back up and run `init` again to include them).

## Where it lives in the code
| What | File |
|------|------|
| The three-way comparison | `classifyFiles` in `src/status.ts` |
| The `status` command and `init --upgrade` (shared comparison) | `compareRepository`, `runStatus`, `runUpgrade` in `src/cli.ts` |
| Which files an upgrade writes; safe writing | `upgradeFiles` in `src/status.ts`, `applyUpgrade` in `src/write/index.ts` |
| Manifest after an upgrade | `upgradeManifest` in `src/render/manifest.ts` |
| Reading and checking the manifest | `readManifest` in `src/detect/initialised.ts` |
| Hashes | `contentHash` in `src/render/manifest.ts` |

## How to test it
`rtk test pnpm vitest run test/status.test.ts test/write.test.ts test/cli.e2e.test.ts`. By hand: `agent-initiator init <dir> --yes`, then `agent-initiator status <dir>` (all up to date), edit a rule and run it again.
