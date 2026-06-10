// /api/login
//   POST {password}      → verify against ADMIN_PASSWORD, set session cookie
//   POST {action:"logout"} → clear the session cookie
//   GET                  → report whether the caller currently has a valid session

import { json, error, isAdmin, cookieSecure } from "./lib/respond.js";
import {
  createSession,
  buildSetCookie,
  buildClearCookie,
  passwordMatches
} from "../../lib/auth.js";

export const config = { path: "/api/login" };

export default async function handler(req) {
  if (req.method === "GET") {
    return json({ authenticated: isAdmin(req) });
  }
  if (req.method !== "POST") return error("Method not allowed", 405);

  let body;
  try { body = await req.json(); } catch { return error("Invalid JSON body"); }

  if (body?.action === "logout") {
    return json({ ok: true }, 200, { "set-cookie": buildClearCookie({ secure: cookieSecure() }) });
  }

  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!expected || !secret) return error("Server not configured", 500);

  if (!passwordMatches(body?.password ?? "", expected)) {
    return error("Incorrect password", 401);
  }

  const { token, exp } = createSession(secret);
  return json({ ok: true }, 200, {
    "set-cookie": buildSetCookie(token, exp, { secure: cookieSecure() })
  });
}
