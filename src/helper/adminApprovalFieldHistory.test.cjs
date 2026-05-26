const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(
  path.resolve(__dirname, "adminApprovalFieldHistory.mjs")
).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("buildApprovalFieldHistory keeps only changed stages and returns newest first", async () => {
  const { buildApprovalFieldHistory } = await loadHelper();

  const sections = buildApprovalFieldHistory({
    fieldKey: "material_description",
    currentRow: {
      material_description: "Current desc",
      created_by: "REQ-01",
      edit_history: [
        {
          approval_stage: "Approval 2",
          approved_by_user_id: "APP-02",
          approved_by_username: "approval.user.two",
          approved_at: "2026-05-20T11:30:00.000Z",
          material_description: "Changed once",
          created_by: "REQ-01",
        },
        {
          approval_stage: "Approval 1",
          approved_by_user_id: "APP-01",
          approved_by_username: "approval.user.one",
          approved_at: "2026-05-20T09:15:00.000Z",
          material_description: "Original desc",
          created_by: "REQ-01",
        },
        {
          approval_stage: "Master Data",
          approved_by_user_id: "MD-01",
          approved_at: "2026-05-20T12:15:00.000Z",
          material_description: "Current desc",
          created_by: "REQ-01",
        },
      ],
    },
  });

  assert.deepEqual(sections, [
    {
      stage: "Approval 2",
      beforeValue: "Changed once",
      afterValue: "Current desc",
      sourceBy: "approval.user.one",
      changedBy: "approval.user.two",
      approvedAt: "2026-05-20T11:30:00.000Z",
    },
    {
      stage: "Approval 1",
      beforeValue: "Original desc",
      afterValue: "Changed once",
      sourceBy: "REQ-01",
      changedBy: "approval.user.one",
      approvedAt: "2026-05-20T09:15:00.000Z",
    },
  ]);
});

test("buildApprovalFieldHistory reads specification values from template payload snapshots", async () => {
  const { buildApprovalFieldHistory } = await loadHelper();

  const sections = buildApprovalFieldHistory({
    fieldKey: "template_payload.templateValues.density",
    currentRow: {
      template_payload: {
        templateValues: {
          density: "1.4",
        },
      },
      created_by: "REQ-01",
      edit_history: [
        {
          approval_stage: "Approval 2",
          approved_by_user_id: "APP-02",
          approved_at: "2026-05-20T11:30:00.000Z",
          template_payload: {
            templateValues: {
              density: "1.4",
            },
          },
          created_by: "REQ-01",
        },
        {
          approval_stage: "Approval 1",
          approved_by_user_id: "APP-01",
          approved_by_username: "approval.user.one",
          approved_at: "2026-05-20T09:15:00.000Z",
          template_payload: {
            templateValues: {
              density: "1.2",
            },
          },
          created_by: "REQ-01",
        },
        {
          approval_stage: "Draft",
          approved_by_user_id: "REQ-01",
          approved_at: "2026-05-20T08:45:00.000Z",
          template_payload: {
            templateValues: {
              density: "1.2",
            },
          },
          created_by: "REQ-01",
        },
      ],
    },
  });

  assert.deepEqual(sections, [
    {
      stage: "Approval 1",
      beforeValue: "1.2",
      afterValue: "1.4",
      sourceBy: "REQ-01",
      changedBy: "approval.user.one",
      approvedAt: "2026-05-20T09:15:00.000Z",
    },
  ]);
});

test("buildCombinedLongTextHistory merges long text 1-3 into one history timeline", async () => {
  const { buildCombinedLongTextHistory } = await loadHelper();

  const sections = buildCombinedLongTextHistory({
    currentRow: {
      long_text_1: "Current line 1",
      long_text_2: "-",
      long_text_3: "-",
      created_by: "REQ-01",
      edit_history: [
        {
          approval_stage: "Approval 2",
          approved_by_user_id: "APP-02",
          approved_by_username: "approval.user.two",
          approved_at: "2026-05-20T11:30:00.000Z",
          long_text_1: "Changed line 1",
          long_text_2: "Changed line 2",
          long_text_3: null,
          created_by: "REQ-01",
        },
        {
          approval_stage: "Approval 1",
          approved_by_user_id: "APP-01",
          approved_by_username: "approval.user.one",
          approved_at: "2026-05-20T09:15:00.000Z",
          long_text_1: "Original line 1",
          long_text_2: null,
          long_text_3: null,
          created_by: "REQ-01",
        },
      ],
    },
  });

  assert.deepEqual(sections, [
    {
      stage: "Approval 2",
      beforeValue: ["Changed line 1", "Changed line 2", "-"],
      afterValue: ["Current line 1", "-", "-"],
      sourceBy: "approval.user.one",
      changedBy: "approval.user.two",
      approvedAt: "2026-05-20T11:30:00.000Z",
    },
    {
      stage: "Approval 1",
      beforeValue: ["Original line 1", "-", "-"],
      afterValue: ["Changed line 1", "Changed line 2", "-"],
      sourceBy: "REQ-01",
      changedBy: "approval.user.one",
      approvedAt: "2026-05-20T09:15:00.000Z",
    },
  ]);
});
