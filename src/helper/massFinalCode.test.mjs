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
  buildMassFinalCodeSuffixPreview,
  buildMassFinalCodeSuffixes,
  formatMassFinalCodeSuffixPreview,
  isValidMassFinalCodeSuffix,
  sanitizeMassFinalCodeSuffix,
  validateMassFinalCodeSuffix,
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

test("item k takes the entered suffix + (k - 1), zero-padded", () => {
  assert.deepEqual(
    buildMassFinalCodeSuffixes({ finalCodeSuffix: "008", itemCount: 3 }).map(e => e.suffix),
    ["008", "009", "010"]
  );
  assert.deepEqual(buildMassFinalCodeSuffixes({ finalCodeSuffix: "005", itemCount: 0 }), []);
  // Nothing to increment from until the suffix is complete.
  assert.deepEqual(buildMassFinalCodeSuffixes({ finalCodeSuffix: "9", itemCount: 3 }), []);
});

test("a running number past the three-digit range is flagged, not widened", () => {
  const entries = buildMassFinalCodeSuffixes({ finalCodeSuffix: "998", itemCount: 4 });

  assert.deepEqual(
    entries.map(e => e.suffix),
    ["998", "999", null, null]
  );
  assert.equal(entries[2].value, 1000);
});

test("validation mirrors the backend's invalid and overflow rules", () => {
  assert.equal(validateMassFinalCodeSuffix({ finalCodeSuffix: "005", itemCount: 10 }), "");
  assert.match(
    validateMassFinalCodeSuffix({ finalCodeSuffix: "5", itemCount: 2 }),
    /exactly 3 digits/
  );
  assert.match(
    validateMassFinalCodeSuffix({ finalCodeSuffix: "A01", itemCount: 2 }),
    /exactly 3 digits/
  );
  const overflow = validateMassFinalCodeSuffix({ finalCodeSuffix: "998", itemCount: 4 });
  assert.match(overflow, /cannot cover 4 items/);
  assert.match(overflow, /item 3 would need 1000/);
});

test("preview is capped at three items and marks the remainder", () => {
  assert.deepEqual(
    buildMassFinalCodeSuffixPreview({ finalCodeSuffix: "101", itemCount: 2 }),
    {
      entries: [
        { itemNo: 1, value: 101, suffix: "101" },
        { itemNo: 2, value: 102, suffix: "102" },
      ],
      hasMore: false,
    }
  );
  assert.equal(
    buildMassFinalCodeSuffixPreview({ finalCodeSuffix: "101", itemCount: 9 }).hasMore,
    true
  );
});

test("formatted preview lists the first items and ellipsis when truncated", () => {
  assert.equal(
    formatMassFinalCodeSuffixPreview({ finalCodeSuffix: "098", itemCount: 5 }),
    "Item 1: 098, Item 2: 099, Item 3: 100, ..."
  );
  assert.equal(
    formatMassFinalCodeSuffixPreview({ finalCodeSuffix: "098", itemCount: 2 }),
    "Item 1: 098, Item 2: 099"
  );
  assert.equal(formatMassFinalCodeSuffixPreview({ finalCodeSuffix: "09", itemCount: 2 }), "");
  assert.equal(formatMassFinalCodeSuffixPreview({ finalCodeSuffix: "098", itemCount: 0 }), "");
});
