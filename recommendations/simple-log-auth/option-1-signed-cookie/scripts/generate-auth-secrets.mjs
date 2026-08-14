import { randomBytes, scryptSync } from "node:crypto";

const N = 16_384;
const r = 8;
const p = 1;
const password = randomBytes(18).toString("base64url");
const salt = randomBytes(16);
const derived = scryptSync(password, salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 });
const passwordHash = ["scrypt", N, r, p, salt.toString("base64url"), derived.toString("base64url")].join("$");

console.log("Save this password in the password manager; it will not be stored in Vercel:");
console.log(password);
console.log("\nAdd these values to .env.local and to Vercel Preview + Production:");
console.log(`SIMPLE_LOG_PASSWORD_HASH='${passwordHash}'`);
console.log(`SIMPLE_LOG_SESSION_SECRET='${randomBytes(32).toString("base64url")}'`);
