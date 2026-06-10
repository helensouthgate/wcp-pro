// ─── ADMIN SESSION AUTH ──────────────────────────────────────────────────────
// Stateless signed-cookie sessions. We never store sessions server-side and
// never persist the password on the client. A session is a short payload
// ({exp}) plus an HMAC-SHA256 signature using ADMIN_SESSION_SECRET. The cookie
// is HttpOnly + Secure + SameSite=Strict so page JS can't read it and it isn't
// sent cross-site.

import crypto from "node:crypto";

export const COOKIE_NAME = "wcp_admin";
const DEFAULT_TTL_SECONDS = 6 * 60 * 60; // 6 hours

function sign(payloadB64, secret) {
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

// Constant-time string compare that won't throw on length mismatch.
function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Create a token string `<payload>.<sig>` and its absolute expiry (ms epoch).
export function createSession(secret, { ttlSeconds = DEFAULT_TTL_SECONDS, now = Date.now() } = {}) {
  const exp = now + ttlSeconds * 1000;
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  const sig = sign(payload, secret);
  return { token: `${payload}.${sig}`, exp };
}

// Verify a raw token string. Returns true only if signature is valid and unexpired.
export function verifyToken(token, secret, { now = Date.now() } = {}) {
  if (!token || typeof token !== "string") return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(payload, secret))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > now;
  } catch {
    return false;
  }
}

// Pull the session cookie out of a Cookie header and verify it.
export function verifyCookieHeader(cookieHeader, secret, opts = {}) {
  if (!cookieHeader) return false;
  const part = cookieHeader
    .split(/;\s*/)
    .find((c) => c.startsWith(COOKIE_NAME + "="));
  if (!part) return false;
  return verifyToken(part.slice(COOKIE_NAME.length + 1), secret, opts);
}

// Build a Set-Cookie header value for a fresh session.
export function buildSetCookie(token, exp, { secure = true, now = Date.now() } = {}) {
  const maxAge = Math.max(0, Math.floor((exp - now) / 1000));
  let c = `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
  if (secure) c += "; Secure";
  return c;
}

// Build a Set-Cookie header value that immediately clears the session.
export function buildClearCookie({ secure = true } = {}) {
  let c = `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
  if (secure) c += "; Secure";
  return c;
}

// Compare a submitted password to the configured one in constant time.
export function passwordMatches(submitted, expected) {
  if (!expected || typeof submitted !== "string") return false;
  return safeEqual(submitted, expected);
}
