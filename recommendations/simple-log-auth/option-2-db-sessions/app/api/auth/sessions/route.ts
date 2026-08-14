import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { findValidDeviceSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const current = await findValidDeviceSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.authSession.findMany({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, expiresAt: true, id: true, label: true },
    where: { expiresAt: { gt: new Date() } },
  });
  return Response.json({ sessions: sessions.map((session) => ({ ...session, current: session.id === current.id })) });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const current = await findValidDeviceSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.id !== "string" || !isUuid(body.id)) {
    return Response.json({ error: "A session id is required." }, { status: 400 });
  }
  const result = await prisma.authSession.deleteMany({ where: { id: body.id } });
  if (body.id === current.id) {
    cookieStore.set(SESSION_COOKIE_NAME, "", {
      expires: new Date(0),
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  }
  return Response.json({ revoked: result.count === 1 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
