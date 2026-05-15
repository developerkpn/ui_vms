const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(
  path.resolve(__dirname, "materialAdministratorAssignment.mjs")
).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("normalizeApproverOptions separates manual approvers from MDM approvers", async () => {
  const { normalizeApproverOptions, MDM_MATERIAL_GROUP_NAME } = await loadHelper();

  const approvers = normalizeApproverOptions([
    {
      id: 101,
      username: "manual-1",
      fullname: "Manual One",
      user_group_name: "BUYER",
      is_active: "Y",
    },
    {
      id: 201,
      username: "mdm-1",
      fullname: "MDM One",
      user_group_name: ` ${MDM_MATERIAL_GROUP_NAME} `,
      is_active: "yes",
    },
    {
      id: 102,
      username: "manual-2",
      fullname: "Manual Two",
      user_group_name: "BUYER",
      is_active: "N",
    },
    {
      id: 202,
      username: "mdm-2",
      fullname: "MDM Two",
      user_group_name: MDM_MATERIAL_GROUP_NAME,
      is_active: "",
    },
  ]);

  assert.deepEqual(approvers.manualApprovers, [
    {
      id: 101,
      value: "manual-1",
      label: "Manual One",
      userId: "manual-1",
      username: "manual-1",
      fullName: "Manual One",
      fullname: "Manual One",
      roleGroupName: "BUYER",
      userGroupName: "BUYER",
    },
  ]);
  assert.deepEqual(approvers.mdmApprovers, [
    {
      id: 201,
      value: "mdm-1",
      label: "MDM One",
      userId: "mdm-1",
      username: "mdm-1",
      fullName: "MDM One",
      fullname: "MDM One",
      roleGroupName: MDM_MATERIAL_GROUP_NAME,
      userGroupName: MDM_MATERIAL_GROUP_NAME,
    },
  ]);
});

test("getApproverSelectOptions excludes the opposite selected approver and all MDM users while keeping the current option visible", async () => {
  const { getApproverSelectOptions } = await loadHelper();
  const manualApprovers = [
    {
      id: 101,
      value: "manual-1",
      label: "Manual One",
      userId: "manual-1",
      username: "manual-1",
      fullName: "Manual One",
      fullname: "Manual One",
      roleGroupName: "BUYER",
      userGroupName: "BUYER",
    },
    {
      id: 102,
      value: "manual-2",
      label: "Manual Two",
      userId: "manual-2",
      username: "manual-2",
      fullName: "Manual Two",
      fullname: "Manual Two",
      roleGroupName: "BUYER",
      userGroupName: "BUYER",
    },
    {
      id: 103,
      value: "manual-3",
      label: "Manual Three",
      userId: "manual-3",
      username: "manual-3",
      fullName: "Manual Three",
      fullname: "Manual Three",
      roleGroupName: "BUYER",
      userGroupName: "BUYER",
    },
    {
      id: 201,
      value: "mdm-1",
      label: "MDM One",
      userId: "mdm-1",
      username: "mdm-1",
      fullName: "MDM One",
      fullname: "MDM One",
      roleGroupName: " MDM_MATERIAL ",
      userGroupName: " MDM_MATERIAL ",
    },
  ];

  const approval1Options = getApproverSelectOptions({
    manualApprovers,
    selectedApproval1UserId: "manual-1",
    selectedApproval2UserId: "manual-2",
    field: "approval1",
  });
  const approval2Options = getApproverSelectOptions({
    manualApprovers,
    selectedApproval1UserId: 101,
    selectedApproval2UserId: "manual-2",
    field: "approval2",
  });

  assert.deepEqual(approval1Options, [
    {
      id: 101,
      value: "manual-1",
      label: "Manual One",
      userId: "manual-1",
      username: "manual-1",
      fullName: "Manual One",
      fullname: "Manual One",
      roleGroupName: "BUYER",
      userGroupName: "BUYER",
    },
    {
      id: 103,
      value: "manual-3",
      label: "Manual Three",
      userId: "manual-3",
      username: "manual-3",
      fullName: "Manual Three",
      fullname: "Manual Three",
      roleGroupName: "BUYER",
      userGroupName: "BUYER",
    },
  ]);
  assert.deepEqual(approval2Options, [
    {
      id: 102,
      value: "manual-2",
      label: "Manual Two",
      userId: "manual-2",
      username: "manual-2",
      fullName: "Manual Two",
      fullname: "Manual Two",
      roleGroupName: "BUYER",
      userGroupName: "BUYER",
    },
    {
      id: 103,
      value: "manual-3",
      label: "Manual Three",
      userId: "manual-3",
      username: "manual-3",
      fullName: "Manual Three",
      fullname: "Manual Three",
      roleGroupName: "BUYER",
      userGroupName: "BUYER",
    },
  ]);
});

test("isApproverDropdownDisabled only unlocks WAITING statuses", async () => {
  const { isApproverDropdownDisabled } = await loadHelper();

  assert.equal(isApproverDropdownDisabled("WAITING"), false);
  assert.equal(isApproverDropdownDisabled(null), false);
  assert.equal(isApproverDropdownDisabled("Reject"), true);
  assert.equal(isApproverDropdownDisabled("APPROVED"), true);
});

test("mergeAssignedApproverRow keeps approval 3 read-only and merges backend response", async () => {
  const { mergeAssignedApproverRow } = await loadHelper();

  const nextRow = mergeAssignedApproverRow(
    {
      id: 17,
      ticketNumber: "1000000017",
      materialDescription: "Pump",
      approval1UserId: "manual-1",
      approval1Status: null,
      approval2UserId: "manual-2",
      approval2Status: "Reject",
      approval3UserId: "mdm-old",
      approval3Status: "APPROVED",
      assignedTo: "Approval 2",
      requesterUsername: "requester.a",
      requestNumber: "REQ-17",
      extraPageField: "keep-me",
    },
    {
      approval_1_user_id: "manual-9",
      approval_1_status: "APPROVED",
      approval_2_user_id: "manual-8",
      approval_2_status: null,
      approval_3_user_id: "mdm-new",
      approval_3_status: "WAITING",
      assigned_to: "Approval 3",
      updated_at: "2026-05-15 10:45",
    }
  );

  assert.deepEqual(nextRow, {
    id: 17,
    ticketNumber: "1000000017",
    materialDescription: "Pump",
    approval1UserId: "manual-9",
    approval1Status: "APPROVED",
    approval2UserId: "manual-8",
    approval2Status: "WAITING",
    approval3UserId: "mdm-new",
    approval3Status: "WAITING",
    assignedTo: "Approval 3",
    updatedAt: "2026-05-15 10:45",
    requesterUsername: "requester.a",
    requestNumber: "REQ-17",
    extraPageField: "keep-me",
  });
});

test("buildAssignmentSuccessMessage mentions approval 3 auto-assignment when newly added", async () => {
  const { buildAssignmentSuccessMessage } = await loadHelper();

  const message = buildAssignmentSuccessMessage(
    {
      approval1UserId: "manual-1",
      approval2UserId: "manual-2",
      approval3UserId: "",
    },
    {
      approval1UserId: "manual-1",
      approval2UserId: "manual-9",
      approval3UserId: "mdm-1",
    }
  );

  assert.equal(
    message,
    "Approver assignment saved. Approval 3 was auto-assigned."
  );
});

test("buildAssignApproverPayload only sends the changed approval field", async () => {
  const { buildAssignApproverPayload } = await loadHelper();

  assert.deepEqual(
      buildAssignApproverPayload({
          previousRow: { approval1UserId: "USR-A1", approval2UserId: "" },
          nextField: "approval2UserId",
          nextValue: "USR-A2",
      }),
      { approval2UserId: "USR-A2" }
  );
});
