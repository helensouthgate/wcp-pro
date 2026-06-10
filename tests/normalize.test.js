import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, mapTeam } from "../lib/normalize.js";

test("normalize lowercases and strips accents/punctuation", () => {
  assert.equal(normalize("Côte d'Ivoire"), "cotedivoire");
  assert.equal(normalize("Türkiye"), "turkiye");
  assert.equal(normalize("Bosnia & Herzegovina"), "bosniaherzegovina");
  assert.equal(normalize("Curaçao"), "curacao");
});

test("mapTeam resolves API spellings to our canonical names", () => {
  assert.equal(mapTeam("Korea Republic"), "South Korea");
  assert.equal(mapTeam("Türkiye"), "Turkey");
  assert.equal(mapTeam("Côte d'Ivoire"), "Ivory Coast");
  assert.equal(mapTeam("United States"), "USA");
  assert.equal(mapTeam("Czechia"), "Czech Republic");
  assert.equal(mapTeam("IR Iran"), "Iran");
  assert.equal(mapTeam("Cabo Verde"), "Cape Verde");
  assert.equal(mapTeam("Congo DR"), "DR Congo");
});

test("mapTeam matches our own names directly", () => {
  assert.equal(mapTeam("England"), "England");
  assert.equal(mapTeam("Curaçao"), "Curaçao");
  assert.equal(mapTeam("Bosnia & Herzegovina"), "Bosnia & Herzegovina");
});

test("mapTeam passes unknown names through unchanged", () => {
  assert.equal(mapTeam("Atlantis"), "Atlantis");
});
