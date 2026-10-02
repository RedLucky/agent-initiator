# FAQ

## In short
Answers to common questions and fixes for common problems when using or developing agent-initiator.

## Using the tool

### `npx agent-initiator` says 404 / not found
The package is not on npm yet. Install it from a clone with `pnpm link --global`; see [getting started](getting-started.md).

### `pnpm link --global` fails with ERR_PNPM_NO_GLOBAL_BIN_DIR
Run `pnpm setup` once, then `source ~/.bashrc` (or open a new terminal) and link again.

### The project was created inside the wrong folder
`init <name>` creates `<name>` relative to the folder your terminal is in. Run it from the intended parent folder or pass a full path.

### My existing AGENTS.md was not changed
That is intended: existing files are never overwritten. `init` prints the Rules and Skills sections you can paste in yourself.

### `init --yes` stops with "stack not detected"
The folder is empty. Add `--framework`, `--apps` or `--preset`, or run without `--yes` to answer the questions.

### Scaffolding stopped halfway
The error names the failed command and the folder with partial files. Delete that folder and run again. Missing tools are reported before anything is written.

### moon says "No tasks found" or "ambiguous argument 'HEAD'"
moon needs at least one git commit and tasks in each project's `moon.yml`. Make the first commit and run `moon setup`; see [scaffolding](features/scaffolding.md).

### My repository already has CI. Will init add another one?
No. If init finds existing CI (GitHub workflows, `.gitlab-ci.yml`, Jenkins, CircleCI, Azure, Bitbucket, Travis), it writes no CI file and lists what it found. Add ours anyway with `--ci github` or `--ci gitlab`; existing files are still never overwritten. See [quality gates](features/quality-gates.md).

### CI fails at install with a lockfile or "ignored builds" error
CI installed a different pnpm or yarn version than yours. Pin yours in package.json: `npm pkg set packageManager=pnpm@$(pnpm -v)`; see [quality gates](features/quality-gates.md).

### `doctor` shows a red cross
That helper tool is not installed. `doctor` prints the install command; nothing is installed automatically.

## Developing the tool

### A requirement test fails after I edited a rule
`test/requirements.test.ts` protects the rules agreed with the product owner. Either restore the wording or, if the change is intended, update the guard in the same task.

### A snapshot test fails
Run `rtk test pnpm vitest run -u` only when the output change is intended, and review the snapshot diff before committing.
