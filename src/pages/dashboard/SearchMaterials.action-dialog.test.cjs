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
});
