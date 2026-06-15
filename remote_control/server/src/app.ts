import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { JobManager, type JobEvent } from "./jobs.js";

export interface AppOptions {
  token: string;
  jobs: Pick<JobManager, "create" | "get" | "getEvents" | "subscribe" | "cancel">;
  indexPath?: string;
}

const defaultIndexPath = resolve(process.cwd(), "public/index.html");

function tokenMatches(expected: string, supplied: string | undefined): boolean {
  if (!supplied?.startsWith("Bearer ")) return false;
  const actual = Buffer.from(supplied.slice("Bearer ".length));
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export function buildApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: true, bodyLimit: 32 * 1024 });

  app.get("/", async (_request, reply) => {
    const html = await readFile(options.indexPath ?? defaultIndexPath, "utf8");
    return reply.type("text/html; charset=utf-8").send(html);
  });

  app.get("/health", async () => ({ ok: true }));

  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/api/")) return;
    if (!tokenMatches(options.token, request.headers.authorization)) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });

  app.post<{ Body: { prompt?: unknown } }>("/api/jobs", async (request, reply) => {
    const prompt = request.body?.prompt;
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return reply.code(400).send({ error: "prompt must be a non-empty string" });
    }
    if (prompt.length > 20_000) {
      return reply.code(400).send({ error: "prompt must be at most 20,000 characters" });
    }

    try {
      return reply.code(202).send(options.jobs.create(prompt));
    } catch (error) {
      return reply.code(409).send({ error: (error as Error).message });
    }
  });

  app.get<{ Params: { id: string } }>("/api/jobs/:id", async (request, reply) => {
    const job = options.jobs.get(request.params.id);
    return job ?? reply.code(404).send({ error: "Job not found" });
  });

  app.get<{ Params: { id: string } }>("/api/jobs/:id/events", async (request, reply) => {
    const events = options.jobs.getEvents(request.params.id);
    if (!events) return reply.code(404).send({ error: "Job not found" });

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });

    let closed = false;
    let heartbeat: NodeJS.Timeout | undefined;
    let unsubscribe: (() => void) | undefined;
    const close = () => {
      if (closed) return;
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
      reply.raw.end();
    };
    const send = (event: JobEvent) => {
      if (closed) return;
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      const job = options.jobs.get(request.params.id);
      if (job && job.status !== "running" && job.status !== "cancelling") {
        setImmediate(close);
      }
    };
    for (const event of events) send(event);

    if (!closed) {
      unsubscribe = options.jobs.subscribe(request.params.id, send);
      heartbeat = setInterval(() => reply.raw.write(": heartbeat\n\n"), 15_000);
      request.raw.on("close", close);

      const job = options.jobs.get(request.params.id);
      if (!job || (job.status !== "running" && job.status !== "cancelling")) close();
    }
  });

  app.delete<{ Params: { id: string } }>("/api/jobs/:id", async (request, reply) => {
    const job = options.jobs.cancel(request.params.id);
    return job ?? reply.code(404).send({ error: "Job not found" });
  });

  return app;
}
