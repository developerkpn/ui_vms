// Running number ("final code suffix") entry for a MASS request approved at the
// Master Data (MDM) stage.
//
// Master Data types the running number for EACH item one by one — there is no
// batch-wide auto-increment. The composed material code (material group + sub
// group + running number) is assembled server-side from codes this dialog does
// not hold, so validation here only checks the entered digits per item.

export const MASS_FINAL_CODE_SUFFIX_LENGTH = 3;

export const MASS_FINAL_CODE_SUFFIX_HELPER_TEXT =
  "Masukkan running number untuk setiap item satu per satu (3 digit, unik per item).";

const SUFFIX_PATTERN = /^\d{3}$/;

// Keeps the input digits-only and capped at the fixed SAP segment width.
export function sanitizeMassFinalCodeSuffix(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, MASS_FINAL_CODE_SUFFIX_LENGTH);
}

export function isValidMassFinalCodeSuffix(finalCodeSuffix) {
  return SUFFIX_PATTERN.test(String(finalCodeSuffix ?? "").trim());
}

/**
 * Client-side gate for the per-item running-number inputs. Every item needs
 * its own valid 3-digit suffix, and two items cannot share one — mirroring
 * the backend's assertMassFinalCodesAreDistinct so Master Data sees the
 * clash before the round-trip. Cross-batch/SAP collisions stay server-only —
 * this dialog cannot know them.
 *
 * @param {object} opts
 * @param {Record<string, string>} opts.finalCodeSuffixes  suffix keyed by item id
 * @param {Array<{id: string|number, itemNo: number}>} opts.items
 * @returns {Record<string, string>} error message per item id; empty when all valid
 */
export function validateMassFinalCodeSuffixes({ finalCodeSuffixes = {}, items = [] } = {}) {
  const errors = {};
  const itemNoBySuffix = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const itemId = String(item?.id ?? "");
    if (!itemId) {
      continue;
    }

    const suffix = String(finalCodeSuffixes?.[itemId] ?? "").trim();

    if (!isValidMassFinalCodeSuffix(suffix)) {
      errors[itemId] = `Running number harus ${MASS_FINAL_CODE_SUFFIX_LENGTH} digit angka.`;
      continue;
    }

    if (itemNoBySuffix.has(suffix)) {
      errors[itemId] = `Running number ${suffix} sudah dipakai item ${itemNoBySuffix.get(suffix)}.`;
    } else {
      itemNoBySuffix.set(suffix, item?.itemNo ?? itemId);
    }
  }

  return errors;
}
