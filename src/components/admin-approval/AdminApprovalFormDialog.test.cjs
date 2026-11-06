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

test("admin approval form dialog renders user input price with rupiah formatting", () => {
  const source = fs.readFileSync(formPath, "utf8");

  // Price field present with IDR formatter and Rp adornment
  assert.match(source, /formatIdrInput\(draftValues\.moving_avg_price/);
  assert.match(source, /startAdornment:\s*<InputAdornment position="start">Rp<\/InputAdornment>/);
  assert.match(source, /moving_avg_price:\s*next/);

  // Draft initialization and payload submission include moving_avg_price
  assert.match(source, /moving_avg_price:\s*firstDefined\([\s\S]*raw\.moving_avg_price/);
  assert.match(source, /editedRequest:\s*\{[\s\S]*moving_avg_price:\s*draftValues\.moving_avg_price/);
});
