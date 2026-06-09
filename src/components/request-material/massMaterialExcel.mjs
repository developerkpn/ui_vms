// Pure helpers for Mass Material Request <-> Excel interchange.
// Kept free of React and the `xlsx` library so it can be unit-tested with
// node:test (see massMaterialExcel.test.cjs). The component is responsible for
// turning these array-of-arrays (AoA) structures into / from an actual workbook
// via SheetJS (XLSX.utils.aoa_to_sheet / sheet_to_json with { header: 1 }).
//
// Only the 8 free-text fields round-trip through Excel. Attachments are files
// and cannot live in a spreadsheet, so imported rows always start with no
// attachments and the user must add them before submitting.

import { MASS_MAX_ROWS, MASS_MIN_ROWS, MASS_TEXT_FIELDS } from "./massMaterialFormValidation.mjs";

// Human-friendly column headers used when exporting. These intentionally match
// the on-screen column labels so an exported file reads the same as the table.
export const MASS_EXCEL_FIELD_HEADERS = {
  plant: "Plant",
  sloc: "Sloc",
  materialGroup: "Material Group",
  materialSubGroup: "Sub Mat Group",
  description: "Description",
  poText: "PO Text",
  uom: "UoM",
  spesifikasiTambahan: "Spesifikasi Tambahan",
};

// Leading "No" column is for human readability only; it is ignored on import.
export const MASS_EXCEL_HEADER_ROW = [
  "No",
  ...MASS_TEXT_FIELDS.map(key => MASS_EXCEL_FIELD_HEADERS[key]),
];

// Normalize a header cell to a comparison key: lowercase, alphanumerics only.
// "Sub Mat Group" -> "submatgroup", "PO Text" -> "potext".
export function normalizeHeader(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Build the normalized-header -> fieldKey lookup from both the field keys and
// the export labels, then layer on a few curated aliases so files that were
// hand-typed (or came from an older template) still map cleanly.
function buildHeaderLookup() {
  const lookup = {};
  for (const key of MASS_TEXT_FIELDS) {
    lookup[normalizeHeader(key)] = key;
    const label = MASS_EXCEL_FIELD_HEADERS[key];
    if (label) {
      lookup[normalizeHeader(label)] = key;
    }
  }
  Object.assign(lookup, {
    matgroup: "materialGroup",
    submatgroup: "materialSubGroup",
    submaterialgroup: "materialSubGroup",
    subgroup: "materialSubGroup",
    baseuom: "uom",
    storagelocation: "sloc",
    materialdescription: "description",
    additionalspecification: "spesifikasiTambahan",
  });
  return lookup;
}

export const MASS_HEADER_LOOKUP = buildHeaderLookup();

// Coerce any cell value to a trimmed string. Excel often parses codes like
// plant "1000" as numbers, so numbers are stringified; blanks become "".
function cellToString(value) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }
  return String(value).trim();
}

function createEmptyFieldObject() {
  const obj = {};
  for (const key of MASS_TEXT_FIELDS) {
    obj[key] = "";
  }
  return obj;
}

// Build an array-of-arrays for export: header row followed by one row per input
// row. Pass an empty array to get a header-only template.
export function buildMassExcelAoa(rows) {
  const source = Array.isArray(rows) ? rows : [];
  const body = source.map((row, index) => {
    const safe = row && typeof row === "object" ? row : {};
    return [index + 1, ...MASS_TEXT_FIELDS.map(key => cellToString(safe[key]))];
  });
  return [MASS_EXCEL_HEADER_ROW.slice(), ...body];
}

// Parse an array-of-arrays (from sheet_to_json with { header: 1 }) into form
// rows. Returns:
//   rows:            field objects (8 text fields), capped at MASS_MAX_ROWS
//   importedCount:   number of data rows kept
//   skippedBlank:    fully-blank data rows that were dropped
//   droppedOverflow: data rows beyond MASS_MAX_ROWS that were dropped
//   error:           non-empty when nothing usable could be parsed
export function parseMassExcelToRows(aoa) {
  const result = {
    rows: [],
    importedCount: 0,
    skippedBlank: 0,
    droppedOverflow: 0,
    error: "",
  };

  const matrix = Array.isArray(aoa) ? aoa : [];
  if (matrix.length === 0) {
    result.error = "File Excel kosong.";
    return result;
  }

  // Locate the header row: the row that yields the MOST recognized columns
  // (earliest row wins ties). Scanning for the strongest match — rather than
  // the first row with any single match — tolerates a leading title/blank row
  // while avoiding mistaking a one-cell title (e.g. a merged "Plant" caption)
  // for the header and parsing the real header as data.
  let headerRowIndex = -1;
  let colToField = {};
  let bestCount = 0;
  for (let i = 0; i < matrix.length; i += 1) {
    const candidate = Array.isArray(matrix[i]) ? matrix[i] : [];
    const mapping = {};
    const usedFields = new Set();
    for (let c = 0; c < candidate.length; c += 1) {
      const field = MASS_HEADER_LOOKUP[normalizeHeader(candidate[c])];
      if (field && !usedFields.has(field)) {
        mapping[c] = field;
        usedFields.add(field);
      }
    }
    const count = Object.keys(mapping).length;
    if (count > bestCount) {
      bestCount = count;
      headerRowIndex = i;
      colToField = mapping;
    }
  }

  if (headerRowIndex === -1) {
    result.error =
      "Header kolom tidak dikenali. Gunakan tombol Export Excel untuk mendapatkan template yang benar.";
    return result;
  }

  const columns = Object.keys(colToField).map(Number);
  const dataRows = [];
  for (let r = headerRowIndex + 1; r < matrix.length; r += 1) {
    const raw = Array.isArray(matrix[r]) ? matrix[r] : [];
    const fieldObject = createEmptyFieldObject();
    let hasValue = false;
    for (const col of columns) {
      const value = cellToString(raw[col]);
      fieldObject[colToField[col]] = value;
      if (value !== "") {
        hasValue = true;
      }
    }
    if (!hasValue) {
      result.skippedBlank += 1;
      continue;
    }
    dataRows.push(fieldObject);
  }

  if (dataRows.length > MASS_MAX_ROWS) {
    result.droppedOverflow = dataRows.length - MASS_MAX_ROWS;
    dataRows.length = MASS_MAX_ROWS;
  }

  result.rows = dataRows;
  result.importedCount = dataRows.length;

  if (dataRows.length < MASS_MIN_ROWS) {
    if (dataRows.length === 0) {
      result.error = "Tidak ada baris data yang ditemukan pada file Excel.";
    } else {
      result.error = `Minimal ${MASS_MIN_ROWS} baris data diperlukan. Hanya ${dataRows.length} baris ditemukan.`;
    }
  }

  return result;
}
