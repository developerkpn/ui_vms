export const MDM_MATERIAL_GROUP_NAME = "MDM_MATERIAL";

export function normalizeApproverOptions(rows = []) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const activeOptions = normalizedRows.filter(isActiveUser).map(buildApproverOption);
  return {
    manualApprovers: activeOptions.filter(option => option.roleGroupName !== MDM_MATERIAL_GROUP_NAME),
    mdmApprovers: activeOptions.filter(option => option.roleGroupName === MDM_MATERIAL_GROUP_NAME),
  };
}

export function getApproverSelectOptions({
  manualApprovers = [],
  requesterUserId,
  requesterUsername,
  selectedApproval1UserId,
  selectedApproval2UserId,
  field,
} = {}) {
  const selectedFieldUserId = field === "approval2" ? selectedApproval2UserId : selectedApproval1UserId;
  const oppositeSelectedUserId = field === "approval2" ? selectedApproval1UserId : selectedApproval2UserId;
  return (Array.isArray(manualApprovers) ? manualApprovers : []).filter(option => {
    if (normalizeGroupName(option?.userGroupName ?? option?.roleGroupName) === MDM_MATERIAL_GROUP_NAME) {
      return false;
    }
    if (isAdminOption(option)) {
      return false;
    }
    if (optionMatchesRequester(option, { requesterUserId, requesterUsername })) {
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

export function normalizeAdministratorMasterRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter(row => !isAdminRequesterRow(row))
    .map(normalizeAdministratorMasterRow);
}

export function mergeAdministratorMasterRow(previousRow = {}, responseData = {}) {
  return normalizeAdministratorMasterRow({
    ...previousRow,
    ...responseData,
    requester_user_id: pickDefinedValue(
      responseData.requester_user_id,
      responseData.requesterUserId,
      previousRow.requesterUserId,
      ""
    ),
    requester_username: pickDefinedValue(
      responseData.requester_username,
      responseData.requesterUsername,
      previousRow.requesterUsername,
      "-"
    ),
    approval_1_user_id: pickDefinedValue(
      responseData.approval_1_user_id,
      responseData.approval1UserId,
      previousRow.approval1UserId,
      ""
    ),
    approval_2_user_id: pickDefinedValue(
      responseData.approval_2_user_id,
      responseData.approval2UserId,
      previousRow.approval2UserId,
      ""
    ),
    approval_3_user_id: pickDefinedValue(
      responseData.approval_3_user_id,
      responseData.approval3UserId,
      previousRow.approval3UserId,
      ""
    ),
    approval_3_user_name: pickDefinedValue(
      responseData.approval_3_user_name,
      responseData.approval3UserName,
      previousRow.approval3UserName,
      ""
    ),
    approval_3_type: pickDefinedValue(
      responseData.approval_3_type,
      responseData.approval3Type,
      previousRow.approval3Type,
      "SYSTEM"
    ),
    approval_3_group: pickDefinedValue(
      responseData.approval_3_group,
      responseData.approval3Group,
      previousRow.approval3Group,
      MDM_MATERIAL_GROUP_NAME
    ),
    is_locked: responseData.is_locked ?? responseData.isLocked ?? previousRow.isLocked,
  });
}

export function isAdministratorMasterLocked(row = {}) {
  return Boolean(row.isLocked);
}

export function buildAssignmentSuccessMessage() {
  return "Approver assignment saved.";
}

export function buildAssignApproverPayload({ previousRow = {}, nextField, nextValue }) {
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
  if (typeof candidate === "boolean") return candidate;
  if (typeof candidate === "number") return candidate === 1;
  const normalized = String(candidate ?? "").trim().toUpperCase();
  return ["ACTIVE", "1", "TRUE", "Y", "YES"].includes(normalized);
}

function buildApproverOption(row = {}) {
  const id = pickValue(row.id);
  const userId = String(pickValue(row.userId, row.user_id, row.username, row.value, id, ""));
  const fullName = String(pickValue(row.fullName, row.full_name, row.fullname, row.name, row.label, userId));
  const roleGroupName = normalizeGroupName(
    pickValue(row.roleGroupName, row.role_group_name, row.userGroupName, row.user_group_name, "")
  );
  const role = String(pickValue(row.role, row.role_name, row.roleName, row.userRole, "")).trim().toUpperCase();
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
    role,
  };
}

function normalizeAdministratorMasterRow(row = {}) {
  return {
    id: String(pickDefinedValue(row.requester_user_id, row.requesterUserId, "")),
    requesterUserId: String(pickDefinedValue(row.requester_user_id, row.requesterUserId, "")),
    requesterUsername: String(pickDefinedValue(row.requester_username, row.requesterUsername, "-")),
    approval1UserId: String(pickDefinedValue(row.approval_1_user_id, row.approval1UserId, "")),
    approval2UserId: String(pickDefinedValue(row.approval_2_user_id, row.approval2UserId, "")),
    approval3UserId: String(pickDefinedValue(row.approval_3_user_id, row.approval3UserId, "")),
    approval3UserName: String(pickDefinedValue(row.approval_3_user_name, row.approval3UserName, "")),
    approval3Type: String(pickDefinedValue(row.approval_3_type, row.approval3Type, "SYSTEM")),
    approval3Group: String(
      pickDefinedValue(row.approval_3_group, row.approval3Group, MDM_MATERIAL_GROUP_NAME)
    ),
    isLocked: Boolean(row.is_locked ?? row.isLocked),
  };
}

function pickValue(...values) {
  return values.find(value => value !== undefined && value !== null && value !== "");
}

function pickDefinedValue(...values) {
  return values.find(value => value !== undefined && value !== null);
}

function normalizeGroupName(value) {
  return String(value ?? "").trim().toUpperCase();
}

function identifiersMatch(left, right) {
  return String(left ?? "").trim() === String(right ?? "").trim();
}

function isAdminValue(value) {
  return normalizeGroupName(value) === "ADMIN";
}

function isAdminOption(option = {}) {
  return [option.userId, option.username, option.role].some(isAdminValue);
}

function isAdminRequesterRow(row = {}) {
  return [row.requester_user_id, row.requesterUserId, row.requester_username, row.requesterUsername].some(
    isAdminValue
  );
}

function optionMatchesRequester(option = {}, requester = {}) {
  return [requester.requesterUserId, requester.requesterUsername].some(selectedValue =>
    optionMatchesSelected(option, selectedValue)
  );
}

function optionMatchesSelected(option = {}, selectedValue) {
  const candidates = [option.id, option.userId, option.username, option.value];
  return candidates.some(candidate => identifiersMatch(candidate, selectedValue));
}
