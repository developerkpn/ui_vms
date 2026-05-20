const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(path.resolve(__dirname, "adminApprovalDetail.mjs")).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("buildApprovalDetail maps a single request row into a filled approval form", async () => {
  const { buildApprovalDetail } = await loadHelper();

  const detail = buildApprovalDetail({
    id: 77,
    ticketNumber: "1000000077",
    ticketType: "Create",
    materialGroupCode: "901",
    materialGroupName: "Actuator & Solenoid Valve",
    subMaterialGroupCode: "002",
    subMaterialGroupName: "Actiar",
    materialDescription: "ACTUATOR PNEUM 2 ACT ACTAIR 200 NG160",
    uom: "PC",
    createdBy: "budi",
    createdAt: "2026-03-21 17:45",
    status: "Submit",
    assignedTo: "Approval 2",
    longTextLines: ["SQ50 AMRI", "KSB II", ""],
    requestFields: {
      plant: "KPN1",
      storage_location: "A001",
    },
    templateValues: {
      part_number: "P/N 404830243243",
      model: "SQ50 AMRI",
      size_dimension: "90X100X450MM",
      type_bentuk: "NG160",
      bahan_warna_material: "SS304",
      brand: "ACTIAR",
    },
    attachments: [
      {
        id: 8,
        file_name: "image1.jpg",
        file_path: "single-request-attachments/901/002/image1.jpg",
        file_type: "image/jpeg",
      },
    ],
    approval_1_status: "APPROVED",
    approval_1_user_id: "andi",
    approval_1_at: "2026-03-22 09:00",
    approval_2_status: "WAITING",
    approval_2_user_id: "tobi",
  });

  assert.equal(detail.title, "Form Material");
  assert.equal(detail.ticketNumber, "1000000077");
  assert.equal(detail.basicInfo.materialGroup, "901 - Actuator & Solenoid Valve");
  assert.equal(detail.basicInfo.subMaterialGroup, "002 - Actiar");
  assert.equal(detail.basicInfo.baseUom, "PC");
  assert.deepEqual(detail.longTextLines, ["SQ50 AMRI", "KSB II"]);
  assert.deepEqual(detail.specificationFields, [
    {
      key: "part_number",
      historyKey: "template_payload.templateValues.part_number",
      historySections: [],
      label: "Part Number",
      value: "P/N 404830243243",
    },
    {
      key: "model",
      historyKey: "template_payload.templateValues.model",
      historySections: [],
      label: "Model",
      value: "SQ50 AMRI",
    },
    {
      key: "size_dimension",
      historyKey: "template_payload.templateValues.size_dimension",
      historySections: [],
      label: "Size / Dimension",
      value: "90X100X450MM",
    },
    {
      key: "type_bentuk",
      historyKey: "template_payload.templateValues.type_bentuk",
      historySections: [],
      label: "Type / Bentuk",
      value: "NG160",
    },
    {
      key: "bahan_warna_material",
      historyKey: "template_payload.templateValues.bahan_warna_material",
      historySections: [],
      label: "Bahan / Warna Material",
      value: "SS304",
    },
    {
      key: "brand",
      historyKey: "template_payload.templateValues.brand",
      historySections: [],
      label: "Brand",
      value: "ACTIAR",
    },
  ]);
  assert.equal(detail.attachments[0].name, "image1.jpg");
  assert.equal(detail.approvalHistory[2].label, "Master Data");
  assert.deepEqual(
    detail.approvalHistory.map(item => item.status),
    ["APPROVED", "WAITING", "WAITING"]
  );
});

test("buildApprovalDetail derives rework summary from the matching approval step", async () => {
  const { buildApprovalDetail } = await loadHelper();

  const detail = buildApprovalDetail({
    ticket_number: "1000000099",
    material_description: "MOTOR STARTER",
    approval_1_user_id: "superior.user",
    approval_1_status: "APPROVED",
    approval_1_at: "2026-03-22 09:00",
    approval_2_user_id: "manager.user",
    approval_2_status: "REWORK",
    approval_2_at: "2026-03-22 10:15",
    approval_2_remark: "Mohon lengkapi drawing dan pressure rating.",
  });

  assert.equal(detail.reworkSummary.label, "Approval 2");
  assert.equal(detail.reworkSummary.approver, "manager.user");
  assert.equal(detail.reworkSummary.status, "REWORK");
  assert.equal(detail.reworkSummary.approvedAt, "2026-03-22 10:15");
  assert.equal(detail.reworkSummary.reason, "Mohon lengkapi drawing dan pressure rating.");
});

test("buildApprovalDetail exposes raw history inputs and per-field history sections", async () => {
  const { buildApprovalDetail } = await loadHelper();

  const row = {
    id: 77,
    created_by: "REQ-01",
    material_description: "Current desc",
    template_payload: {
      requestFields: {},
      templateValues: {
        density: "1.4",
      },
    },
    edit_history: [
      {
        approval_stage: "Approval 2",
        approved_by_user_id: "APP-02",
        approved_at: "2026-05-20T11:30:00.000Z",
        material_description: "Changed once",
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
        approved_at: "2026-05-20T09:15:00.000Z",
        material_description: "Original desc",
        template_payload: {
          templateValues: {
            density: "1.2",
          },
        },
        created_by: "REQ-01",
      },
    ],
  };

  const detail = buildApprovalDetail(row);

  assert.equal(detail.rawRow, row);
  assert.equal(detail.editHistory, row.edit_history);
  assert.deepEqual(detail.fieldHistory.material_description, [
    {
      stage: "Approval 2",
      beforeValue: "Changed once",
      afterValue: "Current desc",
      sourceBy: "APP-01",
      changedBy: "APP-02",
      approvedAt: "2026-05-20T11:30:00.000Z",
    },
    {
      stage: "Approval 1",
      beforeValue: "Original desc",
      afterValue: "Changed once",
      sourceBy: "REQ-01",
      changedBy: "APP-01",
      approvedAt: "2026-05-20T09:15:00.000Z",
    },
  ]);
  assert.deepEqual(detail.fieldHistory["template_payload.templateValues.density"], [
    {
      stage: "Approval 1",
      beforeValue: "1.2",
      afterValue: "1.4",
      sourceBy: "REQ-01",
      changedBy: "APP-01",
      approvedAt: "2026-05-20T09:15:00.000Z",
    },
  ]);
});
