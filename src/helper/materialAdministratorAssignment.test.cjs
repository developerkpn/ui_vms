const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(path.resolve(__dirname, "materialAdministratorAssignment.mjs")).href;
async function loadHelper() {
  return import(helperModuleUrl);
}

test("normalizeAdministratorMasterRows keeps one row per requester user and preserves lock state", async () => {
  const { normalizeAdministratorMasterRows } = await loadHelper();
  const rows = normalizeAdministratorMasterRows([
    {
      requester_user_id: "USER-BUDI",
      requester_username: "BUDI",
      approval_1_user_id: "APP-1",
      approval_2_user_id: "APP-2",
      approval_3_type: "SYSTEM",
      approval_3_group: "MDM_MATERIAL",
      is_locked: true,
    },
  ]);
  assert.deepEqual(rows[0], {
    id: "USER-BUDI",
    requesterUserId: "USER-BUDI",
    requesterUsername: "BUDI",
    approval1UserId: "APP-1",
    approval2UserId: "APP-2",
    approval3Type: "SYSTEM",
    approval3Group: "MDM_MATERIAL",
    isLocked: true,
  });
});

test("buildAssignApproverPayload still only sends changed master fields", async () => {
  const { buildAssignApproverPayload } = await loadHelper();
  assert.deepEqual(
    buildAssignApproverPayload({
      previousRow: { approval1UserId: "APP-1", approval2UserId: "" },
      nextField: "approval2UserId",
      nextValue: "APP-2",
    }),
    { approval2UserId: "APP-2" }
  );
});

test("administrator rows no longer require request number or approval status text", async () => {
  const { normalizeAdministratorMasterRows } = await loadHelper();
  const rows = normalizeAdministratorMasterRows([
    { requester_user_id: "USER-BUDI", requester_username: "BUDI", is_locked: false },
  ]);
  assert.equal(rows[0].requestNumber, undefined);
});

test("getApproverSelectOptions excludes requester self and admin accounts", async () => {
  const { getApproverSelectOptions } = await loadHelper();
  const manualApprovers = [
    {
      id: "REQ-1",
      userId: "REQ-1",
      username: "budi",
      label: "Budi",
      fullName: "Budi",
      roleGroupName: "BUYER",
      userGroupName: "BUYER",
      role: "USER",
    },
    {
      id: "APP-1",
      userId: "APP-1",
      username: "user.one",
      label: "User One",
      fullName: "User One",
      roleGroupName: "BUYER",
      userGroupName: "BUYER",
      role: "USER",
    },
    {
      id: "APP-2",
      userId: "APP-2",
      username: "ADMIN",
      label: "Administrator",
      fullName: "Administrator",
      roleGroupName: "BUYER",
      userGroupName: "BUYER",
      role: "ADMIN",
    },
  ];

  const options = getApproverSelectOptions({
    manualApprovers,
    requesterUserId: "REQ-1",
    requesterUsername: "budi",
    selectedApproval1UserId: "",
    selectedApproval2UserId: "",
    field: "approval1",
  });

  assert.deepEqual(options.map(option => option.id), ["APP-1"]);
});

test("mergeAdministratorMasterRow preserves requester identity when patch response is partial", async () => {
  const { mergeAdministratorMasterRow } = await loadHelper();

  const merged = mergeAdministratorMasterRow(
    {
      id: "REQ-1",
      requesterUserId: "REQ-1",
      requesterUsername: "budi",
      approval1UserId: "",
      approval2UserId: "",
      approval3Type: "SYSTEM",
      approval3Group: "MDM_MATERIAL",
      isLocked: false,
    },
    {
      approval_1_user_id: "APP-1",
    }
  );

  assert.deepEqual(merged, {
    id: "REQ-1",
    requesterUserId: "REQ-1",
    requesterUsername: "budi",
    approval1UserId: "APP-1",
    approval2UserId: "",
    approval3Type: "SYSTEM",
    approval3Group: "MDM_MATERIAL",
    isLocked: false,
  });
});

test("normalizeAdministratorMasterRows excludes admin requester rows", async () => {
  const { normalizeAdministratorMasterRows } = await loadHelper();

  const rows = normalizeAdministratorMasterRows([
    { requester_user_id: "REQ-1", requester_username: "budi", is_locked: false },
    { requester_user_id: "ADMIN", requester_username: "ADMIN", is_locked: false },
  ]);

  assert.deepEqual(rows.map(row => row.requesterUsername), ["budi"]);
});
