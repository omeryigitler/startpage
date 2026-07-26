const encoder = new TextEncoder();

export const GATEWAY_SESSION_COOKIE = "__Host-startpage_gateway";
const GATEWAY_SESSION_VERSION = 1;

export type GatewayProvider = "passkey" | "telegram";
export type GatewayScope = "full" | "workspace";

export type GatewaySession = {
  ver: number;
  uid: string;
  provider: GatewayProvider;
  scope: GatewayScope;
  iat: number;
  exp: number;
  nonce: string;
};

function encodeBase64Url(value: string) {
  const bytes = encoder.encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function randomNonce() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sessionSecret() {
  const secret = process.env.GATEWAY_SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("GATEWAY_SESSION_SECRET or NEXTAUTH_SECRET must contain at least 32 characters");
  }
  return secret;
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return encodeBase64Url(String.fromCharCode(...new Uint8Array(signature)));
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function providerScopePairIsValid(provider: GatewayProvider, scope: GatewayScope) {
  return (
    (provider === "passkey" && scope === "full") ||
    (provider === "telegram" && scope === "workspace")
  );
}

export async function createGatewaySession(input: {
  uid: string;
  provider: GatewayProvider;
  scope: GatewayScope;
  maxAge: number;
}) {
  if (!/^(?:passkey_admin_primary|telegram_admin_[A-Za-z0-9_-]{1,128})$/.test(input.uid)) {
    throw new Error("Invalid gateway session identity");
  }
  if (!providerScopePairIsValid(input.provider, input.scope)) {
    throw new Error("Invalid gateway provider/scope combination");
  }

  const providerLimit = input.provider === "passkey" ? 12 * 60 * 60 : 60 * 60;
  const maxAge = Math.max(60, Math.min(Number(input.maxAge) || 0, providerLimit));
  const now = Date.now();
  const payload: GatewaySession = {
    ver: GATEWAY_SESSION_VERSION,
    uid: input.uid,
    provider: input.provider,
    scope: input.scope,
    iat: now,
    exp: now + maxAge * 1000,
    nonce: randomNonce(),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = await sign(encodedPayload);
  return { token: `${encodedPayload}.${signature}`, maxAge };
}

export async function verifyGatewaySession(token?: string | null): Promise<GatewaySession | null> {
  if (!token || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, suppliedSignature] = parts;
  if (!encodedPayload || !suppliedSignature) return null;

  try {
    const expectedSignature = await sign(encodedPayload);
    if (!timingSafeEqual(suppliedSignature, expectedSignature)) return null;

    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as GatewaySession;
    const now = Date.now();
    const maxLifetime = payload.provider === "passkey" ? 12 * 60 * 60 * 1000 : 60 * 60 * 1000;
    const valid =
      payload.ver === GATEWAY_SESSION_VERSION &&
      /^(?:passkey_admin_primary|telegram_admin_[A-Za-z0-9_-]{1,128})$/.test(payload.uid) &&
      ["passkey", "telegram"].includes(payload.provider) &&
      ["full", "workspace"].includes(payload.scope) &&
      providerScopePairIsValid(payload.provider, payload.scope) &&
      Number.isFinite(payload.iat) &&
      Number.isFinite(payload.exp) &&
      payload.iat <= now + 30_000 &&
      payload.exp > now &&
      payload.exp - payload.iat <= maxLifetime &&
      /^[a-f0-9]{48}$/.test(payload.nonce);
    return valid ? payload : null;
  } catch {
    return null;
  }
}
