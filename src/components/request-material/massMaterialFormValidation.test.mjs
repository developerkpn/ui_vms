import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The helper is an ES module inside a package that defaults to CommonJS, so a
// plain import of the .js path would be parsed as CJS and blow up on `export`.
// The module has no imports of its own, so loading its source through a data:
// URL gives the real exports without a bundler.
const helperPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "massMaterialFormValidation.js"
);
const helper = await import(
  `data:text/javascript;base64,${fs.readFileSync(helperPath).toString("base64")}`
);

const { normalizeMassMaterialFieldValue } = helper;

test("lowercase input uppercases", () => {
  assert.equal(normalizeMassMaterialFieldValue("consumable"), "CONSUMABLE");
});

test("already-uppercase input is unchanged", () => {
  assert.equal(normalizeMassMaterialFieldValue("CONSUMABLE"), "CONSUMABLE");
});

test("empty input stays empty", () => {
  assert.equal(normalizeMassMaterialFieldValue(""), "");
  assert.equal(normalizeMassMaterialFieldValue(null), "");
  assert.equal(normalizeMassMaterialFieldValue(undefined), "");
});

// Regression guard for IBE-031 against IBE-022: the normalizer has no
// reason/prose exemption of its own — MassMaterialForm's reason dialog was
// switched off this function entirely rather than taught to special-case
// prose here. If the reason field is ever routed through this function
// again, it uppercases exactly like any other field.
test("normalizer has no built-in prose exemption — the reason field must stay off it entirely", () => {
  assert.equal(
    normalizeMassMaterialFieldValue("Butuh material tambahan untuk proyek Q3"),
    "BUTUH MATERIAL TAMBAHAN UNTUK PROYEK Q3"
  );
});
