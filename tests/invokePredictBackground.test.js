import { test } from "node:test";
import assert from "node:assert/strict";
import {
  predictBackgroundUrl,
  invokePredictBackground
} from "../netlify/functions/lib/invokePredictBackground.js";

test("predictBackgroundUrl builds from origin", () => {
  assert.equal(
    predictBackgroundUrl("http://localhost:8888"),
    "http://localhost:8888/.netlify/functions/predict-background"
  );
  assert.equal(
    predictBackgroundUrl("http://localhost:8888/"),
    "http://localhost:8888/.netlify/functions/predict-background"
  );
});

test("invokePredictBackground POSTs with job secret header", async () => {
  const prev = process.env.ADMIN_SESSION_SECRET;
  process.env.ADMIN_SESSION_SECRET = "test-secret";
  let captured = null;
  try {
    await invokePredictBackground({
      origin: "http://localhost:8888",
      fetchImpl: async (url, opts) => {
        captured = { url, opts };
        return { status: 202 };
      }
    });
    assert.equal(captured.url, "http://localhost:8888/.netlify/functions/predict-background");
    assert.equal(captured.opts.method, "POST");
    assert.equal(captured.opts.headers["x-predict-job"], "test-secret");
  } finally {
    process.env.ADMIN_SESSION_SECRET = prev;
  }
});

test("invokePredictBackground throws when secret missing", async () => {
  const prev = process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  try {
    await assert.rejects(
      () => invokePredictBackground({ origin: "http://localhost:8888", fetchImpl: async () => ({ status: 202 }) }),
      /ADMIN_SESSION_SECRET/
    );
  } finally {
    process.env.ADMIN_SESSION_SECRET = prev;
  }
});

test("invokePredictBackground throws on non-202 response", async () => {
  const prev = process.env.ADMIN_SESSION_SECRET;
  process.env.ADMIN_SESSION_SECRET = "test-secret";
  try {
    await assert.rejects(
      () => invokePredictBackground({
        origin: "http://localhost:8888",
        fetchImpl: async () => ({ status: 500, text: async () => "boom" })
      }),
      /500/
    );
  } finally {
    process.env.ADMIN_SESSION_SECRET = prev;
  }
});
