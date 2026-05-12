const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(path.resolve(__dirname, "adminMenuTransform.mjs")).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("buildTestingAdminMenu removes Approval and inserts Administrator after Coupa", async () => {
  const { buildTestingAdminMenu } = await loadHelper();
  const menu = {
    ticket: { text: "Ticket", children: [] },
    approval: { text: "Approval", children: [] },
    coupa: { text: "Coupa", children: [] },
    materials: { text: "Materials", children: [] },
  };

  const nextMenu = buildTestingAdminMenu(menu);
  const labels = Object.values(nextMenu).map(item => item.text);

  assert.deepEqual(labels, ["Ticket", "Coupa", "Administrator", "Materials"]);
  assert.equal(
    nextMenu["administrator-testing"].children[0].url,
    "/dashboard/administrator/approval"
  );
});

test("buildTestingAdminPermission clones Approval access into Administrator entries", async () => {
  const { buildTestingAdminPermission } = await loadHelper();
  const permission = {
    Approval: { create: false, read: true, update: true, delete: false },
  };

  const nextPermission = buildTestingAdminPermission(permission);

  assert.deepEqual(nextPermission.Administrator, permission.Approval);
  assert.deepEqual(nextPermission["My Approval"], permission.Approval);
});
