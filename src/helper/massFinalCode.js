// Running number ("final code suffix") entry for a MASS request approved at the
// Master Data (MDM) stage.
//
// Master Data types the running number for EACH item one by one — there is no
// batch-wide auto-increment. The backend composes the material code from
// material group + sub group + running number (3 characters, letters and/or
// digits, uppercased — its own comment gives "A01" as the example), so
// validation here mirrors that: a suffix is only unique within its item's
// own group + sub group, not across the whole batch. Whether a group/sub
// group actually resolves to a master record stays server-only — this
// dialog only splits a string, it doesn't look one up.

export const MASS_FINAL_CODE_SUFFIX_LENGTH = 3;

export const MASS_FINAL_CODE_SUFFIX_HELPER_TEXT =
  "Masukkan running number untuk setiap item satu per satu (3 karakter huruf/angka, unik per material group & sub group).";

const SUFFIX_PATTERN = /^[A-Z0-9]{3}$/;

// Keeps the input alphanumeric, uppercases it, and caps it at the fixed SAP
// segment width.
export function sanitizeMassFinalCodeSuffix(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, MASS_FINAL_CODE_SUFFIX_LENGTH);
}

export function isValidMassFinalCodeSuffix(finalCodeSuffix) {
  return SUFFIX_PATTERN.test(String(finalCodeSuffix ?? "").trim().toUpperCase());
}

// The material group/sub group are stored as free text in "CODE - NAME" form
// (same convention as the group's own select label elsewhere in the app).
// Two items compose the same material code only when their group, sub group,
// AND running number all match — not the bare running number.
function buildMassFinalCodeIdentity(materialGroup, materialSubGroup, suffix) {
  return [
    String(materialGroup ?? "").trim().toUpperCase(),
    String(materialSubGroup ?? "").trim().toUpperCase(),
    suffix,
  ].join("::");
}

/**
 * Client-side gate for the per-item running-number inputs. Every item needs
 * its own valid 3-character suffix, and two items cannot compose the same
 * material code (group + sub group + suffix) — mirroring the backend's
 * assertMassFinalCodesAreDistinct so Master Data sees the clash before the
 * round-trip. Cross-batch/SAP collisions stay server-only — this dialog
 * cannot know them.
 *
 * @param {object} opts
 * @param {Record<string, string>} opts.finalCodeSuffixes  suffix keyed by item id
 * @param {Array<{id: string|number, itemNo: number, materialGroup?: string, materialSubGroup?: string}>} opts.items
 * @returns {Record<string, string>} error message per item id; empty when all valid
 */
export function validateMassFinalCodeSuffixes({ finalCodeSuffixes = {}, items = [] } = {}) {
  const errors = {};
  const itemNoByIdentity = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const itemId = String(item?.id ?? "");
    if (!itemId) {
      continue;
    }

    const suffix = String(finalCodeSuffixes?.[itemId] ?? "").trim().toUpperCase();

    if (!isValidMassFinalCodeSuffix(suffix)) {
      errors[itemId] = `Running number harus ${MASS_FINAL_CODE_SUFFIX_LENGTH} karakter huruf/angka.`;
      continue;
    }

    const identity = buildMassFinalCodeIdentity(item?.materialGroup, item?.materialSubGroup, suffix);

    if (itemNoByIdentity.has(identity)) {
      errors[itemId] = `Running number ${suffix} sudah dipakai item ${itemNoByIdentity.get(identity)}.`;
    } else {
      itemNoByIdentity.set(identity, item?.itemNo ?? itemId);
    }
  }

  return errors;
}

/**
 * Joins a mass item's description and (optional) PO text into the single
 * cell the running-number table shows them in. PO text is explicitly
 * optional in the mass validation rules, so an absent one must not leave a
 * trailing space.
 *
 * @param {string} description
 * @param {string} [poText]
 * @returns {string} description and PO text joined by one space; either half may be empty
 */
export function joinMassItemDescription(description, poText) {
  const parts = [String(description ?? "").trim(), String(poText ?? "").trim()];
  return parts.filter(Boolean).join(" ");
}

/**
 * Splits a "CODE - NAME" group/sub group value into its two display parts.
 * When the value doesn't split (a broken or unrecognised row), the raw text
 * renders as the code with no name caption, rather than blanking the cell.
 *
 * @param {string} value
 * @returns {{code: string, name: string}} name is empty when the value doesn't split
 */
export function splitMassGroupLabel(value) {
  const raw = String(value ?? "").trim();
  const separatorIndex = raw.indexOf(" - ");
  if (separatorIndex === -1) {
    return { code: raw, name: "" };
  }
  return {
    code: raw.slice(0, separatorIndex).trim(),
    name: raw.slice(separatorIndex + 3).trim(),
  };
}
