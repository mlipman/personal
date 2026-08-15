import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://possible-futures.test/", {
      headers: { accept: "text/html", "x-forwarded-host": "possible-futures.test", "x-forwarded-proto": "http" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the election outcome explorer", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Possible Futures · 2026 Election Outcomes<\/title>/i);
  assert.match(html, /How many Senate seats do Democrats win/);
  assert.match(html, /How many House seats do Democrats win/);
  assert.match(html, /Who controls the two chambers/);
  assert.match(html, /56% Democratic Senate control/);
  assert.match(html, /86% Democratic House control/);
  assert.match(html, /Democratic sweep/);
  assert.match(html, /Silver Bulletin Deluxe/);
  assert.match(html, /One point, three outcomes/);
  assert.equal((html.match(/type="range"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /A square, pulled toward the diagonal|Six races, sixty-four combinations|Illustrative probabilities/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("emits host-aware social metadata", async () => {
  const html = await (await render()).text();
  assert.match(html, /http:\/\/possible-futures\.test\/og\.png/);
  assert.match(html, /summary_large_image/);
  assert.match(html, /Possible Futures percentile outcome spectrum/);
});
