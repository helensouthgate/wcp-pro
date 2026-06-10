// Shared helpers for Netlify Functions v2 (Request/Response based).

import { verifyCookieHeader } from "../../../lib/auth.js";

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...extraHeaders
    }
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

// Returns true if the request carries a valid admin session cookie.
export function isAdmin(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  return verifyCookieHeader(req.headers.get("cookie"), secret);
}

// Whether to mark cookies Secure — true in prod, relaxed for local http dev.
export function cookieSecure() {
  return process.env.NETLIFY_DEV ? false : true;
}
