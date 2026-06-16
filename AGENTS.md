## Git Publication

Use git, not a github api tool to publish changes. Push a branch to origin, which is github, but uses only git which you have permissions for. Not github.

1. Inspect the current branch, worktree, and remotes with `git status --short --branch` and `git remote -v`.
2. Create a non-default branch with a descriptive `codex/...` name.
3. Push with `git push -u origin <branch>`.
4. Verify the remote branch and commit with `git ls-remote --heads origin refs/heads/<branch>`.
