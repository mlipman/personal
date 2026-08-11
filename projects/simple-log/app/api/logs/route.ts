import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.context !== "string") return Response.json({ error: "A text log is required." }, { status: 400 });
  const context = body.context.trim();
  if (!context || context.length > 100_000) return Response.json({ error: "Logs must be between 1 and 100,000 characters." }, { status: 400 });
  const log = await prisma.log.create({ data: { context } });
  return Response.json({ ...log, createdAt: log.createdAt.toISOString() }, { status: 201 });
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
