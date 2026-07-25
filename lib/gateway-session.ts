const encoder = new TextEncoder();

export const GATEWAY_SESSION_COOKIE = "startpage_gateway";
export const GATEWAY_SESSION_MAX_AGE = 7 * 24 * 60 * 60;

type GatewayPayload = {
  uid: string;
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

export async function createGatewaySession(uid: string) {
  const payload: GatewayPayload = {
    uid,
    exp: Date.now() + GATEWAY_SESSION_MAX_AGE * 1000,
    nonce: randomNonce(),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = await sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifyGatewaySession(token?: string | null) {
  if (!token) return false;
  const [encodedPayload, suppliedSignature] = token.split(".");
  if (!encodedPayload || !suppliedSignature) return false;

  try {
    const expectedSignature = await sign(encodedPayload);
    if (!timingSafeEqual(suppliedSignature, expectedSignature)) return false;

    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as GatewayPayload;
    return Boolean(payload.uid && Number.isFinite(payload.exp) && payload.exp > Date.now());
  } catch {
    return false;
  }
}
