import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSession, verifyToken, verifyCookieHeader,
  buildSetCookie, buildClearCookie, passwordMatches, COOKIE_NAME
} from "../lib/auth.js";

const SECRET = "test-secret-value-1234567890";

test("valid session round-trips", () => {
  const { token, exp } = createSession(SECRET);
  assert.ok(exp > Date.now());
  assert.equal(verifyToken(token, SECRET), true);
});

test("tampered signature is rejected", () => {
  const { token } = createSession(SECRET);
  const tampered = token.slice(0, -1) + (token.slice(-1) === "a" ? "b" : "a");
  assert.equal(verifyToken(tampered, SECRET), false);
});

test("tampered payload is rejected", () => {
  const { token } = createSession(SECRET);
  const [, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ exp: Date.now() + 1e9 })).toString("base64url") + "." + sig;
  assert.equal(verifyToken(forged, SECRET), false);
});

test("wrong secret is rejected", () => {
  const { token } = createSession(SECRET);
  assert.equal(verifyToken(token, "different-secret"), false);
});

test("expired session is rejected", () => {
  const past = Date.now() - 10_000;
  const { token } = createSession(SECRET, { ttlSeconds: 1, now: past - 1000 });
  assert.equal(verifyToken(token, SECRET, { now: Date.now() }), false);
});

test("garbage tokens are rejected", () => {
  assert.equal(verifyToken("", SECRET), false);
  assert.equal(verifyToken("nodot", SECRET), false);
  assert.equal(verifyToken(null, SECRET), false);
});

test("verifyCookieHeader extracts the right cookie", () => {
  const { token } = createSession(SECRET);
  const header = `other=1; ${COOKIE_NAME}=${token}; foo=bar`;
  assert.equal(verifyCookieHeader(header, SECRET), true);
  assert.equal(verifyCookieHeader("other=1; foo=bar", SECRET), false);
  assert.equal(verifyCookieHeader(undefined, SECRET), false);
});

test("set-cookie has security flags; clear cookie expires", () => {
  const { token, exp } = createSession(SECRET);
  const c = buildSetCookie(token, exp, { secure: true });
  assert.match(c, /HttpOnly/);
  assert.match(c, /SameSite=Strict/);
  assert.match(c, /Secure/);
  assert.match(buildClearCookie(), /Max-Age=0/);
});

test("passwordMatches is exact", () => {
  assert.equal(passwordMatches("hunter2", "hunter2"), true);
  assert.equal(passwordMatches("hunter2", "hunter3"), false);
  assert.equal(passwordMatches("hunter2", ""), false);
  assert.equal(passwordMatches("", "x"), false);
});
