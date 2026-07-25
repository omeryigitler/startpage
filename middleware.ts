import { NextRequest, NextResponse } from "next/server";
import { GATEWAY_SESSION_COOKIE, verifyGatewaySession } from "./lib/gateway-session";

const PUBLIC_PATH_PREFIXES = [
  "/api/auth",
  "/api/gateway/session",
  "/_next",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?)$/i.test(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const session = request.cookies.get(GATEWAY_SESSION_COOKIE)?.value;
  if (await verifyGatewaySession(session)) return NextResponse.next();

  const gateway = new URL("https://omeryigitler.com/start-gateway.html");
  gateway.searchParams.set("return", request.nextUrl.toString());
  return NextResponse.redirect(gateway);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
