const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(
  path.resolve(__dirname, "massMaterialFormValidation.mjs")
).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

const createFilledRow = (overrides = {}) => ({
  plant: "1000",
  sloc: "1101",
  materialGroup: "GR-A",
  materialSubGroup: "SUB-A",
  description: "Sample description",
  poText: "PO-12345",
  uom: "EA",
  spesifikasiTambahan: "Spec tambahan",
  attachments: [{ name: "evidence.pdf", size: 1024 }],
  ...overrides,
});

test("validateMassRow flags missing fields on a partially-filled row", async () => {
  const { validateMassRow } = await loadHelper();

  const errors = validateMassRow({
    plant: "1000",
    sloc: "",
    materialGroup: "GR-A",
    materialSubGroup: "SUB-A",
    description: "Sample description",
    poText: "PO-12345",
    uom: "EA",
    spesifikasiTambahan: "Spec tambahan",
    attachments: [{ name: "evidence.pdf", size: 1024 }],
  });

  assert.equal(errors.sloc.error, true);
  assert.equal(errors.sloc.message, "Sloc wajib diisi.");
  assert.equal(errors.plant, undefined);
});

test("validateMassRow returns no errors for a fully-filled row", async () => {
  const { validateMassRow } = await loadHelper();

  const row = createFilledRow();
  delete row.attachments;
  const errors = validateMassRow(row);

  assert.deepEqual(errors, {});
});

test("validateMassRow flags material_description exceeding 40 chars", async () => {
  const { validateMassRow, MASS_MAX_DESCRIPTION_LENGTH } = await loadHelper();

  const longDescription = "D".repeat(MASS_MAX_DESCRIPTION_LENGTH + 10);
  const errors = validateMassRow(
    createFilledRow({ description: longDescription })
  );

  assert.equal(errors.description.error, true);
  assert.match(errors.description.message, /maksimal 40 karakter/i);
});

test("validateMassRow does not validate attachments (handled by batch validator)", async () => {
  const { validateMassRow } = await loadHelper();

  const errors = validateMassRow(createFilledRow({ attachments: [] }));

  assert.equal(errors.attachments, undefined);
});

test("validateMassRequestBatch flags missing attachments when not in shared mode", async () => {
  const { validateMassRequestBatch } = await loadHelper();

  const result = validateMassRequestBatch([
    createFilledRow({ attachments: [] }),
    createFilledRow(),
  ]);

  assert.equal(result.errors[0].attachments.error, true);
  assert.equal(
    result.errors[0].attachments.message,
    "Minimal 1 attachment per baris."
  );
});

test("validateMassRequestBatch skips attachment check in shared mode", async () => {
  const { validateMassRequestBatch } = await loadHelper();

  const result = validateMassRequestBatch(
    [
      createFilledRow({ attachments: [] }),
      createFilledRow({ attachments: [] }),
    ],
    { useSharedImage: true, sharedFileCount: 1 }
  );

  assert.equal(result.errors[0], undefined);
  assert.equal(result.errors[1], undefined);
});

test("validateMassRequestBatch flags missing shared file", async () => {
  const { validateMassRequestBatch } = await loadHelper();

  const result = validateMassRequestBatch(
    [createFilledRow(), createFilledRow()],
    { useSharedImage: true, sharedFileCount: 0 }
  );

  assert.equal(result.errors[-1].sharedAttachments.error, true);
  assert.match(
    result.errors[-1].sharedAttachments.message,
    /minimal 1 attachment/i
  );
});

test("validateMassRequestBatch flags >3 attachments on a row", async () => {
  const { validateMassRequestBatch } = await loadHelper();

  const result = validateMassRequestBatch([
    createFilledRow({
      attachments: [
        { name: "1.pdf", size: 1 },
        { name: "2.pdf", size: 1 },
        { name: "3.pdf", size: 1 },
        { name: "4.pdf", size: 1 },
      ],
    }),
    createFilledRow(),
  ]);

  assert.equal(result.errors[0].attachments.error, true);
  assert.equal(
    result.errors[0].attachments.message,
    "Maksimal 3 attachment per baris."
  );
});

test("validateMassRow returns no errors for an empty row", async () => {
  const { validateMassRow } = await loadHelper();

  const errors = validateMassRow({
    plant: "",
    sloc: "",
    materialGroup: "",
    materialSubGroup: "",
    description: "",
    poText: "",
    uom: "",
    spesifikasiTambahan: "",
    attachments: [],
  });

  assert.deepEqual(errors, {});
});

test("isMassRowFilled returns true when any text field has a non-blank value", async () => {
  const { isMassRowFilled } = await loadHelper();

  assert.equal(isMassRowFilled({ plant: "1000" }), true);
  assert.equal(
    isMassRowFilled({ plant: "   ", description: "non-blank" }),
    true
  );
});

test("isMassRowFilled returns false when all text fields are blank", async () => {
  const { isMassRowFilled } = await loadHelper();

  assert.equal(isMassRowFilled({}), false);
  assert.equal(
    isMassRowFilled({
      plant: "",
      sloc: "  ",
      materialGroup: undefined,
      materialSubGroup: null,
      description: "",
      poText: "",
      uom: "",
      spesifikasiTambahan: "",
    }),
    false
  );
});

test("validateMassRequestBatch flags empty submission (0 filled rows)", async () => {
  const { validateMassRequestBatch } = await loadHelper();

  const result = validateMassRequestBatch([
    createFilledRow({ plant: "", sloc: "", materialGroup: "", materialSubGroup: "", description: "", poText: "", uom: "", spesifikasiTambahan: "", attachments: [] }),
    createFilledRow({ plant: "", sloc: "", materialGroup: "", materialSubGroup: "", description: "", poText: "", uom: "", spesifikasiTambahan: "", attachments: [] }),
  ]);

  assert.equal(result.filledRowIndexes.length, 0);
  assert.equal(result.errors[-1].rows.error, true);
  assert.equal(result.errors[-1].rows.message, "Minimal 2 baris harus diisi.");
});

test("validateMassRequestBatch returns trailing-empty rows as not-in-error when 3 of 10 rows are filled", async () => {
  const { validateMassRequestBatch, MASS_MAX_ROWS } = await loadHelper();

  const filledRow = createFilledRow();
  const emptyRow = {
    plant: "",
    sloc: "",
    materialGroup: "",
    materialSubGroup: "",
    description: "",
    poText: "",
    uom: "",
    spesifikasiTambahan: "",
    attachments: [],
  };
  const rows = [
    filledRow,
    emptyRow,
    filledRow,
    emptyRow,
    filledRow,
    emptyRow,
    emptyRow,
    emptyRow,
    emptyRow,
    emptyRow,
  ];

  assert.equal(rows.length, MASS_MAX_ROWS);

  const result = validateMassRequestBatch(rows);

  assert.deepEqual(result.filledRowIndexes, [0, 2, 4]);
  assert.equal(result.errors[0], undefined);
  assert.equal(result.errors[1], undefined);
  assert.equal(result.errors[2], undefined);
  assert.equal(result.errors[4], undefined);
  assert.equal(result.errors[5], undefined);
  assert.equal(result.errors[9], undefined);
});

test("validateMassRequestBatch flags a partially-filled middle row as an error", async () => {
  const { validateMassRequestBatch } = await loadHelper();

  const rows = [
    createFilledRow(),
    {
      plant: "1000",
      sloc: "",
      materialGroup: "",
      materialSubGroup: "",
      description: "",
      poText: "",
      uom: "",
      spesifikasiTambahan: "",
      attachments: [],
    },
    createFilledRow(),
  ];

  const result = validateMassRequestBatch(rows);

  assert.deepEqual(result.filledRowIndexes, [0, 1, 2]);
  assert.equal(result.errors[0], undefined);
  assert.equal(result.errors[1].sloc.error, true);
  assert.equal(result.errors[1].materialGroup.error, true);
  assert.equal(result.errors[1].materialSubGroup.error, true);
  assert.equal(result.errors[1].description.error, true);
  assert.equal(result.errors[1].uom.error, true);
  assert.equal(result.errors[1].attachments.error, true);
});

test("mapMassRequestServerErrors flattens the array into the nested shape", async () => {
  const { mapMassRequestServerErrors } = await loadHelper();

  const mapped = mapMassRequestServerErrors([
    { rowIndex: 0, fieldKey: "description", message: "Material description wajib diisi." },
    { rowIndex: 0, fieldKey: "attachments", message: "Minimal 1 attachment per baris." },
    { rowIndex: 1, fieldKey: "uom", message: "Base UoM wajib diisi." },
    { rowIndex: -1, fieldKey: "rows", message: "Minimal 2 baris harus diisi." },
  ]);

  assert.equal(mapped[0].description.error, true);
  assert.equal(mapped[0].description.message, "Material description wajib diisi.");
  assert.equal(mapped[0].attachments.error, true);
  assert.equal(mapped[1].uom.error, true);
  assert.equal(mapped[1].uom.message, "Base UoM wajib diisi.");
  assert.equal(mapped[-1].rows.error, true);
  assert.equal(mapped[-1].rows.message, "Minimal 2 baris harus diisi.");
});
