import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";

const token = "a".repeat(32);
const fakeJobs = {
  create: (prompt: string) => ({
    id: "job-1",
    status: "running" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    prompt
  }),
  get: () => undefined,
  getEvents: () => undefined,
  subscribe: () => undefined,
  cancel: () => undefined
};

test("health endpoint is public", async () => {
  const app = buildApp({ token, jobs: fakeJobs });
  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  await app.close();
});

test("API requires the bearer token", async () => {
  const app = buildApp({ token, jobs: fakeJobs });
  const response = await app.inject({
    method: "POST",
    url: "/api/jobs",
    payload: { prompt: "test" }
  });
  assert.equal(response.statusCode, 401);
  await app.close();
});

test("authenticated request creates a job", async () => {
  const app = buildApp({ token, jobs: fakeJobs });
  const response = await app.inject({
    method: "POST",
    url: "/api/jobs",
    headers: { authorization: `Bearer ${token}` },
    payload: { prompt: "test" }
  });
  assert.equal(response.statusCode, 202);
  assert.equal(response.json().id, "job-1");
  await app.close();
});

test("rejects short, empty, and oversized prompts", async () => {
  const app = buildApp({ token, jobs: fakeJobs });
  const headers = { authorization: `Bearer ${token}` };

  const empty = await app.inject({
    method: "POST",
    url: "/api/jobs",
    headers,
    payload: { prompt: "  " }
  });
  assert.equal(empty.statusCode, 400);

  const oversized = await app.inject({
    method: "POST",
    url: "/api/jobs",
    headers,
    payload: { prompt: "x".repeat(20_001) }
  });
  assert.equal(oversized.statusCode, 400);
  await app.close();
});
