# Getting started

> For new developers. Replace the guidance with real steps and commands (keep the `rtk` prefix from AGENTS.md).

## In short
How to get {{projectName}} running on your machine, check that it works, and make your first change.

## Requirements
Tools and versions you need installed (runtime, package manager, database, …) and the required agent tooling listed in AGENTS.md.

## Install and run
The exact commands, in order, from a fresh clone to a running project.

## Test
How to run the tests and what "passing" looks like.

## Git hooks
Git hooks live in `.git/` and are not committed, so run these once after cloning:
1. `graphify hook install` — keeps the code graph that AI agents query up to date. `graphify hook status` shows whether it is installed.
2. `lefthook install` — activates the hooks in `lefthook.yml`: lint and the commit message check before each commit, typecheck and tests before each push, and the graph refresh after every commit.

Never skip the hooks with `--no-verify`; fix what they report.

## Your first change
The workflow: plan the task, make the change with tests and doc comments, update the wiki page of the topic, pass the Definition of Done, then ask for commit approval.
