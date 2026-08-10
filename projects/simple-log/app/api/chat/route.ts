import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { stripImages } from "@/lib/log-content";

type Message = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "Chat is not configured yet." }, { status: 503 });
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !Array.isArray(body.messages) || !body.messages.every(isMessage)) return Response.json({ error: "A valid chat message is required." }, { status: 400 });
  const logs = await prisma.log.findMany({ orderBy: { createdAt: "asc" }, select: { createdAt: true, context: true } });
  const logContext = logs.map((log) => `[${log.createdAt.toISOString()}]\n${stripImages(log.context)}`).filter((value) => value.trim()).join("\n\n---\n\n");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.create({ model: "gpt-5-mini", instructions: "Answer using the user's log archive below. Be concise, say when the logs do not contain the answer, and never claim to inspect images.\n\nLOG ARCHIVE:\n" + logContext, input: body.messages.slice(-20) });
  return Response.json({ message: response.output_text });
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isMessage(value: unknown): value is Message { return isRecord(value) && (value.role === "user" || value.role === "assistant") && typeof value.content === "string" && value.content.length <= 20_000; }
