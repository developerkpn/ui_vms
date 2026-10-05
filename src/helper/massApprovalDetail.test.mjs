import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMassApprovalRows } from "./adminApprovalView.js";
import { buildMassReworkSummary } from "./massApprovalDetail.js";

// A mass request row as the approval inbox returns it: no rework_* columns,
// the reason lives on the step the batch was sent back from.
const inboxRow = steps => ({
  id: 7,
  mass_request_no: "M-0007",
  item_count: 3,
  first_item_status: "Rework",
  first_item_assigned_to: "Requester",
  approval_steps: steps,
});

test("a mass rework by Master Data shows its reason, approver and time", () => {
  const [row] = normalizeMassApprovalRows([
    inboxRow([
      { level: 1, kind: "MANUAL", approver_name: "Budi", status: "APPROVED", acted_at: "2026-09-29T02:00:00Z", remark: "ok" },
      { level: 2, kind: "MDM", approver_name: "Sari MDM", status: "REWORK", acted_at: "2026-09-30T03:15:00Z", remark: "Spesifikasi item 2 kurang lengkap" },
    ]),
  ]);

  const summary = buildMassReworkSummary(row);

  assert.equal(summary.massRequestNo, "M-0007");
  assert.equal(summary.reason, "Spesifikasi item 2 kurang lengkap");
  assert.equal(summary.approver, "Sari MDM");
  assert.notEqual(summary.at, "");
});

test("a rework by a manual approver is read the same way", () => {
  const [row] = normalizeMassApprovalRows([
    inboxRow([
      { level: 1, kind: "MANUAL", approver_name: "Budi", status: "REWORK", acted_at: "2026-09-29T02:00:00Z", remark: "UoM salah" },
      { level: 2, kind: "MDM", status: "WAITING" },
    ]),
  ]);

  assert.equal(buildMassReworkSummary(row).reason, "UoM salah");
});

test("after several reworks the latest one is shown", () => {
  const [row] = normalizeMassApprovalRows([
    inboxRow([
      { level: 1, kind: "MANUAL", approver_name: "Budi", status: "REWORK", acted_at: "2026-09-20T02:00:00Z", remark: "lama" },
      { level: 2, kind: "MDM", approver_name: "Sari MDM", status: "REWORK", acted_at: "2026-09-30T03:15:00Z", remark: "terbaru" },
    ]),
  ]);

  assert.equal(buildMassReworkSummary(row).reason, "terbaru");
});

test("no rework step and no legacy fields still means no summary", () => {
  const [row] = normalizeMassApprovalRows([
    inboxRow([{ level: 1, kind: "MANUAL", status: "WAITING" }]),
  ]);

  assert.equal(buildMassReworkSummary(row), null);
});

test("a batch Master Data decided item by item reads Partial, but acts on the viewer's item", async () => {
  const { getEffectiveApprovalStatusLabel } = await import("./adminApprovalView.js");
  const { buildMassApprovalDetail } = await import("./massApprovalDetail.js");

  const [row] = normalizeMassApprovalRows([
    {
      ...inboxRow([
        { level: 1, kind: "MANUAL", approver_user_id: "APP-07", status: "WAITING" },
        { level: 2, kind: "MDM", approver_user_id: "MDM-01", status: "WAITING" },
      ]),
      first_item_status: "Submit",
      first_item_assigned_to: "Approval 1",
      batch_status: "Partial",
      item_status_counts: { DONE: 1, SUBMIT: 1 },
      sap_push_status: "PENDING",
    },
  ]);

  assert.equal(row.status, "Partial");
  assert.equal(row.itemStatus, "Submit");
  assert.deepEqual(row.itemStatusCounts, { DONE: 1, SUBMIT: 1 });
  // "Partial" outranks the approved items' rolled-up SAP state.
  assert.equal(getEffectiveApprovalStatusLabel(row), "Partial");

  const detail = buildMassApprovalDetail(row, [
    {
      id: 11,
      item_no: 1,
      status: "DONE",
      approval_steps: [
        { level: 1, kind: "MANUAL", approver_user_id: "APP-01", status: "APPROVED" },
        { level: 2, kind: "MDM", approver_user_id: "MDM-01", status: "APPROVED" },
      ],
    },
  ]);
  assert.equal(detail.status, "Partial");
  assert.equal(detail.itemStatus, "Submit");
  assert.deepEqual(
    detail.items[0].approvalSteps.map(step => [step.kind, step.status]),
    [
      ["MANUAL", "APPROVED"],
      ["MDM", "APPROVED"],
    ]
  );
});
