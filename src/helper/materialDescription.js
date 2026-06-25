// Material description <-> SAP column mapping.
//
// SAP stores a material's description across four 40-char columns: the
// material description (MAKTX) plus three long-text continuation columns. The
// approver edits ONE combined box; these helpers map that single string to/from
// the four columns the rest of the system (edit save payload, field history,
// Oracle SAP staging) depends on.
//
// The mapping is a plain fixed-40 positional partition with a separator-less
// join, so combine() and split() are exact mutual inverses for any string up to
// 160 chars: combine(split(x)) === x and split(combine(cols)) === cols. This is
// what the requester wanted ("just concat 40 each") and, unlike a word-aware
// split, it can never inject a phantom space at a column boundary or silently
// drop an overflow chunk. The backend create flow
// (materialService.buildMaterialDescriptionAndLongText) uses the same fixed-40
// positional partition. The one difference: when create first builds the string
// from the spec it collapses internal whitespace runs, whereas an approver edit
// is preserved verbatim (1:1, see toSingleLine) so the box stays
// what-you-see-is-what-you-save; both still produce <=40-char columns.

export const MATERIAL_DESCRIPTION_COLUMN_KEYS = [
  "material_description",
  "long_text_1",
  "long_text_2",
  "long_text_3",
];

export const MATERIAL_DESCRIPTION_COLUMN_LENGTH = 40;
export const MATERIAL_DESCRIPTION_MAX_LENGTH =
  MATERIAL_DESCRIPTION_COLUMN_LENGTH * MATERIAL_DESCRIPTION_COLUMN_KEYS.length; // 160

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

// Partition a combined description into the four 40-char columns.
export function splitMaterialDescription(text) {
  const capped = toSingleLine(text).slice(0, MATERIAL_DESCRIPTION_MAX_LENGTH);
  return MATERIAL_DESCRIPTION_COLUMN_KEYS.reduce((result, key, index) => {
    result[key] = capped.slice(
      index * MATERIAL_DESCRIPTION_COLUMN_LENGTH,
      (index + 1) * MATERIAL_DESCRIPTION_COLUMN_LENGTH
    );
    return result;
  }, {});
}
