import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The helper is an ES module inside a package that defaults to CommonJS, so a
// plain import of the .js path would be parsed as CJS and blow up on `export`.
// The module has no imports of its own, so loading its source through a data:
// URL gives the real exports without a bundler.
const helperPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "materialAiMatch.js"
);
const helper = await import(
  `data:text/javascript;base64,${fs.readFileSync(helperPath).toString("base64")}`
);

const {
  AI_MATCH_MAX_POLLS,
  AI_MATCH_POLL_INTERVAL_MS,
  AI_MATCH_STATUS,
  AI_MATCH_TONE_THRESHOLDS,
  buildAiMatchPath,
  buildAiMatchRerunPath,
  describeMatchType,
  formatSimilarityPercent,
  MATCH_TYPE_LABELS,
  isRequestRecommendation,
  normalizeAiMatch,
  normalizeAiMatchList,
  shouldKeepPolling,
  similarityTone,
  summarizeTopMatch,
  toSimilarity,
} = helper;

/** A backend DTO as the single-request endpoint sends it. */
function buildDto(overrides = {}) {
  return {
    id: 11,
    requestKind: "SINGLE",
    requestId: 402,
    massRequestId: null,
    status: AI_MATCH_STATUS.DONE,
    error: null,
    query: { code: "", name: "PUMP LIFT", desc: "50HZ" },
    correctedName: "PUMP LIFT",
    typoCorrected: false,
    entities: { category: ["PUMP"], specs: ["50HZ (frequency)"] },
    recommendations: [
      {
        rank: 1,
        code: "935.461.472",
        name: "P/N 31755122 INSERT EXHAUST",
        similarity: 0.9731,
        matchType: "TEXT",
      },
      {
        rank: 2,
        code: "935.461.473",
        name: "PUMP LIFT 50HZ",
        similarity: 0.8012,
        matchType: "TEXT + same group",
      },
    ],
    topSimilarity: 0.9731,
    latencyMs: 190,
    createdAt: "2026-09-22T03:00:00.000Z",
    updatedAt: "2026-09-22T03:00:01.000Z",
    ...overrides,
  };
}

test("the status vocabulary and poll budget are the ones the backend writes", () => {
  assert.deepEqual(AI_MATCH_STATUS, { PENDING: "PENDING", DONE: "DONE", FAILED: "FAILED" });
  assert.equal(AI_MATCH_POLL_INTERVAL_MS, 5000);
  assert.equal(AI_MATCH_MAX_POLLS, 24);
  assert.deepEqual(AI_MATCH_TONE_THRESHOLDS, { success: 0.9, warning: 0.75 });
  assert.throws(() => {
    AI_MATCH_STATUS.PENDING = "nope";
  });
});

test("every match_type the recommender can send has a reader's label", () => {
  assert.equal(describeMatchType("EXACT (code + name match)"), "Exact code + name");
  assert.equal(describeMatchType("CODE EXISTS (name low similarity)"), "Code exists, name differs");
  assert.equal(describeMatchType("TEXT"), "Text similarity");
  assert.equal(describeMatchType("TEXT + same subgroup"), "Text + same sub group");
  assert.equal(describeMatchType("TEXT + same group"), "Text + same group");
  assert.equal(describeMatchType("PART NUMBER"), "Same part number");
  assert.equal(describeMatchType("SIMILAR PART NUMBER"), "Similar part number");
  assert.equal(describeMatchType("NEAR PART NUMBER"), "Part number 1 char off");
  assert.equal(Object.keys(MATCH_TYPE_LABELS).length, 8);
});

test("an unknown match_type is shown as sent, an absent one as a dash", () => {
  assert.equal(describeMatchType("VECTOR"), "VECTOR");
  assert.equal(describeMatchType("  TEXT  "), "Text similarity");
  assert.equal(describeMatchType(""), "-");
  assert.equal(describeMatchType(null), "-");
  assert.equal(describeMatchType(undefined), "-");
});

test("a similarity is a 0..1 number, however pg typed it", () => {
  assert.equal(toSimilarity(0.9731), 0.9731);
  assert.equal(toSimilarity("0.9731"), 0.9731);
  assert.equal(toSimilarity(" 0.5 "), 0.5);
  assert.equal(toSimilarity(0), 0);
  assert.equal(toSimilarity(1), 1);
});

test("a similarity outside 0..1 is clamped, a non-number is nothing", () => {
  assert.equal(toSimilarity(1.4), 1);
  assert.equal(toSimilarity(-0.2), 0);
  assert.equal(toSimilarity(null), null);
  assert.equal(toSimilarity(undefined), null);
  assert.equal(toSimilarity(""), null);
  assert.equal(toSimilarity("   "), null);
  assert.equal(toSimilarity("high"), null);
  assert.equal(toSimilarity(Number.NaN), null);
  assert.equal(toSimilarity(Number.POSITIVE_INFINITY), null);
  assert.equal(toSimilarity({}), null);
});

test("a similarity reads as a percentage with one decimal", () => {
  assert.equal(formatSimilarityPercent(0.9731), "97.3%");
  assert.equal(formatSimilarityPercent("0.8012"), "80.1%");
  assert.equal(formatSimilarityPercent(1), "100.0%");
  assert.equal(formatSimilarityPercent(0), "0.0%");
  assert.equal(formatSimilarityPercent(null), "-");
  assert.equal(formatSimilarityPercent("n/a"), "-");
});

test("the colour tone changes exactly at the two thresholds", () => {
  assert.equal(similarityTone(0.9), "success");
  assert.equal(similarityTone(0.95), "success");
  assert.equal(similarityTone(0.8999), "warning");
  assert.equal(similarityTone(0.75), "warning");
  assert.equal(similarityTone(0.7499), "neutral");
  assert.equal(similarityTone(0), "neutral");
  assert.equal(similarityTone(null), "neutral");
  assert.equal(similarityTone("0.9"), "success");
});

test("a DTO normalizes into the shape the panel draws", () => {
  const match = normalizeAiMatch(buildDto());

  assert.equal(match.id, 11);
  assert.equal(match.requestId, 402);
  assert.equal(match.itemNo, null);
  assert.equal(match.status, "DONE");
  assert.equal(match.error, "");
  assert.deepEqual(match.query, { code: "", name: "PUMP LIFT", desc: "50HZ" });
  assert.equal(match.correctedName, "PUMP LIFT");
  assert.equal(match.typoCorrected, false);
  assert.deepEqual(match.entities, { category: ["PUMP"], specs: ["50HZ (frequency)"] });
  assert.equal(match.topSimilarity, 0.9731);
  assert.equal(match.latencyMs, 190);
  assert.equal(match.updatedAt, "2026-09-22T03:00:01.000Z");
});

test("a raw snake_case row normalizes the same way as the DTO", () => {
  const match = normalizeAiMatch({
    id: 12,
    request_id: 77,
    item_no: 3,
    status: "done",
    error: null,
    query_code: "935.461.472",
    query_name: "BEARING",
    query_desc: "SKF",
    corrected_name: "BEARING",
    typo_corrected: true,
    entities: { category: ["BEARING"], specs: [] },
    recommendations: [{ code: "1", name: "BEARING SKF", similarity: "0.61", match_type: "TEXT" }],
    top_similarity: "0.61",
    latency_ms: "204.5",
    updated_at: "2026-09-22T04:00:00.000Z",
  });

  assert.equal(match.requestId, 77);
  assert.equal(match.itemNo, 3);
  assert.equal(match.status, "DONE");
  assert.deepEqual(match.query, { code: "935.461.472", name: "BEARING", desc: "SKF" });
  assert.equal(match.typoCorrected, true);
  assert.equal(match.topSimilarity, 0.61);
  assert.equal(match.latencyMs, 204.5);
  assert.deepEqual(match.recommendations, [
    { rank: 1, code: "1", name: "BEARING SKF", similarity: 0.61, matchType: "TEXT", source: "catalog", requestStatus: "", retired: false },
  ]);
});

test("recommendations are renumbered by position, whatever rank the payload claims", () => {
  const match = normalizeAiMatch(
    buildDto({
      recommendations: [
        { rank: 9, code: "A", name: "FIRST", similarity: 0.5, matchType: "TEXT" },
        { rank: 9, code: "B", name: "SECOND", similarity: 0.4, matchType: "TEXT" },
        { rank: 9, code: "C", name: "THIRD", similarity: 0.3, matchType: "TEXT" },
      ],
    })
  );

  assert.deepEqual(
    match.recommendations.map(rec => [rec.rank, rec.code]),
    [
      [1, "A"],
      [2, "B"],
      [3, "C"],
    ]
  );
});

test("missing arrays, missing status and junk recommendations do not break a row", () => {
  const match = normalizeAiMatch({ request_id: 5 });

  assert.equal(match.status, "PENDING");
  assert.deepEqual(match.entities, { category: [], specs: [] });
  assert.deepEqual(match.recommendations, []);
  assert.deepEqual(match.query, { code: "", name: "", desc: "" });
  assert.equal(match.correctedName, "");
  assert.equal(match.typoCorrected, false);
  assert.equal(match.topSimilarity, null);
  assert.equal(match.latencyMs, null);

  const junk = normalizeAiMatch({
    status: "FAILED",
    error: "AI recommender timed out",
    entities: "not an object",
    recommendations: [null, "nope"],
  });

  assert.equal(junk.status, "FAILED");
  assert.equal(junk.error, "AI recommender timed out");
  assert.deepEqual(junk.entities, { category: [], specs: [] });
  assert.deepEqual(junk.recommendations, [
    { rank: 1, code: "", name: "", similarity: null, matchType: "", source: "catalog", requestStatus: "", retired: false },
    { rank: 2, code: "", name: "", similarity: null, matchType: "", source: "catalog", requestStatus: "", retired: false },
  ]);
});

test("blank entity entries are dropped rather than drawn as empty captions", () => {
  const match = normalizeAiMatch(
    buildDto({ entities: { category: ["PUMP", "  ", null], specs: ["  50HZ  ", ""] } })
  );

  assert.deepEqual(match.entities, { category: ["PUMP"], specs: ["50HZ"] });
});

test("nothing at all is no run", () => {
  assert.equal(normalizeAiMatch(null), null);
  assert.equal(normalizeAiMatch(undefined), null);
  assert.equal(normalizeAiMatch(0), null);
});

test("a list, a bare row and nothing all end up as an array", () => {
  assert.deepEqual(normalizeAiMatchList(null), []);
  assert.deepEqual(normalizeAiMatchList([]), []);
  assert.equal(normalizeAiMatchList(buildDto()).length, 1);
  assert.equal(normalizeAiMatchList([buildDto(), buildDto({ id: 12 })]).length, 2);
  assert.equal(normalizeAiMatchList([buildDto(), null]).length, 1);
});

test("polling continues only while something is still pending", () => {
  const pending = { status: "PENDING" };
  const done = { status: "DONE" };

  assert.equal(shouldKeepPolling(pending, 0), true);
  assert.equal(shouldKeepPolling([done, pending], 3), true);
  assert.equal(shouldKeepPolling([done, { status: "FAILED" }], 0), false);
  assert.equal(shouldKeepPolling(null, 0), false);
  assert.equal(shouldKeepPolling([], 0), false);
  assert.equal(shouldKeepPolling([{ status: "pending" }], 0), true);
});

test("polling stops once the budget is spent", () => {
  const pending = [{ status: "PENDING" }];

  assert.equal(shouldKeepPolling(pending, AI_MATCH_MAX_POLLS - 1), true);
  assert.equal(shouldKeepPolling(pending, AI_MATCH_MAX_POLLS), false);
  assert.equal(shouldKeepPolling(pending, AI_MATCH_MAX_POLLS + 5), false);
  assert.equal(shouldKeepPolling(pending, 2, 2), false);
  assert.equal(shouldKeepPolling(pending, 1, 2), true);
  assert.equal(shouldKeepPolling(pending, undefined), true);
});

test("the top match is the first recommendation of a finished run", () => {
  const top = summarizeTopMatch(buildDto());

  assert.deepEqual(top, {
    code: "935.461.472",
    name: "P/N 31755122 INSERT EXHAUST",
    similarity: 0.9731,
    tone: "success",
  });
});

test("an unfinished, failed or empty run has no top match", () => {
  assert.equal(summarizeTopMatch(buildDto({ status: "PENDING" })), null);
  assert.equal(summarizeTopMatch(buildDto({ status: "FAILED" })), null);
  assert.equal(summarizeTopMatch(buildDto({ recommendations: [] })), null);
  assert.equal(summarizeTopMatch(null), null);
});

test("the read and re-run paths are built per request kind", () => {
  assert.equal(buildAiMatchPath("single", 402), "/material/requests/single/402/ai-match");
  assert.equal(buildAiMatchPath("mass", 77), "/material/requests/mass/77/ai-match");
  assert.equal(
    buildAiMatchRerunPath("single", 402),
    "/material/requests/single/402/ai-match/rerun"
  );
  assert.equal(buildAiMatchRerunPath("mass", "a b"), "/material/requests/mass/a%20b/ai-match/rerun");
});

test("an unknown request kind is a programming error, not a path", () => {
  assert.throws(() => buildAiMatchPath("SINGLE", 1), {
    message: "Unknown AI match kind: SINGLE",
  });
  assert.throws(() => buildAiMatchPath("vendor", 1), {
    message: "Unknown AI match kind: vendor",
  });
  assert.throws(() => buildAiMatchRerunPath(undefined, 1), {
    message: "Unknown AI match kind: undefined",
  });
});

// --- Pre-save check -------------------------------------------------------

const {
  AI_PRECHECK_MASS_MIN_NEW_LINES,
  AI_PRECHECK_NEW,
  AI_PRECHECK_PATH,
  buildMassPrecheckReview,
  buildPrecheckReview,
  initialPrecheckChoice,
  normalizePrecheckLine,
  precheckNeedsChoice,
  summarizePrecheck,
} = helper;

function previewLine(key, overrides = {}) {
  return normalizePrecheckLine({
    key,
    status: "DONE",
    query: { code: "", name: `ITEM ${key}`, desc: "" },
    recommendations: [
      { rank: 1, code: `90${key}.001`, name: `EXISTING ${key}`, similarity: 0.93, matchType: "TEXT" },
      { rank: 2, code: `90${key}.002`, name: `OTHER ${key}`, similarity: 0.71, matchType: "TEXT" },
    ],
    ...overrides,
  });
}

test("the pre-save check posts to the preview path and needs two new mass lines", () => {
  assert.equal(AI_PRECHECK_PATH, "/material/ai-match/preview");
  assert.equal(AI_PRECHECK_MASS_MIN_NEW_LINES, 2);
});

test("normalizePrecheckLine keeps the line key next to the usual match shape", () => {
  const line = previewLine(3);
  assert.equal(line.key, 3);
  assert.equal(line.status, "DONE");
  assert.equal(line.recommendations[1].code, "903.002");
  assert.equal(line.requesterReview, null);
});

test("only a finished line with candidates asks for a choice; the rest start as new", () => {
  const withCandidates = previewLine(0);
  const none = previewLine(1, { recommendations: [] });
  const failed = previewLine(2, { status: "FAILED", error: "down", recommendations: [] });

  assert.equal(precheckNeedsChoice(withCandidates), true);
  assert.equal(precheckNeedsChoice(none), false);
  assert.equal(precheckNeedsChoice(failed), false);

  assert.equal(initialPrecheckChoice(withCandidates), "");
  assert.equal(initialPrecheckChoice(none), AI_PRECHECK_NEW);
  assert.equal(initialPrecheckChoice(failed), AI_PRECHECK_NEW);
});

test("summarizePrecheck splits new lines from lines matched to an existing material", () => {
  const lines = [previewLine(0), previewLine(2), previewLine(5)];

  const undecided = summarizePrecheck(lines, { 0: AI_PRECHECK_NEW, 2: "", 5: "905.002" });
  assert.equal(undecided.allDecided, false);

  const decided = summarizePrecheck(lines, { 0: AI_PRECHECK_NEW, 2: AI_PRECHECK_NEW, 5: "905.002" });
  assert.equal(decided.allDecided, true);
  assert.deepEqual(decided.newKeys, [0, 2]);
  assert.deepEqual(decided.existing, [{ key: 5, query: "ITEM 5", code: "905.002", name: "OTHER 5" }]);

  const allExisting = summarizePrecheck([previewLine(0)], { 0: "900.001" });
  assert.equal(allExisting.allDecided, true);
  assert.deepEqual(allExisting.newKeys, []);
});

test("buildPrecheckReview confirms a checked line and has nothing for a failed one", () => {
  assert.deepEqual(buildPrecheckReview(previewLine(0)), {
    confirmedNew: true,
    recommendations: [
      { code: "900.001", name: "EXISTING 0", similarity: 0.93, matchType: "TEXT", source: "catalog", requestStatus: "", retired: false },
      { code: "900.002", name: "OTHER 0", similarity: 0.71, matchType: "TEXT", source: "catalog", requestStatus: "", retired: false },
    ],
  });
  assert.deepEqual(buildPrecheckReview(previewLine(1, { recommendations: [] })), {
    confirmedNew: true,
    recommendations: [],
  });
  assert.equal(buildPrecheckReview(previewLine(2, { status: "FAILED", recommendations: [] })), null);
  assert.equal(buildPrecheckReview(undefined), null);
});

test("buildMassPrecheckReview sends one confirmation per new, checked line keyed by form row", () => {
  const lines = [
    previewLine(0),
    previewLine(2, { status: "FAILED", recommendations: [] }),
    previewLine(5),
  ];
  const review = buildMassPrecheckReview(lines, [0, 2]);
  assert.deepEqual(
    review.rows.map(row => [row.rowIndex, row.confirmedNew, row.recommendations.length]),
    [[0, true, 2]]
  );
  assert.equal(buildMassPrecheckReview(lines, [2]), null);
  assert.equal(buildMassPrecheckReview(lines, []), null);
});

test("normalizeAiMatch carries the requester's confirmation only when it was given", () => {
  assert.deepEqual(
    normalizeAiMatch(buildDto({ requesterReview: { confirmedNew: true, reviewedAt: "t", shownCount: 3 } }))
      .requesterReview,
    { confirmedNew: true, reviewedAt: "t", shownCount: 3 }
  );
  assert.equal(normalizeAiMatch(buildDto({ requesterReview: null })).requesterReview, null);
  assert.equal(normalizeAiMatch(buildDto({ requesterReview: { confirmedNew: false } })).requesterReview, null);
});

test("a recommendation keeps its source, request status and retired flag", () => {
  const match = normalizeAiMatch(
    buildDto({
      recommendations: [
        { code: "1000000071", name: "P/N 7X-2042 SEAL", similarity: 0.98, matchType: "PART NUMBER", source: "request", requestStatus: "Submit" },
        { code: "937.111.I62", name: "(NOT USE) HOSE", similarity: 0.9, match_type: "TEXT", source: "catalog", retired: true },
        { code: "937.111.I63", name: "HOSE", similarity: 0.8, matchType: "TEXT", source: "something else", retired: "yes" },
      ],
    })
  );
  const [request, retired, plain] = match.recommendations;
  assert.equal(isRequestRecommendation(request), true);
  assert.equal(request.requestStatus, "Submit");
  assert.equal(isRequestRecommendation(retired), false);
  assert.equal(retired.retired, true);
  assert.equal(plain.source, "catalog");
  assert.equal(plain.retired, false);
});
