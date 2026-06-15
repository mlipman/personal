import { buildApp } from "./app.js";
import { JobManager } from "./jobs.js";

const token = process.env.REMOTE_CONTROL_TOKEN;
if (!token || token.length < 32) {
  throw new Error("REMOTE_CONTROL_TOKEN must be set to at least 32 characters");
}

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const workspace = process.env.CODEX_WORKSPACE ?? "/root/personal";
const jobs = new JobManager({ workspace });
const app = buildApp({ token, jobs });

await app.listen({ host: "0.0.0.0", port });
