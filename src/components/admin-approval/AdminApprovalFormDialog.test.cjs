const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const formPath = path.resolve(__dirname, "AdminApprovalFormDialog.jsx");

test("material description input caps visible text to the SAP max length while typing", () => {
  const source = fs.readFileSync(formPath, "utf8");

  assert.match(source, /inputProps=\{\{\s*maxLength:\s*MATERIAL_DESCRIPTION_MAX_LENGTH/);
  assert.match(source, /slice\(0,\s*MATERIAL_DESCRIPTION_MAX_LENGTH\)/);
});
