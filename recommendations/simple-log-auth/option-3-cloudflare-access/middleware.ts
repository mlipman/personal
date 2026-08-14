import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

let cachedKeys: { issuer: string; keys: ReturnType<typeof createRemoteJWKSet> } | undefined;

export async function middleware(request: NextRequest) {
  const access = accessConfiguration();
  if (!access) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await jwtVerify(token, access.keys, {
      algorithms: ["RS256"],
      audience: access.audience,
      issuer: access.issuer,
    });
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

function accessConfiguration() {
  const audience = process.env.CLOUDFLARE_ACCESS_AUD;
  const configuredDomain = process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN;
  if (!audience || !configuredDomain) return null;

  const issuer = new URL(configuredDomain).origin;
  if (!cachedKeys || cachedKeys.issuer !== issuer) {
    cachedKeys = {
      issuer,
      keys: createRemoteJWKSet(new URL("/cdn-cgi/access/certs", issuer)),
    };
  }
  return { audience, issuer, keys: cachedKeys.keys };
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  runtime: "nodejs",
};
