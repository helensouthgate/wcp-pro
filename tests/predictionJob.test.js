import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizePredictionError,
  createFailedJob,
  isJobFailureForRun
} from "../lib/predictionJob.js";

test("sanitizePredictionError extracts Anthropic auth message", () => {
  const err = new Error(
    'Anthropic API error 401: {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}'
  );
  assert.equal(sanitizePredictionError(err), "Anthropic API 401: invalid x-api-key");
});

test("createFailedJob stores sanitized error", () => {
  const job = createFailedJob("2026-06-11T12:00:00.000Z", new Error("ANTHROPIC_API_KEY not configured"));
  assert.equal(job.status, "failed");
  assert.equal(job.error, "Anthropic API key is not configured.");
});

test("isJobFailureForRun matches failures after last successful run", () => {
  const job = createFailedJob("2026-06-11T12:10:00.000Z", new Error("boom"));
  assert.equal(isJobFailureForRun(job, "2026-06-11T12:00:00.000Z"), true);
  assert.equal(isJobFailureForRun(job, "2026-06-11T12:15:00.000Z"), false);
  assert.equal(isJobFailureForRun(job, null), true);
  assert.equal(isJobFailureForRun({ status: "running" }, null), false);
});
