const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(
  path.resolve(__dirname, "materialChangeExtendRequest.mjs")
).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("buildChangeRequestPayload maps Change dialog state to single request payload", async () => {
  const helper = await loadHelper();

  const payload = helper.buildChangeRequestPayload({
    material: {
      code: "901.001.001",
      id: 10,
      name: "OLD NAME",
      unit_of_measurement: "PC",
      groupCode: "901",
      groupId: 1,
      subGroupId: 2,
    },
    draft: {
      materialName: "NEW NAME",
      baseUom: "EA",
      reason: "Correct base UoM",
      templateValues: { part_number: "P/N 100" },
    },
  });

  assert.equal(payload.ticketType, "Change");
  assert.equal(payload.materialCode, "901.001.001");
  assert.equal(payload.materialGroupId, "1");
  assert.equal(payload.materialSubGroupId, "2");
  assert.equal(payload.change_extend_reason, "Correct base UoM");
  assert.deepEqual(payload.requestFields, {
    material_description: "NEW NAME",
    base_uom: "EA",
  });
  assert.deepEqual(payload.templateValues, { part_number: "P/N 100" });
  assert.equal("material_description" in payload, false);
  assert.equal("base_uom" in payload, false);
  assert.equal("template_payload" in payload, false);
});

test("buildExtendRequestPayload maps Extend dialog state to single request payload", async () => {
  const helper = await loadHelper();

  const payload = helper.buildExtendRequestPayload({
    material: {
      code: "901.001.001",
      name: "PUMP",
      unit_of_measurement: "PC",
      groupId: 1,
      subGroupId: 2,
    },
    draft: {
      plantCode: "EU73",
      storageLocation: "ST01",
      reason: "Extend to Kijing store",
    },
  });

  assert.equal(payload.ticketType, "Extend");
  assert.equal(payload.materialCode, "901.001.001");
  assert.equal(payload.materialGroupId, "1");
  assert.equal(payload.materialSubGroupId, "2");
  assert.equal(payload.change_extend_reason, "Extend to Kijing store");
  assert.deepEqual(payload.requestFields, {
    material_description: "PUMP",
    base_uom: "PC",
    plant: "EU73",
    storage_location: "ST01",
  });
  assert.deepEqual(payload.templateValues, {});
  assert.equal("material_description" in payload, false);
  assert.equal("base_uom" in payload, false);
  assert.equal("plant_code" in payload, false);
  assert.equal("sloc_code" in payload, false);
  assert.equal("template_payload" in payload, false);
});

test("buildStorageOptionsForPlant filters storage locations by selected plant", async () => {
  const helper = await loadHelper();
  const locations = [
    { plant_code: "EU73", sloc_code: "ST01", storage_location: "Main Store" },
    { plant_code: "EU73", sloc_code: "ST02", storage_location: "Reserve Store" },
    { plant_code: "EU74", sloc_code: "ST01", storage_location: "Main Store" },
  ];

  assert.deepEqual(helper.buildStorageOptionsForPlant(locations, "EU73"), [
    { value: "ST01", label: "Main Store" },
    { value: "ST02", label: "Reserve Store" },
  ]);
});

test("buildChangeTemplateFields returns only available naming fields from material snapshot", async () => {
  const helper = await loadHelper();

  assert.deepEqual(
    helper.buildChangeTemplateFields({
      part_number: "P/N 100",
      brand: "ACME",
      unused_field: "skip me",
    }),
    [
      { key: "part_number", label: "Part Number", value: "P/N 100" },
      { key: "brand", label: "Brand", value: "ACME" },
    ]
  );
});
