import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "__Host-simple_log_session";
export const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export async function createDeviceSession(label: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1_000);

  await prisma.$transaction([
    prisma.authSession.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
    prisma.authSession.create({
      data: {
        expiresAt: expires,
        label: label?.slice(0, 200) || null,
        tokenHash: hashSessionToken(token),
      },
    }),
  ]);

  return { expires, token };
}

export async function findValidDeviceSession(token: string | undefined) {
  if (!token || token.length > 128) return null;
  const session = await prisma.authSession.findUnique({ where: { tokenHash: hashSessionToken(token) } });
  if (!session) return null;
  if (session.expiresAt > new Date()) return session;
  await prisma.authSession.delete({ where: { id: session.id } }).catch(() => undefined);
  return null;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function sessionCookieOptions(expires: Date) {
  return {
    expires,
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: true,
  };
}
