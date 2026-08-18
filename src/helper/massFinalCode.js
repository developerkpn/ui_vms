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
  "Enter a running number for each item one by one (3 letters/digits, unique per material group & sub group).";

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
      errors[itemId] = `Running number must be ${MASS_FINAL_CODE_SUFFIX_LENGTH} letters/digits.`;
      continue;
    }

    const identity = buildMassFinalCodeIdentity(item?.materialGroup, item?.materialSubGroup, suffix);

    if (itemNoByIdentity.has(identity)) {
      errors[itemId] = `Running number ${suffix} is already used by item ${itemNoByIdentity.get(identity)}.`;
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

/**
 * Display parts for one group / sub group cell in the running-number table.
 *
 * Mass items carry whatever the Excel import put in the column, which for a
 * group is normally the bare code ("901") — unlike the single form, whose
 * select stores the composed "CODE - NAME". So the split alone cannot produce
 * the name caption the design asks for, and a lookup fills it in when the
 * value did not carry one. The lookup is a fallback, never an override: a
 * value that already spells out its own name keeps that name, so a renamed
 * master record can never silently relabel a request that was filed under the
 * old wording.
 *
 * @param {string} value - The stored group / sub group value.
 * @param {Map<string, string>|Record<string, string>} [nameByCode] - code -> name.
 * @returns {{code: string, name: string}} name is empty when neither source has one.
 */
export function resolveMassGroupLabel(value, nameByCode) {
  const { code, name } = splitMassGroupLabel(value);

  if (name || !code) {
    return { code, name };
  }

  return { code, name: lookupName(nameByCode, code) };
}

// Accepts a Map or a plain object so a caller can build whichever is handier.
// Codes are matched case-insensitively and trimmed, the same way
// buildMassFinalCodeIdentity normalizes them.
function lookupName(nameByCode, code) {
  if (!nameByCode) {
    return "";
  }

  const key = code.trim().toUpperCase();
  const raw =
    nameByCode instanceof Map
      ? nameByCode.get(key)
      : nameByCode[key];

  return String(raw ?? "").trim();
}

/**
 * code -> name map for resolveMassGroupLabel, from any list of records that
 * carry a code and a name (the groups dropdown and a form schema's subgroups
 * both do). Keys are uppercased so lookup is case-insensitive.
 *
 * @param {{code?: string, name?: string}[]} records
 * @returns {Map<string, string>}
 */
export function buildMassGroupNameMap(records) {
  const map = new Map();

  for (const record of Array.isArray(records) ? records : []) {
    const code = String(record?.code ?? "").trim().toUpperCase();
    const name = String(record?.name ?? "").trim();

    if (code && name && !map.has(code)) {
      map.set(code, name);
    }
  }

  return map;
}
