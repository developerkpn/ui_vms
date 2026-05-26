const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(path.resolve(__dirname, "adminApprovalSubGroup.mjs")).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("buildApprovalSubGroupsRequestPath uses material group id from normalized approval rows", async () => {
  const { buildApprovalSubGroupsRequestPath } = await loadHelper();

  assert.equal(
    buildApprovalSubGroupsRequestPath({ materialGroupId: 12 }),
    "/material/subgroups/12/dropdown"
  );
  assert.equal(buildApprovalSubGroupsRequestPath({ materialGroupId: null }), null);
});

test("findSubGroupOptionById matches regardless of string or number id type", async () => {
  const { findSubGroupOptionById } = await loadHelper();

  const subGroup = findSubGroupOptionById(
    [
      { id: 101, code: "002", name: "Actiar" },
      { id: 102, code: "003", name: "Valve" },
    ],
    "101"
  );

  assert.deepEqual(subGroup, { id: 101, code: "002", name: "Actiar" });
});

test("findSubGroupOptionById falls back to current approval row while dropdown is still loading", async () => {
  const { findSubGroupOptionById } = await loadHelper();

  const subGroup = findSubGroupOptionById([], 101, {
    materialSubGroupId: 101,
    subMaterialGroupCode: "002",
    subMaterialGroupName: "Actiar",
  });

  assert.deepEqual(subGroup, { id: 101, code: "002", name: "Actiar" });
});

test("formatSubGroupOptionLabel matches request form style with code and subgroup name", async () => {
  const { formatSubGroupOptionLabel } = await loadHelper();

  assert.equal(
    formatSubGroupOptionLabel({ id: 101, code: "051", name: "Subgroup 051" }),
    "051 - Subgroup 051"
  );
});
