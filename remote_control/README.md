# Codex Remote Control

Small authenticated HTTP service that starts Codex jobs on this server. It serves a browser form,
streams Codex JSONL output, allows cancellation, and permits one job at a time.

Codex runs in `/root/personal` by default with `workspace-write` sandboxing and no interactive
approval prompts. The browser cannot choose the workspace or pass arbitrary Codex options.

## Security Model

This is deliberately a simple, root-run, plain-HTTP service.

**The bearer token is effectively remote command access to this box.** Anyone who obtains it can
ask Codex to edit files and run commands allowed by the Codex sandbox. Plain HTTP also means the
token is not encrypted in transit. Use a long random token, do not reuse it, and do not expose this
service on a machine containing important data.

The safer future upgrade is HTTPS through a domain and reverse proxy, or private access through
Tailscale.

## Runtime Choices

- Node.js is the JavaScript runtime.
- pnpm installs dependencies and runs package scripts.
- TypeScript provides static checking and compiles to JavaScript.
- Fastify provides the HTTP server.
- systemd keeps the process running after logout and restarts it after failure or reboot.

## Fresh Box Setup

These commands target Ubuntu 24.04 and install Node.js 22 from NodeSource:

```bash
apt-get update
apt-get install -y ca-certificates curl ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
corepack enable
corepack prepare pnpm@10.12.1 --activate
node --version
pnpm --version
```

Install and build this service:

```bash
cd /root/personal/remote_control/server
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
```

On the first install there is no lockfile yet, so use `pnpm install` once. Commit the generated
`pnpm-lock.yaml`; subsequent installs should use `pnpm install --frozen-lockfile`.

Codex must be installed and logged in for the same Linux user that runs the service:

```bash
codex --version
codex login status
```

## Configuration

Create a local environment file and generate a random token:

```bash
cd /root/personal/remote_control/server
cp .env.example .env
TOKEN="$(openssl rand -hex 32)"
sed -i "s/replace-with-a-long-random-token/$TOKEN/" .env
chmod 600 .env
printf '%s\n' "$TOKEN"
```

Save the printed token in a password manager. `.env` is ignored by Git.

Available settings:

```dotenv
REMOTE_CONTROL_TOKEN=at-least-32-characters
PORT=8787
CODEX_WORKSPACE=/root/personal
```

`CODEX_WORKSPACE` is fixed by the server operator. API clients cannot override it.

## Run Manually

```bash
cd /root/personal/remote_control/server
pnpm dev
```

Open `http://162.243.205.126:8787`, enter the token, and submit a prompt. The page stores the token
in that browser's local storage.

For a production-style local check:

```bash
pnpm build
pnpm start
```

## Install The systemd Service

```bash
cp /root/personal/remote_control/server/codex-remote-control.service \
  /etc/systemd/system/codex-remote-control.service
systemctl daemon-reload
systemctl enable --now codex-remote-control
systemctl status codex-remote-control
```

After code changes:

```bash
cd /root/personal/remote_control/server
pnpm install --frozen-lockfile
pnpm test
pnpm build
systemctl restart codex-remote-control
```

Logs and service controls:

```bash
journalctl -u codex-remote-control -f
systemctl restart codex-remote-control
systemctl stop codex-remote-control
```

## Firewall

Keep SSH available before enabling UFW:

```bash
ufw allow OpenSSH
ufw allow 8787/tcp
ufw enable
ufw status
```

DigitalOcean may also have a cloud firewall. If one is enabled, allow inbound TCP port `8787` there
as well.

## API

Health does not require authentication:

```bash
curl http://162.243.205.126:8787/health
```

Create a job:

```bash
TOKEN='the-token-from-server-env'
curl -sS http://162.243.205.126:8787/api/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Inspect the repo and summarize its current state."}'
```

Use the returned ID to inspect, stream, or cancel it:

```bash
JOB_ID='returned-job-id'
curl -sS "http://162.243.205.126:8787/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN"
curl -N "http://162.243.205.126:8787/api/jobs/$JOB_ID/events" \
  -H "Authorization: Bearer $TOKEN"
curl -X DELETE "http://162.243.205.126:8787/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Jobs and output are held in memory. Restarting the service clears job history.

## Troubleshooting

- `401 Unauthorized`: the browser or API token does not match `REMOTE_CONTROL_TOKEN`.
- `409 A Codex job is already running`: wait for it to finish or cancel it.
- `spawn codex ENOENT`: check the systemd `PATH` and `/root/.local/bin/codex`.
- Codex authentication errors: run `codex login status` as root and log in again if needed.
- Browser cannot connect: check `systemctl status`, `journalctl`, UFW, and the DigitalOcean firewall.
- Build works but the page is missing: start the process with
  `/root/personal/remote_control/server` as its working directory.
