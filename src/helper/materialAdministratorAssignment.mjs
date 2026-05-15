export const MDM_MATERIAL_GROUP_NAME = "MDM_MATERIAL";

export function normalizeApproverOptions(rows = []) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const activeOptions = normalizedRows
    .filter(row => isActiveUser(row))
    .map(row => buildApproverOption(row));

  return {
    manualApprovers: activeOptions.filter(
      option => option.roleGroupName !== MDM_MATERIAL_GROUP_NAME
    ),
    mdmApprovers: activeOptions.filter(
      option => option.roleGroupName === MDM_MATERIAL_GROUP_NAME
    ),
  };
}

export function getApproverSelectOptions({
  manualApprovers = [],
  selectedApproval1UserId,
  selectedApproval2UserId,
  field,
} = {}) {
  const selectedFieldUserId =
    field === "approval2" ? selectedApproval2UserId : selectedApproval1UserId;
  const oppositeSelectedUserId =
    field === "approval2" ? selectedApproval1UserId : selectedApproval2UserId;

  return (Array.isArray(manualApprovers) ? manualApprovers : []).filter(option => {
    const roleGroupName = normalizeGroupName(
      option?.userGroupName ?? option?.roleGroupName ?? option?.role_group_name
    );

    if (roleGroupName === MDM_MATERIAL_GROUP_NAME) {
      return false;
    }

    if (!oppositeSelectedUserId) {
      return true;
    }

    if (optionMatchesSelected(option, selectedFieldUserId)) {
      return true;
    }

    return !optionMatchesSelected(option, oppositeSelectedUserId);
  });
}

export function isApproverDropdownDisabled(statusValue) {
  return normalizeStatus(statusValue) !== "WAITING";
}

export function mergeAssignedApproverRow(row = {}, responseData = {}) {
  return {
    ...row,
    id: pickValue(responseData.id, row.id),
    ticketNumber: pickMergedValue(row, responseData, ["ticketNumber", "ticket_number"], ["ticketNumber"]),
    materialDescription: pickValue(
      pickMergedValue(
        row,
        responseData,
        ["materialDescription", "material_description"],
        ["materialDescription"]
      )
    ),
    approval1UserId: pickMergedValue(
      row,
      responseData,
      ["approval1UserId", "approval_1_user_id"],
      ["approval1UserId"]
    ),
    approval1Status: normalizeStatus(
      pickMergedValue(
        row,
        responseData,
        ["approval1Status", "approval_1_status"],
        ["approval1Status"]
      )
    ),
    approval2UserId: pickMergedValue(
      row,
      responseData,
      ["approval2UserId", "approval_2_user_id"],
      ["approval2UserId"]
    ),
    approval2Status: normalizeStatus(
      pickMergedValue(
        row,
        responseData,
        ["approval2Status", "approval_2_status"],
        ["approval2Status"]
      )
    ),
    approval3UserId: pickMergedValue(
      row,
      responseData,
      ["approval3UserId", "approval_3_user_id"],
      ["approval3UserId"]
    ),
    approval3Status: normalizeStatus(
      pickMergedValue(
        row,
        responseData,
        ["approval3Status", "approval_3_status"],
        ["approval3Status"]
      )
    ),
    assignedTo: pickMergedValue(row, responseData, ["assignedTo", "assigned_to"], ["assignedTo"]),
    updatedAt: pickMergedValue(row, responseData, ["updatedAt", "updated_at"], ["updatedAt"]),
  };
}

export function buildAssignmentSuccessMessage(previousRow = {}, nextRow = {}) {
  const hadApproval3 = Boolean(pickValue(previousRow.approval3UserId, previousRow.approval_3_user_id));
  const hasApproval3 = Boolean(pickValue(nextRow.approval3UserId, nextRow.approval_3_user_id));

  if (!hadApproval3 && hasApproval3) {
    return "Approver assignment saved. Approval 3 was auto-assigned.";
  }

  return "Approver assignment saved.";
}

export function buildAssignApproverPayload({
  previousRow = {},
  nextField,
  nextValue,
}) {
  if (nextField === "approval1UserId" && previousRow.approval1UserId !== nextValue) {
      return { approval1UserId: nextValue };
  }

  if (nextField === "approval2UserId" && previousRow.approval2UserId !== nextValue) {
      return { approval2UserId: nextValue };
  }

  return {};
}

function isActiveUser(row = {}) {
  const candidate = pickValue(row.isActive, row.is_active, row.active, row.status);

  if (typeof candidate === "boolean") {
    return candidate;
  }

  if (typeof candidate === "number") {
    return candidate === 1;
  }

  const normalized = String(candidate ?? "").trim().toUpperCase();
  return (
    normalized === "ACTIVE" ||
    normalized === "1" ||
    normalized === "TRUE" ||
    normalized === "Y" ||
    normalized === "YES"
  );
}

function buildApproverOption(row = {}) {
  const id = pickValue(row.id);
  const userId = String(pickValue(row.userId, row.user_id, row.username, row.value, id, ""));
  const fullName = String(
    pickValue(row.fullName, row.full_name, row.fullname, row.name, row.label, userId)
  );
  const roleGroupName = normalizeGroupName(
    pickValue(
      row.roleGroupName,
      row.role_group_name,
      row.userGroupName,
      row.user_group_name,
      row.groupName,
      row.group_name,
      ""
    )
  );

  return {
    id,
    value: userId,
    label: fullName,
    userId,
    username: userId,
    fullName,
    fullname: fullName,
    roleGroupName,
    userGroupName: roleGroupName,
  };
}

function normalizeStatus(value) {
  if (value === null || value === undefined || value === "") {
    return "WAITING";
  }

  const normalized = String(value).trim().toUpperCase();
  if (!normalized) {
    return "WAITING";
  }

  if (normalized === "REJECT") {
    return "REJECTED";
  }

  return normalized;
}

function pickValue(...values) {
  return values.find(value => value !== undefined && value !== null && value !== "");
}

function pickMergedValue(previousRow, responseData, responseKeys, rowKeys) {
  for (const key of responseKeys) {
    if (Object.prototype.hasOwnProperty.call(responseData, key)) {
      return responseData[key];
    }
  }

  for (const key of rowKeys) {
    if (Object.prototype.hasOwnProperty.call(previousRow, key)) {
      return previousRow[key];
    }
  }

  return undefined;
}

function normalizeGroupName(value) {
  return String(value ?? "").trim().toUpperCase();
}

function readOptionIdentifier(option = {}) {
  return pickValue(option.userId, option.username, option.value, option.id, "");
}

function identifiersMatch(left, right) {
  return String(left ?? "").trim() === String(right ?? "").trim();
}

function optionMatchesSelected(option = {}, selectedValue) {
  const candidates = [option.id, option.userId, option.username, option.value];
  return candidates.some(candidate => identifiersMatch(candidate, selectedValue));
}
