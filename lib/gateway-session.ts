const encoder = new TextEncoder();

export const GATEWAY_SESSION_COOKIE = "startpage_gateway";

export type GatewayProvider = "passkey" | "telegram";
export type GatewayScope = "full" | "workspace";

export type GatewaySession = {
  uid: string;
  provider: GatewayProvider;
  scope: GatewayScope;
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
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sign(value: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for gateway sessions");

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
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

export async function createGatewaySession(input: {
  uid: string;
  provider: GatewayProvider;
  scope: GatewayScope;
  maxAge: number;
}) {
  const maxAge = Math.max(60, Math.min(input.maxAge, input.provider === "passkey" ? 12 * 60 * 60 : 60 * 60));
  const payload: GatewaySession = {
    uid: input.uid,
    provider: input.provider,
    scope: input.scope,
    exp: Date.now() + maxAge * 1000,
    nonce: randomNonce(),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = await sign(encodedPayload);
  return { token: `${encodedPayload}.${signature}`, maxAge };
}

export async function verifyGatewaySession(token?: string | null): Promise<GatewaySession | null> {
  if (!token) return null;
  const [encodedPayload, suppliedSignature] = token.split(".");
  if (!encodedPayload || !suppliedSignature) return null;

  try {
    const expectedSignature = await sign(encodedPayload);
    if (!timingSafeEqual(suppliedSignature, expectedSignature)) return null;

    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as GatewaySession;
    const valid =
      Boolean(payload.uid) &&
      ["passkey", "telegram"].includes(payload.provider) &&
      ["full", "workspace"].includes(payload.scope) &&
      Number.isFinite(payload.exp) &&
      payload.exp > Date.now();
    return valid ? payload : null;
  } catch {
    return null;
  }
}
