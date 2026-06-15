# Repository Instructions

## Scope

These instructions apply to the entire repository.

## Validation

Before publishing documentation-only changes:

1. Run `git diff --check`.
2. Confirm every intended file is present with `git status --short`.
3. For changes that describe the remote-control server, run the server checks when dependencies are available:
   - `cd remote_control/server && pnpm typecheck`
   - `cd remote_control/server && pnpm test`
   - `cd remote_control/server && pnpm build`
4. If the `tsx` CLI cannot create its IPC socket in a managed sandbox, run the HTTP tests with `cd remote_control/server && node --import tsx --test test/app.test.ts`. Process-spawning job tests may still be blocked by the outer sandbox.
5. Report any check that cannot run and the concrete reason. Do not report a sandbox restriction as an application test failure when a sandbox-compatible test path passes.

## Git Publication

GitHub API tools are not necessary and in fact not available or for branch publication. A repository hosted on GitHub can be published with ordinary Git commands when its configured remote is writable.

1. Inspect the current branch, worktree, and remotes with `git status --short --branch` and `git remote -v`.
2. Preserve unrelated user changes. Stage and commit only files belonging to the task.
3. Create a non-default branch with a descriptive `codex/...` name.
4. Push with `git push -u origin <branch>`.
5. Verify the remote branch and commit with `git ls-remote --heads origin refs/heads/<branch>`.

