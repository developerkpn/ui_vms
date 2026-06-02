const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const requestMaterialsPath = path.resolve(__dirname, "RequestMaterials.jsx");
const routesPath = path.resolve(__dirname, "../../route/routes.jsx");
const singleRequestPagePath = path.resolve(__dirname, "SingleRequestPage.jsx");
const adminApprovalViewPath = path.resolve(__dirname, "AdminApprovalView.jsx");

test("admin approval dialog enables reject action and requires reject reason", () => {
  const dialogSource = fs.readFileSync(
    path.resolve(__dirname, "../../components/admin-approval/AdminApprovalFormDialog.jsx"),
    "utf8"
  );

  assert.match(dialogSource, /handleRejectClick/);
  assert.match(dialogSource, /setCurrentAction\("Reject"\)/);
  assert.match(dialogSource, /reject reason is required/i);
  assert.doesNotMatch(dialogSource, /title="Belum masuk scope"/);
});

test("admin approval view posts reject action to dedicated endpoint", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "AdminApprovalView.jsx"),
    "utf8"
  );

  assert.match(source, /\["Approve", "Rework", "Reject"\]/);
  assert.match(source, /\/material\/requests\/single\/\$\{detail\.id\}\/reject/);
  assert.match(source, /Request berhasil direject dan status berubah menjadi Cancel\./);
});

test("request materials cancel status badge uses red background with white text", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "RequestMaterials.jsx"),
    "utf8"
  );

  assert.match(source, /const normalizedStatus = String\(status \|\| ""\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(source, /CANCEL:\s*\{\s*bgcolor:\s*"#dc2626",\s*color:\s*"#ffffff"\s*\}/);
  assert.match(source, /CANCELLED:\s*\{\s*bgcolor:\s*"#dc2626",\s*color:\s*"#ffffff"\s*\}/);
});

test("request materials action menu includes copy request placeholder item", () => {
  const source = fs.readFileSync(requestMaterialsPath, "utf8");
  const actionMenuBlock = source.match(
    /<Menu\s+anchorEl=\{menuAnchorEl\}[\s\S]*?<\/Menu>/
  );

  assert.ok(actionMenuBlock, "expected RequestMaterials action menu block");
  assert.match(actionMenuBlock[0], /View Approval/);
  assert.match(actionMenuBlock[0], /View Rework/);
  assert.match(actionMenuBlock[0], /Copy Request/);
});

test("request materials rework dialog includes revise request action and rework route", () => {
  const source = fs.readFileSync(requestMaterialsPath, "utf8");
  const routesSource = fs.readFileSync(routesPath, "utf8");
  const singleRequestPageSource = fs.readFileSync(singleRequestPagePath, "utf8");

  assert.match(source, /Revise Request/);
  assert.match(source, /\/dashboard\/materials\/request\/single\/\$\{detail\.id\}\/rework/);
  assert.match(routesSource, /materials\/request\/single\/:id\/rework/);
  assert.match(singleRequestPageSource, /useParams/);
  assert.match(singleRequestPageSource, /mode="rework"|mode === "rework"|isReworkMode/);
  assert.match(singleRequestPageSource, /requestId=\{requestId\}/);
  assert.match(singleRequestPageSource, /mode=\{isReworkMode \? "rework" : "create"\}/);
});

test("request materials approval dialog maps approval display names from API rows", () => {
  const source = fs.readFileSync(requestMaterialsPath, "utf8");

  assert.match(source, /approval_1_user_name:\s*item\.approval_1_user_name/);
  assert.match(source, /approval_2_user_name:\s*item\.approval_2_user_name/);
  assert.match(source, /approval_3_user_name:\s*item\.approval_3_user_name/);
});

test("admin approval view wires rework actions and keeps view rework display-only", () => {
  const source = fs.readFileSync(adminApprovalViewPath, "utf8");

  assert.match(source, /action === "Rework"/);
  assert.match(source, /\/material\/requests\/single\/\$\{detail\.id\}\/rework/);
  assert.match(source, /setReworkDialogRow/);
  assert.match(source, /reworkSummary/);
  assert.doesNotMatch(source, /\/dashboard\/materials\/request\/single\/\$\{row\.id\}\/rework/);
});

test("change extend approval view is read only and skips editable approval history", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../components/admin-approval/AdminApprovalFormDialog.jsx"),
    "utf8"
  );

  assert.match(source, /isChangeExtendRequest/);
  assert.match(source, /ChangeExtendApprovalSummary/);
  assert.match(source, /Approve/);
  assert.match(source, /Rework/);
  assert.match(source, /Reject/);
});

test("request materials uses scoped rework forms for change and extend", () => {
  const source = fs.readFileSync(requestMaterialsPath, "utf8");

  assert.match(source, /ChangeExtendReworkForm/);
  assert.match(source, /material_description:\s*draft\.materialName/);
  assert.match(source, /base_uom:\s*draft\.baseUom/);
  assert.match(source, /plant_code:\s*draft\.plantCode/);
  assert.match(source, /sloc_code:\s*draft\.storageLocation/);
  assert.match(source, /change_extend_reason:\s*originalReason/);
  assert.match(source, /originalReason = row\?\.changeExtendReason \|\| row\?\.reworkReason/);
});
