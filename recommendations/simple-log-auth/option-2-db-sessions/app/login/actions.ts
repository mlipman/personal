"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createDeviceSession, findValidDeviceSession, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function login(formData: FormData): Promise<never> {
  const password = formData.get("password");
  const destination = safeDestination(formData.get("next"));
  if (typeof password !== "string" || !(await verifyPassword(password))) {
    const target = new URL("http://local/login");
    target.searchParams.set("error", "1");
    if (destination !== "/") target.searchParams.set("next", destination);
    redirect(target.pathname + target.search);
  }

  const requestHeaders = await headers();
  const session = await createDeviceSession(requestHeaders.get("user-agent"));
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.token, sessionCookieOptions(session.expires));
  redirect(destination);
}

export async function logout(): Promise<never> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await findValidDeviceSession(token);
  if (session) await prisma.authSession.deleteMany({ where: { id: session.id } });
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
  redirect("/login");
}

function safeDestination(value: FormDataEntryValue | null): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
