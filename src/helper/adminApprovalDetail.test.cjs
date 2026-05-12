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
    { key: "part_number", label: "Part Number", value: "P/N 404830243243" },
    { key: "model", label: "Model", value: "SQ50 AMRI" },
    { key: "size_dimension", label: "Size / Dimension", value: "90X100X450MM" },
    { key: "type_bentuk", label: "Type / Bentuk", value: "NG160" },
    { key: "bahan_warna_material", label: "Bahan / Warna Material", value: "SS304" },
    { key: "brand", label: "Brand", value: "ACTIAR" },
  ]);
  assert.equal(detail.attachments[0].name, "image1.jpg");
  assert.deepEqual(
    detail.approvalHistory.map(item => item.status),
    ["APPROVED", "WAITING", "WAITING"]
  );
});
