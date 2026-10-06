// After a material request is submitted, the backend asks an AI recommender
// which already-catalogued materials look like the one being asked for, and
// stores the ranked answer per material line. This module owns everything about
// that answer that is not JSX: the shape the backend sends, the thresholds that
// colour a similarity, and the two paths the panel talks to.
//
// ADVISORY ONLY. Nothing here gates an approval — the ranking is a reason to go
// and look before creating a duplicate, not a verdict. The panel drawn from it
// disappears entirely when the feature is switched off server-side.
//
// Import-free on purpose: the tests load this file through a data: URL rather
// than a bundler (see materialAiMatch.test.mjs).

export const AI_MATCH_STATUS = Object.freeze({
  PENDING: "PENDING",
  DONE: "DONE",
  FAILED: "FAILED",
});

/** How often the panel re-reads a run that has not finished yet. */
export const AI_MATCH_POLL_INTERVAL_MS = 5000;

// 2 minutes at the interval above. A run is a handful of HTTP calls to the
// recommender, so anything still PENDING past this is a stuck worker a re-run
// fixes faster than more polling would.
export const AI_MATCH_MAX_POLLS = 24;

/** Similarity floors for the "this is probably the same material" colouring. */
export const AI_MATCH_TONE_THRESHOLDS = Object.freeze({
  success: 0.9,
  warning: 0.75,
});

/**
 * The recommender's own match_type vocabulary, in reader's language. The raw
 * values are its internal labels — readable, but written for a log rather than
 * for a column in an approval dialog.
 */
export const MATCH_TYPE_LABELS = Object.freeze({
  "EXACT (code + name match)": "Exact code + name",
  "CODE EXISTS (name low similarity)": "Code exists, name differs",
  TEXT: "Text similarity",
  "TEXT + same subgroup": "Text + same sub group",
  "TEXT + same group": "Text + same group",
  "PART NUMBER": "Same part number",
  "SIMILAR PART NUMBER": "Similar part number",
  "NEAR PART NUMBER": "Part number 1 char off",
});

/** Where a recommendation comes from (the backend's AI_MATCH_SOURCE). */
export const AI_MATCH_SOURCE = Object.freeze({
  CATALOG: "catalog",
  REQUEST: "request",
});

const AI_MATCH_KINDS = Object.freeze(["single", "mass"]);

/** "" for anything absent, so a caller never has to hold null-vs-undefined. */
function asText(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

/** First value that was actually sent; undefined when none of them was. */
function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
}

/** Non-empty strings only — the NER entity arrays arrive padded with blanks. */
function asStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(entry => asText(entry).trim()).filter(Boolean);
}

/** A number, or null when the value is not one. Numeric strings are accepted. */
function toNumberOrNull(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The recommender's match_type in reader's language.
 *
 * @param {*} type - Raw match_type.
 * @returns {string} Its label, the raw string when unknown, "-" when empty.
 */
export function describeMatchType(type) {
  const raw = asText(type).trim();
  if (!raw) return "-";
  return MATCH_TYPE_LABELS[raw] || raw;
}

/**
 * A similarity as a 0..1 number. NUMERIC columns come back from pg as strings,
 * so a numeric string is as legitimate here as a number.
 *
 * @param {*} value
 * @returns {number|null} null when the value is not a number at all.
 */
export function toSimilarity(value) {
  const parsed = toNumberOrNull(value);
  if (parsed === null) return null;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

/**
 * A similarity as a percentage, one decimal — "97.3%".
 *
 * @param {*} value
 * @returns {string} "-" when there is no similarity to show.
 */
export function formatSimilarityPercent(value) {
  const similarity = toSimilarity(value);
  if (similarity === null) return "-";
  return `${(similarity * 100).toFixed(1)}%`;
}

/**
 * Which of the three colour tones a similarity earns.
 *
 * @param {*} value
 * @returns {"success"|"warning"|"neutral"}
 */
export function similarityTone(value) {
  const similarity = toSimilarity(value);
  if (similarity === null) return "neutral";
  if (similarity >= AI_MATCH_TONE_THRESHOLDS.success) return "success";
  if (similarity >= AI_MATCH_TONE_THRESHOLDS.warning) return "warning";
  return "neutral";
}

/**
 * One recommendation, renumbered by its position: the rank the approver reads
 * is the order the recommender returned, whatever the payload claims.
 */
function normalizeRecommendation(recommendation, index) {
  const source =
    recommendation && typeof recommendation === "object" ? recommendation : {};

  return {
    rank: index + 1,
    code: asText(firstDefined(source.code, source.material_code)),
    name: asText(firstDefined(source.name, source.material_name)),
    similarity: toSimilarity(source.similarity),
    matchType: asText(firstDefined(source.matchType, source.match_type)),
    // A request that is not in SAP yet (open, approved but not synced, or
    // another line of the same form): its code is a request number, and it
    // cannot be picked as the existing material to use.
    source:
      source.source === AI_MATCH_SOURCE.REQUEST
        ? AI_MATCH_SOURCE.REQUEST
        : AI_MATCH_SOURCE.CATALOG,
    requestStatus: asText(firstDefined(source.requestStatus, source.request_status)),
    // Flagged for deletion in SAP or renamed "(NOT USE)": the same part, but
    // not one to reuse as is.
    retired: source.retired === true,
  };
}

/** Whether a recommendation is a request rather than an SAP material. */
export function isRequestRecommendation(item) {
  return Boolean(item && item.source === AI_MATCH_SOURCE.REQUEST);
}

/**
 * One AI match run, in the shape the panel draws. Accepts the backend DTO
 * (camelCase) and a bare table row (snake_case) alike, so a caller never has to
 * know which layer handed it the row.
 *
 * @param {object} row
 * @returns {object|null} null when there is no run.
 */
export function normalizeAiMatch(row) {
  if (!row) return null;

  const query = row.query && typeof row.query === "object" ? row.query : {};
  const entities = row.entities && typeof row.entities === "object" ? row.entities : {};
  const recommendations = Array.isArray(row.recommendations) ? row.recommendations : [];

  return {
    id: firstDefined(row.id) ?? null,
    requestId: firstDefined(row.requestId, row.request_id) ?? null,
    itemNo: firstDefined(row.itemNo, row.item_no) ?? null,
    status:
      asText(row.status).trim().toUpperCase() || AI_MATCH_STATUS.PENDING,
    error: asText(row.error),
    query: {
      code: asText(firstDefined(query.code, row.query_code)),
      name: asText(firstDefined(query.name, row.query_name)),
      desc: asText(firstDefined(query.desc, row.query_desc)),
    },
    correctedName: asText(firstDefined(row.correctedName, row.corrected_name)),
    typoCorrected: Boolean(firstDefined(row.typoCorrected, row.typo_corrected)),
    entities: {
      category: asStringList(entities.category),
      specs: asStringList(entities.specs),
    },
    recommendations: recommendations.map(normalizeRecommendation),
    topSimilarity: toSimilarity(firstDefined(row.topSimilarity, row.top_similarity)),
    latencyMs: toNumberOrNull(firstDefined(row.latencyMs, row.latency_ms)),
    updatedAt: firstDefined(row.updatedAt, row.updated_at) ?? null,
    requesterReview: normalizeRequesterReview(row.requesterReview),
  };
}

/**
 * What the requester answered before saving. null unless they explicitly
 * confirmed "brand new": no pre-save check (feature off, AI down, a rework) is
 * not the same thing as a confirmation, and the panel must not say it is.
 */
function normalizeRequesterReview(review) {
  if (!review || typeof review !== "object" || review.confirmedNew !== true) return null;
  return {
    confirmedNew: true,
    reviewedAt: firstDefined(review.reviewedAt) ?? null,
    shownCount: toNumberOrNull(review.shownCount) ?? 0,
  };
}

/**
 * The mass endpoint answers with a list, the single one with a row or null —
 * both end up here so the panel only ever holds an array.
 *
 * @param {*} value - Row, array of rows, or nothing.
 * @returns {object[]}
 */
export function normalizeAiMatchList(value) {
  if (!value) return [];

  const rows = Array.isArray(value) ? value : [value];
  return rows.map(row => normalizeAiMatch(row)).filter(Boolean);
}

/**
 * True while a run is still worth re-reading: something is PENDING and the
 * panel has not spent its poll budget yet.
 *
 * @param {object|object[]|null} rows
 * @param {number} pollCount - Polls already spent.
 * @param {number} [maxPolls]
 * @returns {boolean}
 */
export function shouldKeepPolling(rows, pollCount, maxPolls = AI_MATCH_MAX_POLLS) {
  const spent = toNumberOrNull(pollCount) ?? 0;
  const budget = toNumberOrNull(maxPolls) ?? AI_MATCH_MAX_POLLS;
  if (spent >= budget) return false;

  const list = Array.isArray(rows) ? rows : [rows];
  return list.some(
    row => asText(row?.status).trim().toUpperCase() === AI_MATCH_STATUS.PENDING
  );
}

/**
 * The one line worth reading at a glance: the best match a finished run found.
 *
 * @param {object} row
 * @returns {{code: string, name: string, similarity: number|null, tone: string}|null}
 *   null while the run is unfinished, failed, or found nothing.
 */
export function summarizeTopMatch(row) {
  const match = normalizeAiMatch(row);
  if (!match || match.status !== AI_MATCH_STATUS.DONE) return null;

  const top = match.recommendations[0];
  if (!top) return null;

  return {
    code: top.code,
    name: top.name,
    similarity: top.similarity,
    tone: similarityTone(top.similarity),
  };
}

/**
 * @param {"single"|"mass"} kind
 * @param {string|number} requestId - Single request id, or mass batch id.
 * @returns {string} Read path for this request's AI match.
 */
export function buildAiMatchPath(kind, requestId) {
  if (!AI_MATCH_KINDS.includes(kind)) {
    throw new Error(`Unknown AI match kind: ${kind}`);
  }

  return `/material/requests/${kind}/${encodeURIComponent(requestId)}/ai-match`;
}

/**
 * @param {"single"|"mass"} kind
 * @param {string|number} requestId
 * @returns {string} Path that queues a fresh run for this request.
 */
export function buildAiMatchRerunPath(kind, requestId) {
  return `${buildAiMatchPath(kind, requestId)}/rerun`;
}

// --- Pre-save check ---------------------------------------------------------
//
// Before a new request is written, the requester is shown the existing
// materials that look like each line and answers per line: "it is this one"
// (the line is not submitted) or "none of these, it is a brand new material".
// Only brand-new lines are saved, and their confirmation is sent along so the
// approvers can see the requester already looked.

/** Where the pre-save check is asked. */
export const AI_PRECHECK_PATH = "/material/ai-match/preview";

/** The choice value for "none of these — it is a brand new material". */
export const AI_PRECHECK_NEW = "__new__";

/** A mass request has to keep at least this many lines to be submitted. */
export const AI_PRECHECK_MASS_MIN_NEW_LINES = 2;

/**
 * One line of the preview answer, in the shape the dialog draws. Same fields
 * as a stored run (so the same table renders it) plus the line's key.
 */
export function normalizePrecheckLine(line) {
  const match = normalizeAiMatch(line);
  if (!match) return null;
  return { ...match, key: line.key ?? null };
}

/**
 * A line the requester has to answer: only a finished check that found
 * something. A failed check or one with no candidates is new by default —
 * there is nothing to pick from.
 */
export function precheckNeedsChoice(line) {
  return Boolean(
    line && line.status === AI_MATCH_STATUS.DONE && line.recommendations.length > 0
  );
}

/**
 * The choice a line starts with: undecided when it has candidates, new when
 * it has none.
 */
export function initialPrecheckChoice(line) {
  return precheckNeedsChoice(line) ? "" : AI_PRECHECK_NEW;
}

/**
 * Where the requester's answers stand.
 *
 * @param {object[]} lines - Normalized preview lines.
 * @param {Record<string, string>} choices - key → AI_PRECHECK_NEW, or the picked code.
 * @returns {{allDecided: boolean, newKeys: Array, existing: Array<{key, itemLabel, code, name}>}}
 */
export function summarizePrecheck(lines, choices) {
  const list = Array.isArray(lines) ? lines.filter(Boolean) : [];
  const answers = choices && typeof choices === "object" ? choices : {};
  const newKeys = [];
  const existing = [];
  let allDecided = true;

  for (const line of list) {
    const choice = asText(answers[line.key]);
    if (!choice) {
      allDecided = false;
      continue;
    }
    if (choice === AI_PRECHECK_NEW) {
      newKeys.push(line.key);
      continue;
    }
    const picked = line.recommendations.find(item => item.code === choice);
    existing.push({
      key: line.key,
      query: line.query.name,
      code: choice,
      name: picked ? picked.name : "",
    });
  }

  return { allDecided, newKeys, existing };
}

/**
 * The confirmation for one brand-new line, as the save endpoints take it.
 * null for a line whose check failed: the requester was shown nothing, so
 * there is nothing to confirm.
 */
export function buildPrecheckReview(line) {
  if (!line || line.status !== AI_MATCH_STATUS.DONE) return null;
  return {
    confirmedNew: true,
    recommendations: line.recommendations.map(item => ({
      code: item.code,
      name: item.name,
      similarity: item.similarity,
      matchType: item.matchType,
      source: item.source,
      requestStatus: item.requestStatus,
      retired: item.retired,
    })),
  };
}

/**
 * The mass confirmation payload: one entry per brand-new line, keyed by the
 * form row it came from. null when there is nothing to record.
 */
export function buildMassPrecheckReview(lines, newKeys) {
  const wanted = new Set(Array.isArray(newKeys) ? newKeys : []);
  const rows = (Array.isArray(lines) ? lines : [])
    .filter(line => line && wanted.has(line.key))
    .map(line => {
      const review = buildPrecheckReview(line);
      return review ? { rowIndex: line.key, ...review } : null;
    })
    .filter(Boolean);
  return rows.length > 0 ? { rows } : null;
}
