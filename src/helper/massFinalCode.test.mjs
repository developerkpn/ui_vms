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
  "massFinalCode.js"
);
const helper = await import(
  `data:text/javascript;base64,${fs.readFileSync(helperPath).toString("base64")}`
);

const {
  isValidMassFinalCodeSuffix,
  sanitizeMassFinalCodeSuffix,
  validateMassFinalCodeSuffixes,
} = helper;

test("sanitize keeps digits only and caps at three characters", () => {
  assert.equal(sanitizeMassFinalCodeSuffix("0a1b2c3"), "012");
  assert.equal(sanitizeMassFinalCodeSuffix("  7 "), "7");
  assert.equal(sanitizeMassFinalCodeSuffix("-12"), "12");
  assert.equal(sanitizeMassFinalCodeSuffix(null), "");
});

test("only an exactly three-digit suffix is valid", () => {
  assert.equal(isValidMassFinalCodeSuffix("005"), true);
  assert.equal(isValidMassFinalCodeSuffix("5"), false);
  assert.equal(isValidMassFinalCodeSuffix("0005"), false);
  assert.equal(isValidMassFinalCodeSuffix("A01"), false);
  assert.equal(isValidMassFinalCodeSuffix(""), false);
});

const items = [
  { id: "11", itemNo: 1 },
  { id: "12", itemNo: 2 },
  { id: "13", itemNo: 3 },
];

test("every item needs its own valid three-digit suffix", () => {
  assert.deepEqual(
    validateMassFinalCodeSuffixes({
      finalCodeSuffixes: { 11: "005", 12: "006", 13: "007" },
      items,
    }),
    {}
  );
});

test("a missing or malformed entry is flagged on that item only", () => {
  assert.deepEqual(
    validateMassFinalCodeSuffixes({
      finalCodeSuffixes: { 11: "005", 13: "007" },
      items,
    }),
    { 12: "Running number harus 3 digit angka." }
  );
  assert.deepEqual(
    validateMassFinalCodeSuffixes({
      finalCodeSuffixes: { 11: "005", 12: "A01", 13: "007" },
      items,
    }),
    { 12: "Running number harus 3 digit angka." }
  );
});

test("two items sharing the same running number both get flagged as duplicates", () => {
  const errors = validateMassFinalCodeSuffixes({
    finalCodeSuffixes: { 11: "005", 12: "005", 13: "007" },
    items,
  });

  assert.equal(Object.keys(errors).length, 1);
  assert.match(errors[12], /005/);
  assert.match(errors[12], /item 1/);
});
