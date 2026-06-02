const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const searchMaterialsPath = path.resolve(__dirname, "SearchMaterials.jsx");

test("search materials action menu includes change and extend material dialogs", () => {
  const source = fs.readFileSync(searchMaterialsPath, "utf8");

  assert.match(source, /Change Material/);
  assert.match(source, /Extend Material/);
  assert.match(source, /Reason for Material Change\?/);
  assert.match(source, /Reason for Material Extension\?/);
  assert.match(source, /primaryLabel: "Plant"/);
  assert.match(source, /secondaryLabel: "Storage Location"/);
  assert.match(source, /secondaryLabel: "Base UoM"/);
  assert.doesNotMatch(source, /Requesting material extension for/);
  assert.doesNotMatch(source, /Requesting material master data adjustment for/);
});

test("search materials submits change and extend requests to single request endpoint", () => {
  const source = fs.readFileSync(searchMaterialsPath, "utf8");

  assert.match(source, /buildChangeRequestPayload/);
  assert.match(source, /buildExtendRequestPayload/);
  assert.match(source, /axiosPrivate\.post\("\/material\/requests\/single"/);
  assert.match(source, /const payload =/);
  assert.match(source, /materialActionDialog\.mode === "change"/);
  assert.match(source, /Reason is required for Change or Extend request\./);
  assert.match(source, /const trimmedReason = \(materialActionDialog\.draft\.reason \|\| ""\)\.trim\(\)/);
});

test("extend dialog enables storage location selection from filtered plant options", () => {
  const source = fs.readFileSync(searchMaterialsPath, "utf8");

  assert.match(source, /buildStorageOptionsForPlant/);
  assert.match(source, /disabled=\{config\.secondaryDisabled \|\| storageOptions\.length === 0\}/);
  assert.doesNotMatch(source, /secondaryDisabled:\s*true/);
  assert.match(source, /field === "plantCode" \? \{ storageLocation: "" \} : \{\}/);
});
