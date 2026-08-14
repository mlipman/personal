const encoder = new TextEncoder();

export const SESSION_COOKIE_NAME = "__Host-simple_log_session";
export const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

type SessionPayload = {
  exp: number;
  v: 1;
};

export async function createSessionToken(now = Date.now()): Promise<string> {
  const payload: SessionPayload = {
    exp: Math.floor(now / 1_000) + SESSION_MAX_AGE_SECONDS,
    v: 1,
  };
  const encodedPayload = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload);
  return `${encodedPayload}.${encodeBase64Url(signature)}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || token.length > 1_024) return false;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return false;

  try {
    const signature = decodeBase64Url(encodedSignature);
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      await sessionKey(),
      signature,
      encoder.encode(encodedPayload),
    );
    if (!validSignature) return false;

    const payload: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)));
    return isSessionPayload(payload) && payload.exp > Math.floor(now / 1_000);
  } catch {
    return false;
  }
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

async function sign(value: string): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign("HMAC", await sessionKey(), encoder.encode(value));
  return new Uint8Array(signature);
}

let keyPromise: Promise<CryptoKey> | undefined;

function sessionKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey(
    "raw",
    readSessionSecret(),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
  return keyPromise;
}

function readSessionSecret(): Uint8Array<ArrayBuffer> {
  const configured = process.env.SIMPLE_LOG_SESSION_SECRET;
  if (!configured) throw new Error("SIMPLE_LOG_SESSION_SECRET is required");
  const secret = decodeBase64Url(configured);
  if (secret.byteLength < 32) throw new Error("SIMPLE_LOG_SESSION_SECRET must contain at least 32 random bytes");
  return secret;
}

function isSessionPayload(value: unknown): value is SessionPayload {
  return isRecord(value) && value.v === 1 && typeof value.exp === "number" && Number.isSafeInteger(value.exp);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid base64url value");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const decoded = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) decoded[index] = binary.charCodeAt(index);
  return decoded;
}
