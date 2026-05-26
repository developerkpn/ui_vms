const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(path.resolve(__dirname, "adminApprovalDraft.mjs")).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("createApprovalDraft keeps approval form fields from normalized approval rows", async () => {
  const { createApprovalDraft } = await loadHelper();

  const draft = createApprovalDraft({
    rawRow: {
      materialSubGroupId: 42,
      plantCode: "KPN1",
      slocCode: "A001",
      materialDescription: "ACTUATOR TEST",
      baseUom: "PC",
      longText1: "LINE 1",
      longText2: "LINE 2",
      longText3: "LINE 3",
      templatePayload: {
        requestFields: {
          plant: "KPN1",
        },
        templateValues: {
          brand: "ACTIAR",
        },
      },
    },
    basicInfo: {
      materialDescription: "ACTUATOR TEST",
      baseUom: "PC",
    },
  });

  assert.deepEqual(draft, {
    material_sub_group_id: 42,
    plant_code: "KPN1",
    sloc_code: "A001",
    material_description: "ACTUATOR TEST",
    base_uom: "PC",
    long_text_1: "LINE 1",
    long_text_2: "LINE 2",
    long_text_3: "LINE 3",
    template_payload: {
      requestFields: {
        plant: "KPN1",
      },
      templateValues: {
        brand: "ACTIAR",
      },
    },
  });
});
