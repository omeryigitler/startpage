import { NextRequest, NextResponse } from "next/server";
import {
  createGatewaySession,
  GATEWAY_SESSION_COOKIE,
  type GatewayProvider,
  type GatewayScope,
} from "../../../../lib/gateway-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STARTPAGE_ORIGIN = "https://start.omeryigitler.com";
const GATEWAY_ORIGIN = "https://omeryigitler.com";
const GATEWAY_URL = `${GATEWAY_ORIGIN}/start-gateway.html`;

function safeReturnTarget(value: string | null) {
  try {
    const target = new URL(value || `${STARTPAGE_ORIGIN}/`);
    return target.origin === STARTPAGE_ORIGIN ? target : new URL(`${STARTPAGE_ORIGIN}/`);
  } catch {
    return new URL(`${STARTPAGE_ORIGIN}/`);
  }
}

function gatewayRedirect(returnTarget?: URL) {
  const gateway = new URL(GATEWAY_URL);
  if (returnTarget) gateway.searchParams.set("return", returnTarget.toString());
  return NextResponse.redirect(gateway, 303);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let handoffToken = "";
  let verifier = "";
  let returnValue: string | null = null;

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    handoffToken = String(body.handoffToken || "");
    verifier = String(body.verifier || "");
    returnValue = body.return ? String(body.return) : null;
  } else {
    const form = await request.formData();
    handoffToken = String(form.get("handoffToken") || "");
    verifier = String(form.get("verifier") || "");
    returnValue = form.get("return") ? String(form.get("return")) : null;
  }

  const returnTarget = safeReturnTarget(returnValue);
  if (
    !/^[A-Za-z0-9_-]{40,100}$/.test(handoffToken) ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)
  ) {
    return gatewayRedirect(returnTarget);
  }

  try {
    const redeemResponse = await fetch(`${GATEWAY_ORIGIN}/api/gateway-handoff?action=redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handoffToken,
        verifier,
        target: "startpage",
      }),
      cache: "no-store",
    });
    const redeemed = await redeemResponse.json().catch(() => ({}));

    if (!redeemResponse.ok || redeemed.verified !== true) {
      return gatewayRedirect(returnTarget);
    }

    const provider = String(redeemed.provider || "") as GatewayProvider;
    const scope = String(redeemed.scope || "") as GatewayScope;
    const uid = String(redeemed.uid || "");
    const valid =
      /^(?:passkey_admin_primary|telegram_admin_)/.test(uid) &&
      ["passkey", "telegram"].includes(provider) &&
      ["full", "workspace"].includes(scope) &&
      ((provider === "passkey" && scope === "full") ||
        (provider === "telegram" && scope === "workspace"));

    if (!valid) return gatewayRedirect(returnTarget);

    const requestedMaxAge = Number(redeemed.sessionMaxAge || 0);
    const { token, maxAge } = await createGatewaySession({
      uid,
      provider,
      scope,
      maxAge: requestedMaxAge,
    });

    const response = NextResponse.redirect(returnTarget, 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(GATEWAY_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return response;
  } catch (error) {
    console.error("Startpage gateway session failed:", error);
    return gatewayRedirect(returnTarget);
  }
}
