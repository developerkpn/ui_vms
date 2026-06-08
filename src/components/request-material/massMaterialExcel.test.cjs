const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(
  path.resolve(__dirname, "massMaterialExcel.mjs")
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
  rowErrors: {},
  ...overrides,
});

test("buildMassExcelAoa emits a header row matching the field order", async () => {
  const { buildMassExcelAoa, MASS_EXCEL_HEADER_ROW } = await loadHelper();
  const aoa = buildMassExcelAoa([]);
  assert.equal(aoa.length, 1);
  assert.deepEqual(aoa[0], MASS_EXCEL_HEADER_ROW);
  assert.equal(aoa[0][0], "No");
  assert.equal(aoa[0][1], "Plant");
  assert.equal(aoa[0][4], "Sub Mat Group");
});

test("buildMassExcelAoa writes a numbered data row per input row", async () => {
  const { buildMassExcelAoa } = await loadHelper();
  const aoa = buildMassExcelAoa([createFilledRow(), createFilledRow({ plant: "2000" })]);
  assert.equal(aoa.length, 3); // header + 2 rows
  assert.deepEqual(aoa[1], [
    1,
    "1000",
    "1101",
    "GR-A",
    "SUB-A",
    "Sample description",
    "PO-12345",
    "EA",
    "Spec tambahan",
  ]);
  assert.equal(aoa[2][0], 2);
  assert.equal(aoa[2][1], "2000");
});

test("buildMassExcelAoa coerces missing fields to empty strings", async () => {
  const { buildMassExcelAoa } = await loadHelper();
  const aoa = buildMassExcelAoa([{ plant: "1000" }]);
  assert.equal(aoa[1][1], "1000");
  assert.equal(aoa[1][2], ""); // sloc absent -> ""
  assert.equal(aoa[1][8], ""); // spesifikasiTambahan absent -> ""
});

test("round-trip: exported rows parse back to the same field values", async () => {
  const { buildMassExcelAoa, parseMassExcelToRows } = await loadHelper();
  const original = [createFilledRow(), createFilledRow({ plant: "2000", uom: "PC" })];
  const aoa = buildMassExcelAoa(original);
  const parsed = parseMassExcelToRows(aoa);
  assert.equal(parsed.error, "");
  assert.equal(parsed.importedCount, 2);
  assert.equal(parsed.rows[0].plant, "1000");
  assert.equal(parsed.rows[0].materialSubGroup, "SUB-A");
  assert.equal(parsed.rows[1].plant, "2000");
  assert.equal(parsed.rows[1].uom, "PC");
  // attachments never round-trip through Excel
  assert.equal(parsed.rows[0].attachments, undefined);
});

test("parseMassExcelToRows matches headers case/spacing-insensitively and via aliases", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  const aoa = [
    ["plant", "SLOC", "mat group", "sub material group", "Description", "po text", "base uom", "additional specification"],
    ["1000", "1101", "GR-A", "SUB-A", "desc", "PO-1", "EA", "spec"],
  ];
  const parsed = parseMassExcelToRows(aoa);
  assert.equal(parsed.error, "");
  assert.equal(parsed.importedCount, 1);
  const row = parsed.rows[0];
  assert.equal(row.plant, "1000");
  assert.equal(row.materialGroup, "GR-A");
  assert.equal(row.materialSubGroup, "SUB-A");
  assert.equal(row.uom, "EA");
  assert.equal(row.spesifikasiTambahan, "spec");
});

test("parseMassExcelToRows ignores the No column and unknown columns", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  const aoa = [
    ["No", "Plant", "Random Extra", "Sloc"],
    [1, "1000", "ignore me", "1101"],
  ];
  const parsed = parseMassExcelToRows(aoa);
  assert.equal(parsed.importedCount, 1);
  assert.equal(parsed.rows[0].plant, "1000");
  assert.equal(parsed.rows[0].sloc, "1101");
});

test("parseMassExcelToRows coerces numeric cells to strings", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  const aoa = [
    ["Plant", "Sloc"],
    [1000, 1101],
  ];
  const parsed = parseMassExcelToRows(aoa);
  assert.equal(parsed.rows[0].plant, "1000");
  assert.equal(parsed.rows[0].sloc, "1101");
});

test("parseMassExcelToRows skips fully blank data rows", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  const aoa = [
    ["Plant", "Sloc"],
    ["1000", "1101"],
    ["", ""],
    ["  ", ""],
    ["2000", "2202"],
  ];
  const parsed = parseMassExcelToRows(aoa);
  assert.equal(parsed.importedCount, 2);
  assert.equal(parsed.skippedBlank, 2);
  assert.equal(parsed.rows[1].plant, "2000");
});

test("parseMassExcelToRows caps rows at MASS_MAX_ROWS and reports overflow", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  const { MASS_MAX_ROWS } = await import(
    pathToFileURL(
      path.resolve(__dirname, "massMaterialFormValidation.mjs")
    ).href
  );
  const header = ["Plant"];
  const body = Array.from({ length: MASS_MAX_ROWS + 3 }, (_, i) => [
    String(1000 + i),
  ]);
  const parsed = parseMassExcelToRows([header, ...body]);
  assert.equal(parsed.importedCount, MASS_MAX_ROWS);
  assert.equal(parsed.rows.length, MASS_MAX_ROWS);
  assert.equal(parsed.droppedOverflow, 3);
});

test("parseMassExcelToRows tolerates a leading title row above the header", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  const aoa = [
    ["Mass Material Request Template"],
    [],
    ["Plant", "Sloc"],
    ["1000", "1101"],
  ];
  const parsed = parseMassExcelToRows(aoa);
  assert.equal(parsed.error, "");
  assert.equal(parsed.importedCount, 1);
  assert.equal(parsed.rows[0].plant, "1000");
});

test("parseMassExcelToRows ignores a single-cell title that collides with a field name", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  // A merged/legend leading cell equal to a field label must NOT be mistaken
  // for the header; the real multi-column header below should win.
  const aoa = [
    ["UoM"],
    ["isi dengan satuan, contoh EA"],
    ["No", "Plant", "Sloc", "UoM"],
    [1, "1000", "1101", "EA"],
  ];
  const parsed = parseMassExcelToRows(aoa);
  assert.equal(parsed.error, "");
  assert.equal(parsed.importedCount, 1);
  assert.equal(parsed.rows[0].plant, "1000");
  assert.equal(parsed.rows[0].sloc, "1101");
  assert.equal(parsed.rows[0].uom, "EA");
});

test("parseMassExcelToRows still accepts a legitimate single-column header", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  const parsed = parseMassExcelToRows([["Plant"], ["1000"], ["2000"]]);
  assert.equal(parsed.error, "");
  assert.equal(parsed.importedCount, 2);
  assert.equal(parsed.rows[0].plant, "1000");
  assert.equal(parsed.rows[1].plant, "2000");
});

test("parseMassExcelToRows errors when no header is recognized", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  const parsed = parseMassExcelToRows([
    ["foo", "bar", "baz"],
    ["a", "b", "c"],
  ]);
  assert.notEqual(parsed.error, "");
  assert.equal(parsed.importedCount, 0);
});

test("parseMassExcelToRows errors on empty input", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  assert.notEqual(parseMassExcelToRows([]).error, "");
  assert.notEqual(parseMassExcelToRows(null).error, "");
});

test("parseMassExcelToRows errors when header exists but no data rows", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  const parsed = parseMassExcelToRows([["Plant", "Sloc"]]);
  assert.notEqual(parsed.error, "");
  assert.equal(parsed.importedCount, 0);
});

test("parseMassExcelToRows keeps the first column when a field is duplicated", async () => {
  const { parseMassExcelToRows } = await loadHelper();
  const aoa = [
    ["Plant", "Plant"],
    ["first", "second"],
  ];
  const parsed = parseMassExcelToRows(aoa);
  assert.equal(parsed.rows[0].plant, "first");
});

test("normalizeHeader strips spacing, case, and punctuation", async () => {
  const { normalizeHeader } = await loadHelper();
  assert.equal(normalizeHeader("Sub Mat Group"), "submatgroup");
  assert.equal(normalizeHeader("  PO_Text! "), "potext");
  assert.equal(normalizeHeader(null), "");
});
