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

const {
  normalizeMassMaterialFieldValue,
  validateMassRow,
  MASS_OPTIONAL_FIELDS,
  MASS_MAX_PO_TEXT_LENGTH,
  toMassGridRowPayload,
  mapMassRequestServerErrors,
} = helper;

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

test("sub material group is optional, so a row without one is valid", () => {
  const row = {
    plant: "P1",
    sloc: "S1",
    materialGroup: "901",
    materialSubGroup: "",
    description: "PUMP",
    uom: "PC",
    attachments: [{}],
  };

  const errors = validateMassRow(row);

  assert.equal(errors.materialSubGroup, undefined);
  assert.deepEqual(Object.keys(errors), []);
});

test("the other material fields are still required", () => {
  const errors = validateMassRow({
    plant: "",
    sloc: "",
    materialGroup: "",
    materialSubGroup: "",
    description: "",
    uom: "",
    poText: "only this filled",
  });

  assert.equal(errors.materialSubGroup, undefined);
  for (const required of ["plant", "sloc", "materialGroup", "description", "uom"]) {
    assert.equal(errors[required]?.error, true, required);
  }
});

test("optional mass fields are exactly PO text, spesifikasi tambahan and sub group", () => {
  assert.deepEqual(
    [...MASS_OPTIONAL_FIELDS].sort(),
    ["materialSubGroup", "poText", "spesifikasiTambahan"]
  );
});

test("PO text is capped at the 210 chars SAP's PURCHASE_ORDER_TEXT holds", () => {
  const row = {
    plant: "PS23",
    sloc: "WN01",
    materialGroup: "927",
    description: "PUMP",
    uom: "PC",
  };

  assert.equal(MASS_MAX_PO_TEXT_LENGTH, 210);
  assert.equal(validateMassRow({ ...row, poText: "X".repeat(210) }).poText, undefined);
  assert.equal(
    validateMassRow({ ...row, poText: "X".repeat(211) }).poText?.message,
    "PO text maksimal 210 karakter."
  );
});

test("a grid line goes to the API as its 8 text fields only", () => {
  assert.deepEqual(
    toMassGridRowPayload({
      plant: "PS23",
      sloc: "WN01",
      materialGroup: "927",
      description: "PUMP",
      uom: "PC",
      attachments: [{}],
      rowErrors: { uom: { error: true } },
    }),
    {
      plant: "PS23",
      sloc: "WN01",
      materialGroup: "927",
      materialSubGroup: "",
      description: "PUMP",
      poText: "",
      uom: "PC",
      spesifikasiTambahan: "",
    }
  );
});

test("master-data errors from the validate endpoint land on their cells", () => {
  const mapped = mapMassRequestServerErrors([
    { rowIndex: 0, fieldKey: "uom", message: 'Base UoM "PCS" tidak ditemukan di master UoM.' },
    { rowIndex: 2, fieldKey: "materialGroup", message: 'Material group "696" tidak ditemukan di master material group.' },
  ]);

  assert.equal(mapped[0].uom.message, 'Base UoM "PCS" tidak ditemukan di master UoM.');
  assert.equal(mapped[2].materialGroup.error, true);
  assert.deepEqual(mapMassRequestServerErrors(undefined), {});
});
