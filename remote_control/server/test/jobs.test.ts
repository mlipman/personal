import assert from "node:assert/strict";
import test from "node:test";
import { JobManager } from "../src/jobs.js";

async function waitForFinished(manager: JobManager, id: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const status = manager.get(id)?.status;
    if (status !== "running" && status !== "cancelling") return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("job did not finish");
}

test("runs one job and records output", async () => {
  const manager = new JobManager({
    workspace: process.cwd(),
    codexCommand: process.execPath,
    codexArgs: ["-e", "process.stdin.resume(); process.stdin.on('end', () => console.log('done'))"]
  });
  const job = manager.create("test prompt");
  await waitForFinished(manager, job.id);

  assert.equal(manager.get(job.id)?.status, "succeeded");
  assert.match(
    manager.getEvents(job.id)?.map((event) => event.data).join("") ?? "",
    /done/
  );
});

test("rejects overlap while a process is running or cancelling", async () => {
  const manager = new JobManager({
    workspace: process.cwd(),
    codexCommand: process.execPath,
    codexArgs: ["-e", "setInterval(() => {}, 1000)"]
  });
  const job = manager.create("test prompt");
  assert.throws(() => manager.create("ignored"), /already running/);

  manager.cancel(job.id);
  assert.equal(manager.get(job.id)?.status, "cancelling");
  assert.throws(() => manager.create("ignored"), /already running/);
  await waitForFinished(manager, job.id);
  assert.equal(manager.get(job.id)?.status, "cancelled");
});
