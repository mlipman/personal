"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export async function login(formData: FormData): Promise<never> {
  const password = formData.get("password");
  const destination = safeDestination(formData.get("next"));

  if (typeof password !== "string" || !verifyPassword(password)) {
    const target = new URL("http://local/login");
    target.searchParams.set("error", "1");
    if (destination !== "/") target.searchParams.set("next", destination);
    redirect(target.pathname + target.search);
  }

  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1_000);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, await createSessionToken(), sessionCookieOptions(expires));
  redirect(destination);
}

export async function logout(): Promise<never> {
  const cookieStore = await cookies();
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
