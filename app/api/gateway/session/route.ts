import { NextRequest, NextResponse } from "next/server";
import {
  createGatewaySession,
  GATEWAY_SESSION_COOKIE,
  GATEWAY_SESSION_MAX_AGE,
} from "../../../../lib/gateway-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyC0DAIT0cVPD4WFpfgqrn0lfb-kyFRsnWM";
const FIREBASE_PROJECT_ID = "omeryigitler-5abfb";
const STARTPAGE_ORIGIN = "https://start.omeryigitler.com";
const GATEWAY_URL = "https://omeryigitler.com/start-gateway.html";

function safeReturnTarget(value: string | null) {
  try {
    const target = new URL(value || `${STARTPAGE_ORIGIN}/`);
    return target.origin === STARTPAGE_ORIGIN ? target : new URL(`${STARTPAGE_ORIGIN}/`);
  } catch {
    return new URL(`${STARTPAGE_ORIGIN}/`);
  }
}

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function exchangeCustomToken(customToken: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => ({}));
  return response.ok && data.idToken ? String(data.idToken) : "";
}

function gatewayRedirect() {
  return NextResponse.redirect(new URL(GATEWAY_URL), 303);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let idToken = "";
  let customToken = "";
  let returnValue: string | null = null;

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    idToken = String(body.idToken || "");
    customToken = String(body.customToken || "");
    returnValue = body.return ? String(body.return) : null;
  } else {
    const form = await request.formData();
    idToken = String(form.get("idToken") || "");
    customToken = String(form.get("customToken") || "");
    returnValue = form.get("return") ? String(form.get("return")) : null;
  }

  const returnTarget = safeReturnTarget(returnValue);
  if ((!idToken && !customToken) || idToken.length > 12000 || customToken.length > 12000) {
    return gatewayRedirect();
  }

  if (!idToken && customToken) {
    idToken = await exchangeCustomToken(customToken);
  }
  if (!idToken) return gatewayRedirect();

  const verification = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );

  const verifiedData = await verification.json().catch(() => ({}));
  const user = verifiedData.users?.[0];
  const claims = decodeJwtPayload(idToken);
  const issuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
  const uid = String(user?.localId || claims?.sub || "");
  const isGatewayAdmin =
    verification.ok &&
    Boolean(user) &&
    claims?.aud === FIREBASE_PROJECT_ID &&
    claims?.iss === issuer &&
    claims?.admin === true &&
    claims?.role === "admin" &&
    /^(?:passkey_admin_primary|telegram_admin_)/.test(uid);

  if (!isGatewayAdmin) return gatewayRedirect();

  const session = await createGatewaySession(uid);
  const response = NextResponse.redirect(returnTarget, 303);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(GATEWAY_SESSION_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: GATEWAY_SESSION_MAX_AGE,
  });
  return response;
}
