import { createPublicKey, verify as verifySignature } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  createGatewaySession,
  GATEWAY_SESSION_COOKIE,
  GATEWAY_SESSION_MAX_AGE,
} from "../../../../lib/gateway-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIREBASE_PROJECT_ID = "omeryigitler-5abfb";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const STARTPAGE_ORIGIN = "https://start.omeryigitler.com";
const GATEWAY_URL = "https://omeryigitler.com/start-gateway.html";
const MAX_AUTH_AGE_SECONDS = 10 * 60;

type FirebaseHeader = {
  alg?: string;
  kid?: string;
};

type FirebaseClaims = {
  aud?: string;
  iss?: string;
  sub?: string;
  user_id?: string;
  exp?: number;
  iat?: number;
  auth_time?: number;
  admin?: boolean;
  role?: string;
};

type FirebaseJwk = JsonWebKey & { kid?: string };

let cachedKeys: { expiresAt: number; keys: Map<string, FirebaseJwk> } | null = null;

function safeReturnTarget(value: string | null) {
  try {
    const target = new URL(value || `${STARTPAGE_ORIGIN}/`);
    return target.origin === STARTPAGE_ORIGIN ? target : new URL(`${STARTPAGE_ORIGIN}/`);
  } catch {
    return new URL(`${STARTPAGE_ORIGIN}/`);
  }
}

function decodeJwtPart<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function cacheLifetime(response: Response) {
  const match = response.headers.get("cache-control")?.match(/max-age=(\d+)/i);
  const seconds = match ? Number(match[1]) : 3600;
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 3600_000;
}

async function getFirebaseKeys() {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;

  const response = await fetch(FIREBASE_JWKS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Firebase signing keys unavailable (${response.status})`);

  const data = (await response.json()) as { keys?: FirebaseJwk[] };
  const keys = new Map<string, FirebaseJwk>();
  for (const key of data.keys || []) {
    if (key.kid) keys.set(key.kid, key);
  }
  if (!keys.size) throw new Error("Firebase signing keys response was empty");

  cachedKeys = {
    keys,
    expiresAt: Date.now() + cacheLifetime(response),
  };
  return keys;
}

async function verifyFirebaseIdToken(idToken: string) {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;

  const header = decodeJwtPart<FirebaseHeader>(parts[0]);
  const claims = decodeJwtPart<FirebaseClaims>(parts[1]);
  if (!header || !claims || header.alg !== "RS256" || !header.kid) return null;

  const now = Math.floor(Date.now() / 1000);
  const uid = String(claims.sub || claims.user_id || "");
  const validClaims =
    claims.aud === FIREBASE_PROJECT_ID &&
    claims.iss === FIREBASE_ISSUER &&
    typeof claims.exp === "number" &&
    claims.exp > now &&
    typeof claims.iat === "number" &&
    claims.iat <= now + 60 &&
    typeof claims.auth_time === "number" &&
    claims.auth_time >= now - MAX_AUTH_AGE_SECONDS &&
    claims.admin === true &&
    claims.role === "admin" &&
    /^(?:passkey_admin_primary|telegram_admin_)/.test(uid);

  if (!validClaims) return null;

  const keys = await getFirebaseKeys();
  const jwk = keys.get(header.kid);
  if (!jwk) {
    cachedKeys = null;
    const refreshedKeys = await getFirebaseKeys();
    const refreshedJwk = refreshedKeys.get(header.kid);
    if (!refreshedJwk) return null;
    return verifyTokenSignature(parts, refreshedJwk) ? { uid, claims } : null;
  }

  return verifyTokenSignature(parts, jwk) ? { uid, claims } : null;
}

function verifyTokenSignature(parts: string[], jwk: FirebaseJwk) {
  try {
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    return verifySignature(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      Buffer.from(parts[2], "base64url"),
    );
  } catch {
    return false;
  }
}

function failureResponse(reason: string) {
  const safeReason = reason.replace(/[^A-Z0-9 _-]/gi, "").slice(0, 80);
  return new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gateway Session Error</title><style>html,body{height:100%;margin:0;background:#050505;color:#f3f3ed;font-family:monospace}body{display:grid;place-items:center}.p{width:min(420px,84vw);padding:36px;border:1px solid #665800;border-radius:24px;text-align:center}.g{color:#FFD700;letter-spacing:.18em}.r{color:#999;font-size:12px;margin:20px 0 28px}a{display:inline-block;color:#050505;background:#FFD700;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700}</style></head><body><main class="p"><div class="g">TAURUS SESSION REJECTED</div><div class="r">${safeReason}</div><a href="${GATEWAY_URL}">RETURN TO GATEWAY</a></main></body></html>`,
    {
      status: 401,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let idToken = "";
  let returnValue: string | null = null;

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    idToken = String(body.idToken || "");
    returnValue = body.return ? String(body.return) : null;
  } else {
    const form = await request.formData();
    idToken = String(form.get("idToken") || "");
    returnValue = form.get("return") ? String(form.get("return")) : null;
  }

  if (!idToken || idToken.length > 12000) return failureResponse("SECURE TOKEN MISSING");

  try {
    const verified = await verifyFirebaseIdToken(idToken);
    if (!verified) return failureResponse("TOKEN SIGNATURE OR ADMIN CLAIMS INVALID");

    const session = await createGatewaySession(verified.uid);
    const response = NextResponse.redirect(safeReturnTarget(returnValue), 303);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(GATEWAY_SESSION_COOKIE, session, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: GATEWAY_SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error("Startpage gateway session failed:", error);
    return failureResponse("SESSION VERIFICATION SERVICE UNAVAILABLE");
  }
}
