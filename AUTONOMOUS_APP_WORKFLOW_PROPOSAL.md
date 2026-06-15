# Proposal: Codex App Builder and Feature Worker

## Summary

Turn the current remote prompt service into a small control plane that can:

1. Take an idea for a simple website, create a working application, test it, publish a branch, and optionally create a preview deployment.
2. Take a feature request for a registered application, reproduce its development environment, implement and test the change, then push a reviewable branch.

Codex should remain the implementation worker. A separate controller should own repository access, task isolation, secrets, deterministic quality gates, git operations, and the final decision to publish a branch.

The first useful version should be intentionally narrow:

- one active task at a time;
- GitHub repositories only;
- a single supported web stack;
- Vercel preview deployments;
- branch push only, never automatic merge or production deployment;
- registered applications only for feature work;
- private access to the control service.

## What Exists Today

The repository already has a useful starting point:

- an authenticated HTTP form and API that start `codex exec`;
- streamed JSONL output and cancellation;
- a fixed `/root/personal` workspace;
- one active job at a time;
- a project copy script;
- a Next.js, Prisma, and PostgreSQL dependency skeleton;
- a shared PostgreSQL Docker Compose definition;
- a write-enabled deploy key for this repository.

I exercised the available paths on June 15, 2026:

- `scripts/new-project.sh "A Tiny Website!"` successfully created an isolated project and replaced the package and database placeholders.
- The remote-control TypeScript code passes type checking and builds.
- The HTTP application tests pass when run without `tsx`'s IPC wrapper.
- Process-spawning job tests and a nested `codex exec` could not run inside the managed Codex session because that outer sandbox blocks the required IPC or process behavior. This is an execution-environment restriction, not evidence that the service fails on the actual host.
- Codex CLI `0.139.0` is installed and authenticated with ChatGPT.
- The CLI supports the controls needed here: a fixed working directory, sandbox selection, JSONL events, ephemeral sessions, resumable sessions, and schema-constrained final output.
- Docker is not available on the current box. This managed Codex session cannot access the host
  systemd bus, so it could not independently inspect the remote-control service state.
- The current app template is not yet bootable. It lacks application source files, linting, tests, and a pinned lockfile.

The existing service proves remote execution, but it currently treats a raw prompt and a successful Codex process exit as the whole job. That is not enough for repeatable application work.

## Core Design Decision

The controller, not Codex, decides what a successful task means.

Codex may inspect code, edit files, run development commands, interpret failures, and retry. The controller must independently enforce:

- which repository and branch may be used;
- where the task may write;
- which secrets are exposed;
- which commands are required before publication;
- whether tests actually passed;
- what files changed;
- whether a commit and push are allowed;
- that production is never modified.

A Codex process exiting with code zero means the worker finished. A task is publishable only after all configured quality gates pass.

## Proposed Architecture

### 1. Control Plane

Evolve `remote_control/server` into a durable task service.

Responsibilities:

- accept typed task requests;
- authenticate the operator;
- validate the target against an application registry;
- queue and persist tasks in SQLite;
- create an isolated checkout;
- invoke and resume Codex;
- run required checks independently;
- request a preview deployment;
- commit and push an allowed branch;
- expose logs, artifacts, status, and the final report.

The browser should become an operator console with two forms:

- **Create app**
- **Change existing app**

Keep an advanced prompt field, but construct the final worker prompt from trusted controller context plus the user's request.

### 2. Application Registry

Feature work cannot start safely from only a production URL. The controller needs the source repository, setup contract, and deployment contract.

Store one reviewed manifest per application, for example:

```yaml
id: example-app
repository: mlipman/example-app
default_branch: main
production_url: https://example.com
stack: nextjs
package_manager: pnpm
node_version: 22
setup:
  install: pnpm install --frozen-lockfile
quality_gates:
  - pnpm lint
  - pnpm typecheck
  - pnpm test
  - pnpm build
browser_tests:
  command: pnpm test:e2e
preview:
  provider: vercel
secrets_profile: example-app-development
```

Registration is a manual trust decision. The service must reject arbitrary repository URLs supplied in a task request.

### 3. Isolated Task Workspaces

Do not run application tasks directly in `/root/personal`.

Use a dedicated non-root service account and create a clean checkout per task:

```text
/srv/codex/
  control/
  registry/
  tasks/<task-id>/
    repo/
    artifacts/
    task.json
```

Each task starts from the latest configured default branch and creates a predictable branch such as:

```text
codex/<task-id>-<short-slug>
```

The controller should reject dirty starting states, prevent writes outside the task directory, and remove credentials from the checkout after publication.

### 4. Worker Contract

Invoke Codex with:

- the task checkout as `-C`;
- `workspace-write` sandboxing;
- no interactive approvals;
- JSONL output;
- an output schema for the final report;
- a generated prompt containing the task, app manifest, constraints, and required checks.

The structured final report should include:

```json
{
  "summary": "Implemented the requested change",
  "checks_run": ["pnpm test", "pnpm build"],
  "known_issues": [],
  "manual_review_notes": ["Verify mobile navigation"],
  "ready_for_controller_checks": true
}
```

Codex's report is advisory. The controller reruns every manifest quality gate after the worker stops.

### 5. GitHub Integration

The current deploy key can push only to `mlipman/personal`. It cannot support feature work across multiple application repositories.

Recommended progression:

1. During the MVP, use a fine-grained GitHub token limited to explicitly selected repositories and contents write access.
2. Replace it with a GitHub App when multiple repositories are routinely managed.

The controller should own git publication. Codex should not receive the GitHub credential.

Publication rules:

- fetch the latest default branch before starting;
- never force-push;
- never push to the default branch;
- stop if the base branch moved in a way that prevents a clean update;
- commit only after controller checks pass;
- push exactly one task branch;
- optionally open a draft pull request containing the report and preview URL;
- never merge.

### 6. Deployment and Browser Testing

For greenfield applications, use Vercel's Git integration so a pushed branch produces a preview deployment. For existing applications, reuse the registered repository's preview setup.

Testing policy:

- production URL checks are read-only smoke tests;
- state-changing browser tests run against local or preview environments;
- production credentials are never given to Codex;
- a task may compare production behavior with preview behavior, but may not deploy to production;
- failure to obtain a preview is visible and blocks tasks that require browser verification.

Playwright should be part of the supported starter and used for:

- homepage and critical-route smoke tests;
- the specific feature's acceptance path;
- screenshots attached as task artifacts;
- console-error and failed-request detection.

## Task Lifecycles

### Greenfield Website

1. Operator submits an idea, app name, and optional constraints.
2. Controller validates the name and creates a task record.
3. Controller creates a new repository or a project from the supported starter.
4. Codex turns the idea into a short implementation plan and builds the app.
5. Codex runs checks and repairs failures.
6. Controller independently runs install, lint, type checking, tests, and build.
7. Controller commits and pushes a task branch.
8. Vercel creates a preview deployment.
9. Controller runs Playwright against the preview.
10. If preview checks fail, Codex is resumed with the failures and may retry within a configured attempt and time budget.
11. Controller pushes the repaired branch and returns the branch, preview URL, checks, screenshots, and known issues.

For the MVP, creating the code in a repository is enough. Automatic Vercel project creation can follow after branch publication is reliable.

### Existing Application Feature

1. Operator selects a registered app and submits a feature request.
2. Controller clones the registered source repository and records the exact base commit.
3. Controller runs baseline install and checks before any edits.
4. If the baseline is already broken, the task stops or records an explicitly approved exception.
5. Codex inspects the app, implements the feature, and tests locally.
6. Controller runs all registered quality gates.
7. Controller pushes a task branch and obtains a preview.
8. Playwright runs the feature acceptance path against the preview.
9. Failures are returned to the same Codex session for a bounded repair loop.
10. On success, the controller publishes the branch and task report for review.

The production deployment is useful for read-only comparison, but the source repository and preview environment are mandatory for safe feature development.

## Replace the Current Template

The existing `templates/nextjs-prisma-pg` directory should become a complete, version-pinned starter rather than a package list.

Minimum contents:

- Next.js App Router application with a real homepage;
- TypeScript strict mode;
- pinned Node and pnpm versions;
- committed lockfile;
- ESLint;
- unit test runner;
- Playwright configuration and one smoke test;
- Prisma only when persistence is requested, or a clean optional database module;
- health endpoint;
- `.env.example` with descriptions but no secret values;
- scripts for `lint`, `typecheck`, `test`, `test:e2e`, and `build`;
- a Dockerfile or documented local runtime;
- Vercel-compatible defaults;
- an `AGENTS.md` describing the project checks and boundaries.

The greenfield workflow should copy this starter, then let Codex modify it. This makes success measurable and keeps every generated app operationally familiar.

## API Shape

Replace the raw prompt-only request with typed task creation:

```json
{
  "type": "feature",
  "app_id": "example-app",
  "request": "Add CSV export to the transactions page",
  "acceptance_criteria": [
    "Export respects the current filters",
    "Downloaded file includes a header row"
  ]
}
```

Greenfield example:

```json
{
  "type": "create_app",
  "name": "neighborhood-tool-share",
  "idea": "A simple site where neighbors list tools they are willing to lend",
  "requirements": [
    "Mobile friendly",
    "Email sign-in",
    "PostgreSQL persistence"
  ]
}
```

Suggested states:

```text
queued
preparing
baseline_checks
implementing
controller_checks
previewing
browser_checks
repairing
ready
failed
cancelled
```

Persist state and events so a service restart does not erase task history.

## Security Requirements

The current plain-HTTP, root-run bearer-token service is acceptable only as a short experiment. It should not be the foundation for broader repository and deployment access.

Before enabling multi-repository work:

- put the service behind Tailscale or HTTPS with an authenticated reverse proxy;
- run it as a dedicated non-root user;
- remove public inbound access to port `8787`;
- allowlist repositories through reviewed manifests;
- store encrypted or root-readable secret profiles outside git;
- inject only the secrets required by the selected application;
- keep GitHub and Vercel credentials in the controller process, not the Codex process;
- redact secrets from streamed logs and persisted events;
- set task time, disk, output, and retry limits;
- retain an audit record of request, base commit, commands, results, commit, and actor;
- never mount the Docker socket into a Codex-controlled container;
- never provide production database write credentials.

Containers can improve dependency isolation later, but they are not a substitute for these controls. A dedicated low-value development box remains appropriate.

## Failure and Retry Policy

Automation should fail visibly instead of pushing questionable work.

Do not publish when:

- baseline setup cannot be reproduced;
- required tests or build fail;
- the task changed forbidden files;
- secrets appear in the diff;
- the branch cannot be updated without force;
- preview acceptance tests fail after the retry budget;
- Codex reports unresolved issues marked as blocking;
- cancellation was requested.

Keep the failed workspace for a short retention period so logs and artifacts can be inspected. Provide a deliberate "resume task" action that reuses the Codex session and checkout.

## Implementation Plan

### Phase 0: Finish the Host

- Install Docker and the Compose plugin.
- Configure and start the existing PostgreSQL service only if the starter needs it.
- Configure the remote-control `.env`.
- Install, build, and start the systemd service.
- Put access behind Tailscale or HTTPS before adding more credentials.

Exit condition: the current prompt service survives reboot and can execute a harmless repository inspection job.

### Phase 1: Reliable Single-Repository Tasks

- Add SQLite persistence and task states.
- Introduce typed task requests.
- Create an isolated checkout per task.
- Add an application manifest for `mlipman/personal`.
- Move commit and push operations into the controller.
- Add controller-owned quality gates and a structured Codex output schema.
- Show branch, commit, diff summary, logs, and check results in the UI.

Exit condition: a request can modify a test fixture repository and push a non-default branch only when checks pass.

### Phase 2: Greenfield Website Builder

- Replace the template with a bootable, pinned starter.
- Add greenfield task intake.
- Add repository creation or a clearly defined monorepo project mode.
- Add Vercel preview integration.
- Add Playwright preview checks and screenshots.
- Add bounded Codex repair loops.

Exit condition: an idea produces a branch and working preview with all checks recorded.

### Phase 3: Existing App Features

- Add reviewed app manifests and per-app secret profiles.
- Add baseline checks.
- Add production read-only smoke tests.
- Add per-app preview and browser-test commands.
- Add fine-grained multi-repository GitHub access, then migrate to a GitHub App.

Exit condition: a feature request against a registered deployed app produces a tested branch and preview without production write access.

### Phase 4: Operational Hardening

- Add a queue with one active task per app and a small global concurrency limit.
- Add disk and workspace cleanup.
- Add metrics, alerts, log retention, and backup of task metadata.
- Add cost and time budgets.
- Add draft pull request creation and status checks.
- Add dependency and secret scanning.

## MVP Acceptance Criteria

The first release is complete when all of the following are true:

- The service is private, durable across reboot, and does not run as root.
- The operator can select `create app` or `feature`.
- Feature tasks can target only registered repositories.
- Every task uses a clean isolated checkout and records its base commit.
- Codex cannot access the GitHub push credential.
- Required checks are run by the controller after Codex finishes.
- Failed checks prevent commit and push.
- Successful work is pushed only to a new `codex/...` branch.
- The UI reports the branch, commit, changed files, check results, preview URL when available, and known issues.
- No workflow can merge or deploy to production.
- Restarting the service preserves task state and logs.

## Recommended First Build

Implement Phase 1 before expanding the prompt UI or adding more infrastructure. The highest-value next slice is:

1. SQLite-backed typed tasks.
2. An isolated checkout for each task.
3. A manifest with explicit quality gates.
4. Controller-owned commit and branch push.
5. A structured final report.

That slice converts the current remote shell-like prompt launcher into a trustworthy branch-producing worker. Once branch publication is deterministic, the greenfield starter, Vercel previews, Playwright checks, and additional application repositories can be added without changing the core trust model.
