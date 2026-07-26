import { NextRequest, NextResponse } from "next/server";
import { GATEWAY_SESSION_COOKIE, verifyGatewaySession } from "./lib/gateway-session";

function isPublicPath(pathname: string) {
  const nextAsset = pathname === "/_next" || pathname.startsWith("/_next/");
  const nextAuth = pathname === "/api/auth" || pathname.startsWith("/api/auth/");
  const gatewaySession = pathname === "/api/gateway/session";
  const staticAsset = /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?)$/i.test(pathname);
  return nextAsset || nextAuth || gatewaySession || staticAsset;
}

function gatewayRedirect(request: NextRequest) {
  const gateway = new URL("https://omeryigitler.com/start-gateway.html");
  gateway.searchParams.set("return", request.nextUrl.toString());
  const response = NextResponse.redirect(gateway);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function forbidden() {
  return NextResponse.json(
    { error: "Bu işlem yalnızca passkey / Face ID oturumunda kullanılabilir." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(GATEWAY_SESSION_COOKIE)?.value;
  const session = await verifyGatewaySession(token);
  if (!session) return gatewayRedirect(request);

  if (session.scope === "workspace") {
    if (pathname.startsWith("/yonetim")) {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      home.search = "?gatewayScope=workspace";
      return NextResponse.redirect(home);
    }

    const stateMutation = pathname === "/api/state" && request.method !== "GET";
    const stateInitialization = pathname === "/api/state" && searchParams.get("initialize") === "1";
    if (stateMutation || stateInitialization) return forbidden();
  }

  const response = NextResponse.next();
  response.headers.set("X-Taurus-Provider", session.provider);
  response.headers.set("X-Taurus-Scope", session.scope);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
