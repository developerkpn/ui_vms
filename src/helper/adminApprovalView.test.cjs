const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(path.resolve(__dirname, "adminApprovalView.mjs")).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("normalizeApprovalRows maps API rows into My Approval table rows", async () => {
  const { normalizeApprovalRows } = await loadHelper();

  const rows = normalizeApprovalRows([
    {
      id: 12,
      ticket_number: "1000000012",
      ticket_type: "Create",
      material_description: "PUMP, CENTRIFUGAL",
      uom: "PC",
      status: "Submit",
      created_by: "admin.admin",
      created_at: "2026-01-10T16:30:00.000Z",
      assigned_to: "master data",
      approval_1_status: "APPROVED",
      approval_2_status: "WAITING",
      approval_3_status: null,
    },
  ]);

  assert.deepEqual(rows, [
    {
      id: 12,
      ticketNumber: "1000000012",
      ticketType: "Create",
      materialDescription: "PUMP, CENTRIFUGAL",
      uom: "PC",
      status: "Submit",
      createdBy: "admin.admin",
      createdAt: "2026-01-10 16:30",
      assignedTo: "master data",
      approvalStage: "Approval 2",
      approval1Status: "APPROVED",
      approval2Status: "WAITING",
    },
  ]);
});

test("normalizeApprovalRows marks rows as Approval 1 when first approval is waiting", async () => {
  const { normalizeApprovalRows } = await loadHelper();

  const [row] = normalizeApprovalRows([
    {
      id: 21,
      ticket_number: "1000000021",
      approval_1_status: "WAITING",
      approval_2_status: "WAITING",
      approval_3_status: "WAITING",
    },
  ]);

  assert.equal(row.approvalStage, "Approval 1");
});

test("normalizeApprovalRows marks rows as Approval 1 when first approval status is absent", async () => {
  const { normalizeApprovalRows } = await loadHelper();

  const [row] = normalizeApprovalRows([
    {
      id: 23,
      ticket_number: "1000000023",
      approval_2_status: "WAITING",
      approval_3_status: "WAITING",
    },
  ]);

  assert.equal(row.approvalStage, "Approval 1");
});

test("normalizeApprovalRows keeps Approval 3 label for already escalated rows", async () => {
  const { normalizeApprovalRows } = await loadHelper();

  const [row] = normalizeApprovalRows([
    {
      id: 22,
      ticket_number: "1000000022",
      approval_1_status: "APPROVED",
      approval_2_status: "APPROVED",
      approval_3_status: "WAITING",
    },
  ]);

  assert.equal(row.approvalStage, "Approval 3");
});

test("filterApprovalRows searches common visible columns", async () => {
  const { filterApprovalRows } = await loadHelper();
  const rows = [
    {
      ticketNumber: "1000000001",
      ticketType: "Create",
      materialDescription: "PUMP, CENTRIFUGAL",
      status: "Submit",
      createdBy: "admin.admin",
      assignedTo: "master data",
    },
    {
      ticketNumber: "1000000002",
      ticketType: "Change",
      materialDescription: "VALVE, GATE",
      status: "Waiting",
      createdBy: "budi.user",
      assignedTo: "approval 1",
    },
  ];

  assert.deepEqual(filterApprovalRows(rows, "valve"), [rows[1]]);
  assert.deepEqual(filterApprovalRows(rows, "1000000001"), [rows[0]]);
});

test("summarizeApprovalGroups counts rows by selected group key", async () => {
  const { summarizeApprovalGroups } = await loadHelper();
  const rows = [
    { status: "Submit", assignedTo: "master data" },
    { status: "Submit", assignedTo: "master data" },
    { status: "Waiting", assignedTo: "approval 1" },
  ];

  assert.deepEqual(summarizeApprovalGroups(rows, "status"), [
    { key: "Submit", count: 2 },
    { key: "Waiting", count: 1 },
  ]);
  assert.deepEqual(summarizeApprovalGroups(rows, "none"), []);
});

test("normalizeApprovalRows keeps filled form detail fields for View Approval", async () => {
  const { normalizeApprovalRows } = await loadHelper();

  const [row] = normalizeApprovalRows([
    {
      id: 31,
      material_group_id: 12,
      material_sub_group_id: 44,
      ticket_number: "1000000031",
      material_group_code: "901",
      material_group_name: "Actuator & Solenoid Valve",
      material_sub_group_code: "002",
      material_sub_group_name: "Actiar",
      plant_code: "KPN1",
      sloc_code: "A001",
      long_text_1: "LINE 1",
      template_payload: {
        requestFields: { base_unit_of_measure: "PC" },
        templateValues: { brand: "ACTIAR" },
      },
      edit_history: [
        {
          id: 7,
          approval_stage: "Approval 1",
          material_description: "OLD DESC",
        },
      ],
      attachments: [{ id: 5, file_name: "image1.jpg" }],
      approval_1_user_id: "andi",
      approval_1_user_name: "Andi Saputra",
      approval_1_status: "APPROVED",
    },
  ]);

  assert.equal(row.materialGroupId, 12);
  assert.equal(row.materialGroupCode, "901");
  assert.equal(row.materialGroupName, "Actuator & Solenoid Valve");
  assert.equal(row.materialSubGroupId, 44);
  assert.equal(row.subMaterialGroupCode, "002");
  assert.equal(row.subMaterialGroupName, "Actiar");
  assert.equal(row.plantCode, "KPN1");
  assert.equal(row.slocCode, "A001");
  assert.equal(row.longText1, "LINE 1");
  assert.equal(row.approval1UserId, "andi");
  assert.equal(row.approval1UserName, "Andi Saputra");
  assert.deepEqual(row.templatePayload.templateValues, { brand: "ACTIAR" });
  assert.deepEqual(row.editHistory, [
    {
      id: 7,
      approval_stage: "Approval 1",
      material_description: "OLD DESC",
    },
  ]);
  assert.deepEqual(row.attachments, [{ id: 5, file_name: "image1.jpg" }]);
  assert.equal(row.approval1UserId, "andi");
  assert.equal(row.approval1Status, "APPROVED");
});

test("normalizeApprovalRows includes latest rework metadata from backend rows", async () => {
  const { normalizeApprovalRows } = await loadHelper();

  const [row] = normalizeApprovalRows([
    {
      id: 51,
      ticket_number: "1000000051",
      status: "REWORK",
      rework_stage: "Approval 2",
      rework_by_user_id: "manager01",
      rework_by_username: "manager.user",
      rework_at: "2026-05-18T09:30:00.000Z",
      rework_reason: "Lengkapi datasheet dan lampiran revisi.",
      approval_1_status: "APPROVED",
      approval_2_status: "REWORK",
      approval_3_status: "WAITING",
    },
  ]);

  assert.equal(row.status, "Rework");
  assert.equal(row.reworkStage, "Approval 2");
  assert.equal(row.reworkByUserId, "manager01");
  assert.equal(row.reworkByUsername, "manager.user");
  assert.equal(row.reworkAt, "2026-05-18 09:30");
  assert.equal(row.reworkReason, "Lengkapi datasheet dan lampiran revisi.");
});

test("normalizeApprovalRows maps backend CANCEL status into Cancel", async () => {
  const { normalizeApprovalRows } = await loadHelper();

  const [row] = normalizeApprovalRows([
    {
      id: 42,
      ticket_number: "1000000042",
      status: "CANCEL",
      assigned_to: "Cancelled",
      approval_1_status: "REJECTED",
    },
  ]);

  assert.equal(row.status, "Cancel");
  assert.equal(row.assignedTo, "Cancelled");
  assert.equal(row.approvalStage, "Cancelled");
});

test("normalizeApprovalRows maps reject-like statuses into Cancel for filter UI", async () => {
  const { normalizeApprovalRows } = await loadHelper();

  const [row] = normalizeApprovalRows([
    {
      id: 41,
      ticket_number: "1000000041",
      status: "REJECTED",
      approval_1_status: "APPROVED",
      approval_2_status: "APPROVED",
      approval_3_status: "REJECTED",
    },
  ]);

  assert.equal(row.status, "Cancel");
});

test("filterApprovalRowsByStatus keeps only submit rows by default", async () => {
  const { filterApprovalRowsByStatus } = await loadHelper();
  const rows = [
    { id: 1, status: "Submit" },
    { id: 2, status: "Done" },
    { id: 3, status: "Rework" },
  ];

  assert.deepEqual(filterApprovalRowsByStatus(rows, "Submit"), [{ id: 1, status: "Submit" }]);
});

test("filterApprovalRowsByStatus treats rejected rows as Cancel", async () => {
  const { filterApprovalRowsByStatus } = await loadHelper();
  const rows = [
    { id: 1, status: "Reject" },
    { id: 2, status: "Rejected" },
    { id: 3, status: "Cancel" },
    { id: 4, status: "Done" },
  ];

  assert.deepEqual(
    filterApprovalRowsByStatus(rows, "Cancel").map(row => row.id),
    [1, 2, 3]
  );
});

test("paginateApprovalRows slices rows for the requested page", async () => {
  const { paginateApprovalRows } = await loadHelper();
  const rows = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));

  assert.deepEqual(
    paginateApprovalRows(rows, 1, 5).map(row => row.id),
    [6, 7, 8, 9, 10]
  );
});
