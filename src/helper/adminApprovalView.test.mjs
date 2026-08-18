import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Imported rather than taken off the global, which the lint config does not
// declare — the sibling suites never needed it because they base64 the file
// buffer directly, and this one has a rewritten source string to encode.
import { Buffer } from "node:buffer";

const helperDir = path.dirname(fileURLToPath(import.meta.url));

const toDataUrl = source =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

// Loaded through a data: URL for the same reason as the other helper suites —
// the package defaults to CommonJS, so importing the .js path directly gets it
// parsed as CJS and blown up on `export`. This helper differs from the others in
// having one relative import, and a data: URL has no directory to resolve
// "./sapStatus.js" against, so the dependency is inlined as its own data: URL
// first. sapStatus.js imports nothing, so the chain stops there.
const sapStatusUrl = toDataUrl(
  fs.readFileSync(path.resolve(helperDir, "sapStatus.js"), "utf8")
);
const adminApprovalViewSource = fs
  .readFileSync(path.resolve(helperDir, "adminApprovalView.js"), "utf8")
  .replace("./sapStatus.js", () => sapStatusUrl);

const {
  isMdmMaterialUser,
  isRewoundRequest,
  getRewindStepLevels,
  getEffectiveApprovalStatusLabel,
  filterApprovalRowsByStatus,
  resolveStoredStatusFilter,
} = await import(toDataUrl(adminApprovalViewSource));

test("isMdmMaterialUser is true only when the backend flag is exactly true", () => {
  assert.equal(isMdmMaterialUser({ is_mdm_material: true }), true);
});

test("isMdmMaterialUser is false when the backend flag is false", () => {
  assert.equal(isMdmMaterialUser({ is_mdm_material: false }), false);
});

test("isMdmMaterialUser is false when the flag is missing from the session", () => {
  assert.equal(
    isMdmMaterialUser({ role: "MATERIAL", groupid: 12, dept_id: "MDM_MAT" }),
    false
  );
});

test("isMdmMaterialUser is false for an absent or empty session", () => {
  assert.equal(isMdmMaterialUser(), false);
  assert.equal(isMdmMaterialUser({}), false);
  assert.equal(isMdmMaterialUser(null), false);
  assert.equal(isMdmMaterialUser(undefined), false);
});

// The bug this replaced: role is "MATERIAL" for *every* material user, so
// matching role / groupid / dept_id against MDM_MATERIAL / MDM_MAT / MATERIAL
// handed the whole department the Master Data view — the two assignment-scoped
// Status options and the Pickup button — and "Assigned To Me" then filtered on a
// step they had never grabbed, rendering an empty table every time.
test("isMdmMaterialUser no longer infers membership from role, groupid or dept_id", () => {
  for (const session of [
    { role: "MATERIAL" },
    { role: "MDM_MATERIAL" },
    { role: "mdm_material" },
    { groupid: "MDM_MATERIAL" },
    { groupid: "MDM_MAT" },
    { dept_id: "MATERIAL" },
    { dept_id: " MDM_MATERIAL " },
    { role: "MATERIAL", groupid: "MDM_MAT", dept_id: "MDM_MATERIAL" },
  ]) {
    assert.equal(
      isMdmMaterialUser(session),
      false,
      `expected no MDM grant from ${JSON.stringify(session)}`
    );
  }
});

// A genuine Master Data user is a material user too, so the flag has to win over
// the surrounding fields rather than be confirmed by them.
test("isMdmMaterialUser grants a real MDM_MATERIAL user regardless of role", () => {
  assert.equal(
    isMdmMaterialUser({
      role: "MATERIAL",
      groupid: 9,
      dept_id: "PROC",
      is_mdm_material: true,
    }),
    true
  );
});

// The store coerces with `=== true`, but the helper is the last gate before the
// MDM-only UI, so a truthy stand-in must not pass it either.
test("isMdmMaterialUser rejects truthy stand-ins for the flag", () => {
  for (const value of ["true", "TRUE", 1, "1", "yes", {}, []]) {
    assert.equal(
      isMdmMaterialUser({ is_mdm_material: value }),
      false,
      `expected no MDM grant from ${JSON.stringify(value)}`
    );
  }
});

// ---------------------------------------------------------------------------
// Rework visibility for requests sent back to an earlier approver (IBE-025 /
// IBE-033). Every case here asserts on what a user would see — the label a
// row resolves to, and whether a filter includes it — never on how the
// predicate is spelled internally.
// ---------------------------------------------------------------------------

function step(level, kind, status, overrides = {}) {
  return { level, kind, status, approverUserId: `user-${level}`, ...overrides };
}

// A rewind reopens exactly the sending (MDM) and receiving step to WAITING,
// leaving everything below the receiving step untouched (still APPROVED).
function buildRewoundRow({ manualSteps, receivingLevel, mdmLevel, rawStatus = "SUBMIT" }) {
  const steps = manualSteps.map(level =>
    step(level, "MANUAL", level === receivingLevel ? "WAITING" : "APPROVED")
  );
  steps.push(step(mdmLevel, "MDM", "WAITING"));
  return { status: rawStatus, reworkAt: "2026-08-10 10:00", approvalSteps: steps };
}

test("rewound in a multi-approver chain reads Rework", () => {
  const row = buildRewoundRow({ manualSteps: [1, 2], receivingLevel: 1, mdmLevel: 3 });
  assert.equal(isRewoundRequest(row), true);
  assert.equal(getEffectiveApprovalStatusLabel(row), "Rework");
});

// The case that killed the rejected step-shape predicate: a single-approver
// (CHANGE-ticket) chain reopens to WAITING on both rows, leaving no APPROVED
// step anywhere, so a predicate that looks for one is blind here.
test("rewound in a single-approver chain (the CHANGE shape) reads Rework", () => {
  const row = buildRewoundRow({ manualSteps: [1], receivingLevel: 1, mdmLevel: 2 });
  assert.equal(isRewoundRequest(row), true);
  assert.equal(getEffectiveApprovalStatusLabel(row), "Rework");
});

test("once the receiving stage re-approves, the request reads Submit again without anything being cleared", () => {
  const row = {
    status: "SUBMIT",
    reworkAt: "2026-08-10 10:00", // never cleared, still present
    approvalSteps: [step(1, "MANUAL", "APPROVED"), step(2, "MDM", "WAITING")],
  };
  assert.equal(isRewoundRequest(row), false);
  assert.equal(getEffectiveApprovalStatusLabel(row), "Submit");
});

test("a request that has never been reworked is unaffected", () => {
  const row = {
    status: "SUBMIT",
    approvalSteps: [step(1, "MANUAL", "WAITING"), step(2, "MDM", "WAITING")],
  };
  assert.equal(isRewoundRequest(row), false);
  assert.equal(getEffectiveApprovalStatusLabel(row), "Submit");
});

// The old rework-to-requester path never reopens a step to WAITING — the MDM
// step's stored status stays REWORK, which is what already means "this stage
// sent it back". This must keep reading Rework via that existing path, not
// the new one.
test("reworked back to the requester reads Rework, driven by the stored status as before", () => {
  const row = {
    status: "REWORK",
    reworkAt: "2026-08-10 10:00",
    approvalSteps: [step(1, "MANUAL", "APPROVED"), step(2, "MDM", "REWORK")],
  };
  assert.equal(isRewoundRequest(row), false);
  assert.equal(getEffectiveApprovalStatusLabel(row), "Rework");
});

// After the requester resubmits, the row flips back to SUBMIT but the MDM
// step has not been touched yet — it is still REWORK, not WAITING — so the
// active step IS the MDM step and the level comparison is a tie, not a
// rewind. reworkAt is the same never-cleared timestamp as before resubmit.
test("requester resubmitted after a rework reads Submit, unaffected by the stale reworkAt", () => {
  const row = {
    status: "SUBMIT",
    reworkAt: "2026-08-10 10:00",
    approvalSteps: [step(1, "MANUAL", "APPROVED"), step(2, "MDM", "REWORK")],
  };
  assert.equal(isRewoundRequest(row), false);
  assert.equal(getEffectiveApprovalStatusLabel(row), "Submit");
});

// A SAP error short-circuits before the rewind predicate is ever consulted —
// this must not bleed into the SAP path regardless of what reworkAt says.
test("returned after a SAP error keeps reading SAP Error, untouched by rework metadata", () => {
  const row = {
    status: "SUBMIT",
    sapPushStatus: "ERROR",
    reworkAt: "2026-08-10 10:00",
    approvalSteps: [step(1, "MANUAL", "WAITING"), step(2, "MDM", "WAITING")],
  };
  assert.equal(getEffectiveApprovalStatusLabel(row), "SAP Error");
});

// Chain replacement reopens the (new) step and MDM the same way a rewind
// does, so the same predicate is expected to read it as Rework too — no
// special-casing needed.
test("a replaced approver chain reads Rework, same as a rewind", () => {
  const row = buildRewoundRow({ manualSteps: [1], receivingLevel: 1, mdmLevel: 2 });
  assert.equal(isRewoundRequest(row), true);
  assert.equal(getEffectiveApprovalStatusLabel(row), "Rework");
});

test("the Rework status filter returns a rewound request and the Submit filter excludes it", () => {
  const rewoundRow = { id: 1, ...buildRewoundRow({ manualSteps: [1], receivingLevel: 1, mdmLevel: 2 }) };
  const untouchedRow = {
    id: 2,
    status: "SUBMIT",
    approvalSteps: [step(1, "MANUAL", "WAITING"), step(2, "MDM", "WAITING")],
  };
  const rows = [rewoundRow, untouchedRow];

  assert.deepEqual(
    filterApprovalRowsByStatus(rows, "Rework").map(row => row.id),
    [1]
  );
  assert.deepEqual(
    filterApprovalRowsByStatus(rows, "Submit").map(row => row.id),
    [2]
  );
});

test("getRewindStepLevels marks both the sending (MDM) and receiving stage, and null otherwise", () => {
  const rewoundRow = buildRewoundRow({ manualSteps: [1, 2], receivingLevel: 2, mdmLevel: 3 });
  assert.deepEqual(getRewindStepLevels(rewoundRow), { senderLevel: 3, receiverLevel: 2 });

  const untouchedRow = {
    status: "SUBMIT",
    approvalSteps: [step(1, "MANUAL", "WAITING"), step(2, "MDM", "WAITING")],
  };
  assert.equal(getRewindStepLevels(untouchedRow), null);
});

test("resolveStoredStatusFilter keeps a stored value that is a valid option", () => {
  assert.equal(resolveStoredStatusFilter("Rework", false), "Rework");
});

test("resolveStoredStatusFilter keeps a Master Data-only value for a Master Data user", () => {
  assert.equal(resolveStoredStatusFilter("Assigned To Me", true), "Assigned To Me");
  assert.equal(resolveStoredStatusFilter("Request All", true), "Request All");
});

test("resolveStoredStatusFilter falls back to All for a Master Data-only value on a non-Master Data user", () => {
  assert.equal(resolveStoredStatusFilter("Assigned To Me", false), "All");
  assert.equal(resolveStoredStatusFilter("Request All", false), "All");
});

test("resolveStoredStatusFilter falls back to All for an unrecognised, empty, or absent value", () => {
  assert.equal(resolveStoredStatusFilter("Nonexistent", false), "All");
  assert.equal(resolveStoredStatusFilter("", false), "All");
  assert.equal(resolveStoredStatusFilter(null, false), "All");
  assert.equal(resolveStoredStatusFilter(undefined, false), "All");
});
