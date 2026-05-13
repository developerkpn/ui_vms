const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(path.resolve(__dirname, "adminMenuTransform.mjs")).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("buildTestingAdminMenu removes Approval and inserts My Approval plus Administrator under Materials", async () => {
  const { buildTestingAdminMenu } = await loadHelper();
  const menu = {
    ticket: { text: "Ticket", children: [] },
    approval: { text: "Approval", children: [] },
    coupa: { text: "Coupa", children: [] },
    materials: {
      text: "Materials",
      children: [
        { text: "Material Groups", url: "/dashboard/materials/lookup" },
        { text: "Material Search", url: "/dashboard/materials/search" },
        { text: "Request Material", url: "/dashboard/materials/request" },
      ],
    },
  };

  const nextMenu = buildTestingAdminMenu(menu);
  const labels = Object.values(nextMenu).map(item => item.text);
  const materialChildren = nextMenu.materials.children.map(item => item.text);

  assert.deepEqual(labels, ["Ticket", "Coupa", "Materials"]);
  assert.deepEqual(materialChildren, [
    "Material Groups",
    "Material Search",
    "Request Material",
    "My Approval",
    "Administrator",
  ]);
  assert.equal(
    nextMenu.materials.children[3].url,
    "/dashboard/administrator/approval"
  );
  assert.equal(
    nextMenu.materials.children[4].url,
    "/dashboard/materials/administrator"
  );
});

test("buildTestingAdminPermission clones Approval access into Materials child entries", async () => {
  const { buildTestingAdminPermission } = await loadHelper();
  const permission = {
    Approval: { create: false, read: true, update: true, delete: false },
    Materials: { create: false, read: false, update: false, delete: false },
  };

  const nextPermission = buildTestingAdminPermission(permission);

  assert.deepEqual(nextPermission.Materials, {
    create: false,
    read: true,
    update: false,
    delete: false,
  });
  assert.deepEqual(nextPermission["My Approval"], permission.Approval);
  assert.deepEqual(nextPermission.Administrator, permission.Approval);
});
