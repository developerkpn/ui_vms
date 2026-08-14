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
  joinMassItemDescription,
  splitMassGroupLabel,
} = helper;

test("sanitize keeps letters and digits, uppercases, and caps at three characters", () => {
  assert.equal(sanitizeMassFinalCodeSuffix("0a1b2c3"), "0A1");
  assert.equal(sanitizeMassFinalCodeSuffix("  a7 "), "A7");
  assert.equal(sanitizeMassFinalCodeSuffix("-a1"), "A1");
  assert.equal(sanitizeMassFinalCodeSuffix(null), "");
});

test("a three-character alphanumeric suffix is valid, wrong length is not", () => {
  assert.equal(isValidMassFinalCodeSuffix("005"), true);
  assert.equal(isValidMassFinalCodeSuffix("A01"), true);
  assert.equal(isValidMassFinalCodeSuffix("a01"), true);
  assert.equal(isValidMassFinalCodeSuffix("5"), false);
  assert.equal(isValidMassFinalCodeSuffix("0005"), false);
  assert.equal(isValidMassFinalCodeSuffix(""), false);
});

const items = [
  { id: "11", itemNo: 1, materialGroup: "100 - Consumables", materialSubGroup: "10 - Bolts" },
  { id: "12", itemNo: 2, materialGroup: "100 - Consumables", materialSubGroup: "10 - Bolts" },
  { id: "13", itemNo: 3, materialGroup: "100 - Consumables", materialSubGroup: "10 - Bolts" },
];

test("every item needs its own valid three-character suffix", () => {
  assert.deepEqual(
    validateMassFinalCodeSuffixes({
      finalCodeSuffixes: { 11: "005", 12: "006", 13: "007" },
      items,
    }),
    {}
  );
});

test("a lowercase suffix is accepted", () => {
  assert.deepEqual(
    validateMassFinalCodeSuffixes({
      finalCodeSuffixes: { 11: "a05", 12: "006", 13: "007" },
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
    { 12: "Running number harus 3 karakter huruf/angka." }
  );
  assert.deepEqual(
    validateMassFinalCodeSuffixes({
      finalCodeSuffixes: { 11: "005", 12: "1234", 13: "007" },
      items,
    }),
    { 12: "Running number harus 3 karakter huruf/angka." }
  );
});

test("two items in the same group and sub group sharing a running number are rejected, naming the conflict", () => {
  const errors = validateMassFinalCodeSuffixes({
    finalCodeSuffixes: { 11: "005", 12: "005", 13: "007" },
    items,
  });

  assert.equal(Object.keys(errors).length, 1);
  assert.match(errors[12], /005/);
  assert.match(errors[12], /item 1/);
});

test("two items in different groups sharing the same running number are accepted", () => {
  const differentGroupItems = [
    { id: "11", itemNo: 1, materialGroup: "100 - Consumables", materialSubGroup: "10 - Bolts" },
    { id: "12", itemNo: 2, materialGroup: "200 - Spares", materialSubGroup: "10 - Bolts" },
  ];

  assert.deepEqual(
    validateMassFinalCodeSuffixes({
      finalCodeSuffixes: { 11: "005", 12: "005" },
      items: differentGroupItems,
    }),
    {}
  );
});

test("two items in the same group but different sub groups sharing a running number are accepted", () => {
  const differentSubGroupItems = [
    { id: "11", itemNo: 1, materialGroup: "100 - Consumables", materialSubGroup: "10 - Bolts" },
    { id: "12", itemNo: 2, materialGroup: "100 - Consumables", materialSubGroup: "20 - Nuts" },
  ];

  assert.deepEqual(
    validateMassFinalCodeSuffixes({
      finalCodeSuffixes: { 11: "005", 12: "005" },
      items: differentSubGroupItems,
    }),
    {}
  );
});

test("description with PO text joins with one space", () => {
  assert.equal(
    joinMassItemDescription("PIPA BESI 2 INCH", "PO-1234"),
    "PIPA BESI 2 INCH PO-1234"
  );
});

test("description with empty PO text produces no trailing space", () => {
  assert.equal(joinMassItemDescription("PIPA BESI 2 INCH", ""), "PIPA BESI 2 INCH");
  assert.equal(joinMassItemDescription("PIPA BESI 2 INCH", null), "PIPA BESI 2 INCH");
});

test("splitMassGroupLabel splits a code - name value", () => {
  assert.deepEqual(splitMassGroupLabel("100 - Consumables"), {
    code: "100",
    name: "Consumables",
  });
});

test("a group value that does not split into code and name renders its raw text", () => {
  assert.deepEqual(splitMassGroupLabel("UNRECOGNISED"), {
    code: "UNRECOGNISED",
    name: "",
  });
  assert.deepEqual(splitMassGroupLabel(""), { code: "", name: "" });
});
