// Running number ("final code suffix") entry for a MASS request approved at the
// Master Data (MDM) stage.
//
// Master Data types ONE running number for the whole batch and the backend
// gives item k (1-based, ordered by item_no) that number + (k - 1), zero-padded
// back to the entered width — see buildMassItemFinalCodeSuffixes in
// backend/services/materialService.js. The suffix is therefore restricted to
// digits so the per-item step is arithmetic instead of an alphanumeric guess.
//
// The composed material code (material group + sub group + running number) is
// assembled server-side from codes this dialog does not hold, so the preview
// below can only show the running numbers, never the full codes.

export const MASS_FINAL_CODE_SUFFIX_LENGTH = 3;
export const MASS_FINAL_CODE_SUFFIX_PREVIEW_LIMIT = 3;

// Mirrors the backend's copy but stays in the app's instructional voice.
export const MASS_FINAL_CODE_SUFFIX_HELPER_TEXT =
  "Masukkan satu running number untuk seluruh batch. Item 1 memakai angka yang diinput, item berikutnya otomatis +1 (item 2 = +1, item 3 = +2, dan seterusnya).";

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

function toItemCount(itemCount) {
  const parsed = Number(itemCount);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/**
 * Running number for each item of the batch: entered suffix + (index), padded
 * back to the entered width. Stops at the width ceiling — a value that no
 * longer fits is reported as null so callers can flag the overflow instead of
 * silently widening the code (the backend answers that case with a 409).
 *
 * @returns {Array<{itemNo: number, suffix: string|null, value: number}>}
 */
export function buildMassFinalCodeSuffixes({ finalCodeSuffix, itemCount } = {}) {
  const suffix = String(finalCodeSuffix ?? "").trim();

  if (!isValidMassFinalCodeSuffix(suffix)) {
    return [];
  }

  const width = suffix.length;
  const ceiling = 10 ** width;
  const base = Number.parseInt(suffix, 10);
  const count = toItemCount(itemCount);
  const entries = [];

  for (let index = 0; index < count; index += 1) {
    const value = base + index;
    entries.push({
      itemNo: index + 1,
      value,
      suffix: value >= ceiling ? null : String(value).padStart(width, "0"),
    });
  }

  return entries;
}

/**
 * Client-side gate for the running-number input. Same two rules the backend
 * enforces (MASS_REQUEST_FINAL_CODE_SUFFIX_INVALID / _OVERFLOW), checked here so
 * Master Data is told before the round-trip. Collisions with existing codes stay
 * server-only — this dialog cannot know them.
 *
 * @returns {string} error message, or "" when the suffix is usable.
 */
export function validateMassFinalCodeSuffix({ finalCodeSuffix, itemCount } = {}) {
  const suffix = String(finalCodeSuffix ?? "").trim();

  if (!isValidMassFinalCodeSuffix(suffix)) {
    return `Running number must be exactly ${MASS_FINAL_CODE_SUFFIX_LENGTH} digits.`;
  }

  const count = toItemCount(itemCount);
  const overflow = buildMassFinalCodeSuffixes({ finalCodeSuffix: suffix, itemCount: count }).find(
    entry => entry.suffix === null
  );

  if (overflow) {
    return `Running number ${suffix} cannot cover ${count} items: item ${overflow.itemNo} would need ${overflow.value}, which is past the ${suffix.length}-digit range. Use a lower running number.`;
  }

  return "";
}

/**
 * First few running numbers the batch will take, for the preview under the
 * input. Truncated because a batch can hold dozens of items.
 *
 * @returns {{entries: Array<{itemNo: number, suffix: string|null, value: number}>, hasMore: boolean}}
 */
export function buildMassFinalCodeSuffixPreview({
  finalCodeSuffix,
  itemCount,
  limit = MASS_FINAL_CODE_SUFFIX_PREVIEW_LIMIT,
} = {}) {
  const all = buildMassFinalCodeSuffixes({ finalCodeSuffix, itemCount });
  const safeLimit = Math.max(0, Number(limit) || 0);

  return {
    entries: all.slice(0, safeLimit),
    hasMore: all.length > safeLimit,
  };
}

/**
 * "Item 1: 005, Item 2: 006, Item 3: 007, ..." — empty string when there is
 * nothing to preview yet (suffix still incomplete or no items loaded).
 */
export function formatMassFinalCodeSuffixPreview({
  finalCodeSuffix,
  itemCount,
  limit = MASS_FINAL_CODE_SUFFIX_PREVIEW_LIMIT,
} = {}) {
  const { entries, hasMore } = buildMassFinalCodeSuffixPreview({
    finalCodeSuffix,
    itemCount,
    limit,
  });

  if (entries.length === 0) {
    return "";
  }

  const parts = entries.map(
    entry => `Item ${entry.itemNo}: ${entry.suffix ?? String(entry.value)}`
  );

  return hasMore ? `${parts.join(", ")}, ...` : parts.join(", ");
}
