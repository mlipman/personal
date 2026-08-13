import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { stripImages } from "@/lib/log-content";

type Message = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "Chat is not configured yet." }, { status: 503 });
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !Array.isArray(body.messages) || !body.messages.every(isMessage)) return Response.json({ error: "A valid chat message is required." }, { status: 400 });
  const logs = await prisma.log.findMany({ orderBy: { createdAt: "asc" }, select: { createdAt: true, context: true } });
  const logContext = logs.map((log) => `[${formatLogDate(log.createdAt)}]\n${stripImages(log.context)}`).filter((value) => value.trim()).join("\n\n---\n\n");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.create({ model: "gpt-5.6-luna", instructions: " LOGS:\n" + logContext, input: body.messages });
  return Response.json({ message: response.output_text });
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isMessage(value: unknown): value is Message { return isRecord(value) && (value.role === "user" || value.role === "assistant") && typeof value.content === "string" && value.content.length <= 20_000; }
// Example output: Aug 12, 2026 10:45 PM
function formatLogDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("month")} ${part("day")}, ${part("year")} ${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
}
