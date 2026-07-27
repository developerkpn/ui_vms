// Material description <-> SAP column mapping.
//
// SAP stores a material's description across four columns: the material
// description (MAKTX, hard-capped at 40) plus three long-text continuation
// columns of 70 chars each (they reach SAP via SAVE_TEXT/TDLINE, 132 per line,
// so they can be wider than MAKTX) — 250 chars combined. The approver edits ONE
// combined box; these helpers map that single string to/from the four columns
// the rest of the system (edit save payload, field history, Oracle SAP staging)
// depends on.
//
// The mapping is a plain fixed-position partition with a separator-less join,
// so combine() and split() are exact mutual inverses for any string up to 250
// chars: combine(split(x)) === x and split(combine(cols)) === cols. Unlike a
// word-aware split, it can never inject a phantom space at a column boundary or
// silently drop an overflow chunk. The backend create flow
// (materialService.buildMaterialDescriptionAndLongText) uses the same
// fixed-position partition. The one difference: when create first builds the
// string from the spec it collapses internal whitespace runs, whereas an
// approver edit is preserved verbatim (1:1, see toSingleLine) so the box stays
// what-you-see-is-what-you-save; both still respect the per-column widths.

export const MATERIAL_DESCRIPTION_COLUMN_KEYS = [
  "material_description",
  "long_text_1",
  "long_text_2",
  "long_text_3",
];

// Per-column widths: MAKTX 40 + 3 long-text columns of 70.
export const MATERIAL_DESCRIPTION_COLUMN_LENGTHS = [40, 70, 70, 70];
export const MATERIAL_DESCRIPTION_MAX_LENGTH =
  MATERIAL_DESCRIPTION_COLUMN_LENGTHS.reduce((sum, len) => sum + len, 0); // 250

// Collapse newlines/tabs to a single space 1:1 (length-preserving) so a typed
// or pasted line break never reaches a SAP column, while keeping the round-trip
// lossless. Runs of spaces are intentionally NOT collapsed here so the box stays
// what-you-see-is-what-you-save.
function toSingleLine(value) {
  return String(value ?? "").replace(/\s/g, " ");
}

// Concatenate the four stored columns back into the single string the approver
// edits. Separator-less because the columns are a positional partition.
export function combineMaterialDescription(values = {}) {
  return MATERIAL_DESCRIPTION_COLUMN_KEYS
    .map(key => String(values?.[key] ?? ""))
    .join("");
}

// Partition a combined description into the four fixed-width columns.
export function splitMaterialDescription(text) {
  const capped = toSingleLine(text).slice(0, MATERIAL_DESCRIPTION_MAX_LENGTH);
  let offset = 0;
  return MATERIAL_DESCRIPTION_COLUMN_KEYS.reduce((result, key, index) => {
    const length = MATERIAL_DESCRIPTION_COLUMN_LENGTHS[index];
    result[key] = capped.slice(offset, offset + length);
    offset += length;
    return result;
  }, {});
}
