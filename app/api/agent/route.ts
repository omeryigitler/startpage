import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_REFRESH_SKEW_MS,
  isAdminEmail,
  refreshGoogleIdentity,
  type TaurusJwt,
} from "../../../lib/auth";

export const dynamic = "force-dynamic";

const GET_ACTIONS = new Set(["status", "todos", "agenda"]);
const POST_ACTIONS = new Set(["command", "approve", "todo", "event"]);
const REQUEST_TIMEOUT_MS = 25_000;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function googleIdentity(request: NextRequest) {
  const raw = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!raw || !isAdminEmail(typeof raw.email === "string" ? raw.email : null)) return null;

  let token = raw as TaurusJwt;
  if (
    !token.googleIdToken
    || !token.googleTokenExpiresAt
    || Date.now() >= token.googleTokenExpiresAt - GOOGLE_REFRESH_SKEW_MS
  ) {
    token = await refreshGoogleIdentity(token);
  }
  return token.googleIdToken ? token : null;
}

async function proxy(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action")?.trim().toLowerCase() || "";
  const allowed = request.method === "GET" ? GET_ACTIONS : POST_ACTIONS;
  if (!allowed.has(action)) return json(404, { ok: false, code: "unknown_action", error: "Bilinmeyen agent işlemi." });

  const identity = await googleIdentity(request);
  if (!identity?.googleIdToken) {
    return json(401, {
      ok: false,
      code: "agent_login_required",
      error: "Taurus Agent için Google yönetici oturumunu yenileyin.",
      signInUrl: "/giris",
    });
  }

  const baseUrl = (process.env.TAURUS_AGENT_BASE_URL || "https://omeryigitler.com").replace(/\/$/, "");
  const target = `${baseUrl}/api/agent?action=${encodeURIComponent(action)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const body = request.method === "POST" ? await request.text() : undefined;
    const response = await fetch(target, {
      method: request.method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Google-ID-Token": identity.googleIdToken,
      },
      body: body || undefined,
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({
      ok: false,
      code: "invalid_agent_response",
      error: "Taurus Agent geçersiz bir yanıt döndürdü.",
    }));
    return json(response.status, payload as Record<string, unknown>);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return json(504, { ok: false, code: "agent_timeout", error: "Taurus Agent yanıtı zaman aşımına uğradı." });
    }
    console.error("Taurus Agent proxy failed", error);
    return json(502, { ok: false, code: "agent_unreachable", error: "Taurus Agent servisine ulaşılamadı." });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}
