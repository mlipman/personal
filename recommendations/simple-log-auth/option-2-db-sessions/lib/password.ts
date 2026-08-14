import { scrypt, timingSafeEqual } from "node:crypto";

export async function verifyPassword(candidate: string): Promise<boolean> {
  const configured = process.env.SIMPLE_LOG_PASSWORD_HASH;
  if (!configured) throw new Error("SIMPLE_LOG_PASSWORD_HASH is required");
  if (candidate.length > 1_024) return false;

  const [algorithm, nText, rText, pText, saltText, expectedText, extra] = configured.split("$");
  if (algorithm !== "scrypt" || !nText || !rText || !pText || !saltText || !expectedText || extra) {
    throw new Error("SIMPLE_LOG_PASSWORD_HASH has an invalid format");
  }

  const N = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (N !== 16_384 || r !== 8 || p !== 1) throw new Error("Unsupported scrypt parameters");

  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(expectedText, "base64url");
  if (salt.length !== 16 || expected.length !== 32) throw new Error("Invalid scrypt hash lengths");
  const actual = await derive(candidate, salt, expected.length, { N, p, r });
  return timingSafeEqual(actual, expected);
}

function derive(password: string, salt: Buffer, length: number, options: { N: number; p: number; r: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, length, { ...options, maxmem: 64 * 1024 * 1024 }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}
