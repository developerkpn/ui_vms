// Pure validation helpers for the Mass Material Request form.
// Mirrors the shape of singleMaterialFormValidation.mjs / attachmentValidation.mjs.
// The 8 text fields are all free-form (no dropdowns), so per-row validation is
// a single pass: trim, check non-empty, then check attachments count.

export const MASS_MAX_ROWS = 10;
export const MASS_MIN_ROWS = 2;
export const MASS_MAX_ATTACHMENTS_PER_ROW = 3;
export const MASS_MIN_ATTACHMENTS_PER_ROW = 1;
export const MASS_SHARED_MIN_ATTACHMENTS = 1;
export const MASS_MAX_DESCRIPTION_LENGTH = 40;

export const MASS_OPTIONAL_FIELDS = new Set(["poText", "spesifikasiTambahan"]);

export const MASS_TEXT_FIELDS = [
  "plant",
  "sloc",
  "materialGroup",
  "materialSubGroup",
  "description",
  "poText",
  "uom",
  "spesifikasiTambahan",
];

const FIELD_INDONESIAN_MESSAGES = {
  plant: "Plant wajib diisi.",
  sloc: "Sloc wajib diisi.",
  materialGroup: "Material group wajib diisi.",
  materialSubGroup: "Sub material group wajib diisi.",
  description: "Material description wajib diisi.",
  uom: "Base UoM wajib diisi.",
};

const toTrimmedString = value => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
};

const createFieldError = (message = "") => ({ error: true, message });

const isNonEmptyString = value => toTrimmedString(value) !== "";

// Uppercase rule for a mass row's material fields (IBE-022). The single
// definition every entry route calls: direct typing, Excel import, rework
// re-edit, and the approval dialog's edit. Never applied to the mass request
// reason (IBE-031) — that field is prose, not a material field.
export function normalizeMassMaterialFieldValue(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).toUpperCase();
}

// Returns true iff any of the row's 8 text fields has a non-blank value (after trim).
export function isMassRowFilled(row) {
  if (!row || typeof row !== "object") {
    return false;
  }
  return MASS_TEXT_FIELDS.some(fieldKey => isNonEmptyString(row[fieldKey]));
}

// Validates a single row's text + attachment count.
// Returns { errors: { [fieldKey]: { error, message } } } — empty object = valid.
// An empty row (no text fields filled) returns no errors; the batch validator
// is responsible for enforcing the "1..10 filled rows" rule.
export function validateMassRow(row) {
  const errors = {};

  if (!row || typeof row !== "object") {
    return errors;
  }

  if (!isMassRowFilled(row)) {
    return errors;
  }

  for (const fieldKey of MASS_TEXT_FIELDS) {
    if (MASS_OPTIONAL_FIELDS.has(fieldKey)) {
      continue;
    }
    if (!isNonEmptyString(row[fieldKey])) {
      errors[fieldKey] = createFieldError(
        FIELD_INDONESIAN_MESSAGES[fieldKey] || "Field wajib diisi."
      );
    }
  }

  const description = toTrimmedString(row.description);
  if (description && description.length > MASS_MAX_DESCRIPTION_LENGTH) {
    errors.description = createFieldError(
      `Material description maksimal ${MASS_MAX_DESCRIPTION_LENGTH} karakter.`
    );
  }

  return errors;
}

// Validates the full 10-row batch.
// Returns:
//   errors: { [rowIndex]: { [fieldKey]: { error, message } } }
//   filledRowIndexes: number[] (row indexes that are not empty)
export function validateMassRequestBatch(rows, options = {}) {
  const { useSharedImage = false, sharedFileCount = 0 } = options;
  const errors = {};
  const filledRowIndexes = [];
  const sourceRows = Array.isArray(rows) ? rows : [];

  if (sourceRows.length > MASS_MAX_ROWS) {
    errors[-1] = {
      rows: createFieldError(`Maksimal ${MASS_MAX_ROWS} baris per submit.`),
    };
  }

  for (let rowIndex = 0; rowIndex < sourceRows.length; rowIndex += 1) {
    const row = sourceRows[rowIndex] || {};
    if (!isMassRowFilled(row)) {
      continue;
    }
    filledRowIndexes.push(rowIndex);

    const rowErrors = validateMassRow(row);

    if (!useSharedImage) {
      const attachments = Array.isArray(row.attachments) ? row.attachments : [];
      if (attachments.length < MASS_MIN_ATTACHMENTS_PER_ROW) {
        rowErrors.attachments = createFieldError(
          `Minimal ${MASS_MIN_ATTACHMENTS_PER_ROW} attachment per baris.`
        );
      } else if (attachments.length > MASS_MAX_ATTACHMENTS_PER_ROW) {
        rowErrors.attachments = createFieldError(
          `Maksimal ${MASS_MAX_ATTACHMENTS_PER_ROW} attachment per baris.`
        );
      }
    }

    if (Object.keys(rowErrors).length > 0) {
      errors[rowIndex] = rowErrors;
    }
  }

  if (filledRowIndexes.length < MASS_MIN_ROWS) {
    if (!errors[-1]) {
      errors[-1] = {};
    }
    errors[-1].rows = createFieldError("Minimal 2 baris harus diisi.");
  }

  if (useSharedImage && sharedFileCount < MASS_SHARED_MIN_ATTACHMENTS) {
    if (!errors[-1]) {
      errors[-1] = {};
    }
    errors[-1].sharedAttachments = createFieldError(
      "Minimal 1 attachment harus diisi untuk mode file bersama."
    );
  }

  return { errors, filledRowIndexes };
}

// Maps server-side errors (array of {rowIndex, fieldKey, message})
// to the same nested shape used by validateMassRequestBatch.
export function mapMassRequestServerErrors(serverErrors = []) {
  const errors = {};
  const list = Array.isArray(serverErrors) ? serverErrors : [];

  for (const serverError of list) {
    if (!serverError || typeof serverError !== "object") {
      continue;
    }

    const rowIndex = Number.isInteger(serverError.rowIndex)
      ? serverError.rowIndex
      : -1;
    const fieldKey = String(serverError.fieldKey || "rows");
    const message = String(serverError.message || "");

    if (!message) {
      continue;
    }

    if (!errors[rowIndex]) {
      errors[rowIndex] = {};
    }
    errors[rowIndex][fieldKey] = createFieldError(message);
  }

  return errors;
}
