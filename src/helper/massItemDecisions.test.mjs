import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ES module inside a CommonJS package with no imports of its own: load it
// through a data: URL, same as massFinalCode.test.mjs.
const helperPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "massItemDecisions.js"
);
const helper = await import(
  `data:text/javascript;base64,${fs.readFileSync(helperPath).toString("base64")}`
);

const {
  MASS_DECISION_APPROVE,
  MASS_DECISION_REWORK,
  MASS_DECISION_REJECT,
  resolveItemActiveStep,
  isMassItemActionable,
  describeMassItemState,
  applyMassDecision,
  summarizeMassDecisions,
  formatMassDecisionSummary,
  formatMassItemNos,
  buildMassDecideRequestBody,
} = helper;

const mdmWaiting = [
  { level: 1, kind: "MANUAL", approverUserId: "APP-01", status: "APPROVED" },
  { level: 2, kind: "MDM", approverUserId: "MDM-01", status: "WAITING", label: "Master Data" },
];

const item = (id, itemNo, overrides = {}) => ({
  id,
  itemNo,
  status: "Submit",
  approvalSteps: mdmWaiting,
  ...overrides,
});

test("an item is actionable only while it waits at the dialog's step", () => {
  const lead = resolveItemActiveStep(item(11, 1));

  assert.equal(isMassItemActionable(item(11, 1), lead), true);
  assert.equal(isMassItemActionable(item(12, 2, { status: "DONE" }), lead), false);
  assert.equal(isMassItemActionable(item(13, 3, { status: "Rework" }), lead), false);

  // Re-climbing a replaced chain: waiting on APP-07, not on Master Data.
  const reclimbing = item(14, 4, {
    approvalSteps: [
      { level: 1, kind: "MANUAL", approverUserId: "APP-07", status: "WAITING", label: "Approval 1" },
      { level: 2, kind: "MDM", approverUserId: "MDM-01", status: "WAITING" },
    ],
  });
  assert.equal(isMassItemActionable(reclimbing, lead), false);
  assert.equal(
    isMassItemActionable(reclimbing, resolveItemActiveStep(reclimbing)),
    true
  );
  assert.equal(describeMassItemState(reclimbing), "Approval 1");
  assert.equal(isMassItemActionable(item(11, 1), null), false);
});

test("describeMassItemState names where each item is", () => {
  assert.equal(describeMassItemState(item(1, 1, { status: "DONE" })), "Done");
  assert.equal(describeMassItemState(item(1, 1, { status: "CANCEL" })), "Cancel");
  assert.equal(describeMassItemState(item(1, 1, { status: "Rework" })), "Rework");
  assert.equal(describeMassItemState(item(1, 1)), "Master Data");
});

test("decisions are set and cleared per item, and tallied over the items that need one", () => {
  const items = [item(11, 1), item(12, 2), item(13, 3), item(14, 4)];
  let decisions = applyMassDecision({}, [11, 13], MASS_DECISION_APPROVE);
  decisions = applyMassDecision(decisions, [12], MASS_DECISION_REWORK);
  decisions = applyMassDecision(decisions, [13], MASS_DECISION_REJECT);

  let summary = summarizeMassDecisions(decisions, items);
  assert.deepEqual(summary.counts, { APPROVE: 1, REWORK: 1, REJECT: 1 });
  assert.deepEqual(summary.itemNosByAction.REJECT, [3]);
  assert.deepEqual(summary.undecidedItemNos, [4]);
  assert.equal(summary.complete, false);
  assert.equal(formatMassDecisionSummary(summary), "1 Approve · 1 Rework · 1 Reject · 1 undecided");

  decisions = applyMassDecision(decisions, [14], MASS_DECISION_APPROVE);
  decisions = applyMassDecision(decisions, [12], null);
  summary = summarizeMassDecisions(decisions, items);
  assert.deepEqual(summary.itemIdsByAction.APPROVE, [11, 14]);
  assert.deepEqual(summary.undecidedItemNos, [2]);

  assert.equal(formatMassItemNos([2]), "item 2");
  assert.equal(formatMassItemNos([1, 3]), "items 1, 3");
});

test("the decide body carries each action's fields only when some item got it", () => {
  const items = [item(11, 1), item(12, 2), item(13, 3)];

  const approveOnly = buildMassDecideRequestBody({
    decisions: { 11: MASS_DECISION_APPROVE, 12: MASS_DECISION_APPROVE, 13: MASS_DECISION_APPROVE },
    actionableItems: items,
    remark: "ok",
    finalCodeSuffixes: { 11: "001", 12: "002", 13: "003", 99: "009" },
    reworkReason: "ignored",
    rejectReason: "ignored",
  });
  assert.deepEqual(approveOnly, {
    decisions: [
      { itemId: 11, action: "APPROVE" },
      { itemId: 12, action: "APPROVE" },
      { itemId: 13, action: "APPROVE" },
    ],
    remark: "ok",
    finalCodeSuffixes: { 11: "001", 12: "002", 13: "003" },
    items: null,
  });

  const mixed = buildMassDecideRequestBody({
    decisions: { 11: MASS_DECISION_APPROVE, 12: MASS_DECISION_REWORK, 13: MASS_DECISION_REJECT },
    actionableItems: items,
    remark: "ok",
    finalCodeSuffixes: { 11: "001", 12: "002" },
    items: [{ id: 11, base_uom: "PC" }],
    reworkReason: "Lengkapi",
    reworkDestination: { newApprovers: ["APP-07"], notifyVia: "EMAIL", emailSubject: "S", emailBody: "B" },
    rejectReason: "Duplikat",
  });
  assert.deepEqual(mixed, {
    decisions: [
      { itemId: 11, action: "APPROVE" },
      { itemId: 12, action: "REWORK" },
      { itemId: 13, action: "REJECT" },
    ],
    remark: "ok",
    finalCodeSuffixes: { 11: "001" },
    items: [{ id: 11, base_uom: "PC" }],
    reworkReason: "Lengkapi",
    newApprovers: ["APP-07"],
    notifyVia: "EMAIL",
    emailSubject: "S",
    emailBody: "B",
    rejectReason: "Duplikat",
  });
});
