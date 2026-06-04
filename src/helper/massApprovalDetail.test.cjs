const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(
  path.resolve(__dirname, "massApprovalDetail.mjs")
).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("buildMassApprovalDetail returns detail object from normalized row", async () => {
  const { buildMassApprovalDetail } = await loadHelper();

  const row = {
    massRequestNo: "MR-2024-0001",
    massRequestReason: "Project materials",
    itemCount: 3,
    status: "Submit",
    assignedTo: "Approval 1",
    createdBy: "budi",
    createdAt: "2024-10-01 08:30",
    approvalStage: "Approval 1",
    firstItemApproval1Status: "WAITING",
    firstItemApproval1UserId: "APP-01",
    firstItemApproval1UserName: "Budi Approver",
    firstItemApproval2UserId: "APP-02",
    firstItemApproval2Status: null,
    firstItemApproval3UserId: null,
    firstItemApproval3Status: null,
  };

  const detail = buildMassApprovalDetail(row);

  assert.equal(detail.massRequestNo, "MR-2024-0001");
  assert.equal(detail.massRequestReason, "Project materials");
  assert.equal(detail.itemCount, 3);
  assert.equal(detail.status, "Submit");
  assert.equal(detail.approval1Status, "WAITING");
  assert.equal(detail.approval1UserName, "Budi Approver");
  assert.equal(detail.items.length, 0);
});

test("buildMassApprovalDetail includes normalized items with all fields when provided", async () => {
  const { buildMassApprovalDetail } = await loadHelper();

  const row = {
    massRequestNo: "MR-2024-0001",
    massRequestReason: "Project materials",
    itemCount: 2,
  };

  const items = [
    {
      id: 1001,
      item_no: 1,
      request_no: "2000000001",
      material_description: "Cement 50kg",
      base_uom: "ZAK",
      plant_code: "PL01",
      sloc_code: "SL01",
      material_group: "MG01",
      material_sub_group: "MSG01",
      po_text: "PO-001",
      spesifikasi_tambahan: "Grade A",
      status: "Submit",
      assigned_to: "Approval 1",
    },
    {
      id: 1002,
      item_no: 2,
      request_no: "2000000002",
      material_description: "Sand 1m3",
      base_uom: "M3",
      plant_code: "PL01",
      sloc_code: "SL02",
      material_group: "MG01",
      material_sub_group: "MSG02",
      po_text: "",
      spesifikasi_tambahan: "",
      status: "Submit",
      assigned_to: "Approval 1",
    },
  ];

  const detail = buildMassApprovalDetail(row, items);

  assert.equal(detail.items.length, 2);
  assert.equal(detail.items[0].id, 1001);
  assert.equal(detail.items[0].itemNo, 1);
  assert.equal(detail.items[0].requestNo, "2000000001");
  assert.equal(detail.items[0].materialDescription, "Cement 50kg");
  assert.equal(detail.items[0].uom, "ZAK");
  assert.equal(detail.items[0].plantCode, "PL01");
  assert.equal(detail.items[0].slocCode, "SL01");
  assert.equal(detail.items[0].materialGroup, "MG01");
  assert.equal(detail.items[0].materialSubGroup, "MSG01");
  assert.equal(detail.items[0].poText, "PO-001");
  assert.equal(detail.items[0].spesifikasiTambahan, "Grade A");
  assert.equal(detail.items[1].materialDescription, "Sand 1m3");
  assert.equal(detail.items[1].uom, "M3");
  assert.equal(detail.items[1].plantCode, "PL01");
  assert.equal(detail.items[1].slocCode, "SL02");
  assert.equal(detail.items[1].poText, "");
  assert.equal(detail.items[1].spesifikasiTambahan, "");
});

test("buildMassApprovalDetail handles empty or missing values", async () => {
  const { buildMassApprovalDetail } = await loadHelper();

  const detail = buildMassApprovalDetail({});
  assert.equal(detail.massRequestNo, "-");
  assert.equal(detail.massRequestReason, "-");
  assert.equal(detail.itemCount, 0);
  assert.equal(detail.status, "Submit");
  assert.deepEqual(detail.items, []);
});

test("buildMassReworkSummary returns null when no rework data", async () => {
  const { buildMassReworkSummary } = await loadHelper();
  const result = buildMassReworkSummary({ massRequestNo: "MR-001" });
  assert.equal(result, null);
});

test("buildMassReworkSummary extracts rework from first item approval 1 remark", async () => {
  const { buildMassReworkSummary } = await loadHelper();

  const row = {
    massRequestNo: "MR-001",
    approvalStage: "Approval 1",
    firstItemApproval1Remark: "Need more details",
    firstItemApproval1UserName: "Approver One",
    firstItemApproval1At: "2024-10-01 10:00",
  };

  const result = buildMassReworkSummary(row);
  assert.equal(result.massRequestNo, "MR-001");
  assert.equal(result.reason, "Need more details");
  assert.equal(result.approver, "Approver One");
  assert.equal(result.at, "2024-10-01 10:00");
});

test("buildMassReworkSummary falls back to approval 2 fields", async () => {
  const { buildMassReworkSummary } = await loadHelper();

  const row = {
    massRequestNo: "MR-002",
    approvalStage: "Approval 2",
    firstItemApproval2Remark: "Revised spec needed",
    firstItemApproval2At: "2024-10-02 14:30",
  };

  const result = buildMassReworkSummary(row);
  assert.equal(result.reason, "Revised spec needed");
  assert.equal(result.at, "2024-10-02 14:30");
});
