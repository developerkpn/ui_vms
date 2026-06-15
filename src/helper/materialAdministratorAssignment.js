export const MDM_MATERIAL_GROUP_NAME = "MDM_MATERIAL";
export const MASTER_DATA_LABEL = "Master Data";
export const MASTER_DATA_HINT = "Master Data — assigned by grab";

export function normalizeApproverOptions(rows = []) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const activeOptions = normalizedRows.filter(isActiveUser).map(buildApproverOption);
  return {
    manualApprovers: activeOptions.filter(option => option.roleGroupName !== MDM_MATERIAL_GROUP_NAME),
    mdmApprovers: activeOptions.filter(option => option.roleGroupName === MDM_MATERIAL_GROUP_NAME),
  };
}

// Build the list of selectable approvers for ONE manual slot in the chain.
// Excludes: every MDM_MATERIAL user, every admin, the requester, and every
// approver already chosen elsewhere in the chain (so the same person can't be
// picked twice). The slot's own currently-selected approver stays selectable.
export function getApproverSelectOptions({
  manualApprovers = [],
  requesterUserId,
  requesterUsername,
  selectedApproverIds = [],
  currentSlotUserId,
} = {}) {
  const takenElsewhere = (Array.isArray(selectedApproverIds) ? selectedApproverIds : []).filter(
    id => id && !identifiersMatch(id, currentSlotUserId)
  );
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
    if (takenElsewhere.some(takenId => optionMatchesSelected(option, takenId))) {
      return false;
    }
    return true;
  });
}

export function normalizeAdministratorMasterRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter(row => !isAdminRequesterRow(row))
    .map(normalizeAdministratorMasterRow);
}

export function mergeAdministratorMasterRow(previousRow = {}, responseData = {}) {
  const rawSteps =
    responseData.manualApprovers ??
    responseData.manual_approvers ??
    previousRow.manualApprovers ??
    [];
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
    requester_fullname: pickDefinedValue(
      responseData.requester_fullname,
      responseData.requesterFullname,
      previousRow.requesterFullname,
      ""
    ),
    requester_email: pickDefinedValue(
      responseData.requester_email,
      responseData.requesterEmail,
      previousRow.requesterEmail,
      ""
    ),
    manualApprovers: rawSteps,
    is_locked: responseData.is_locked ?? responseData.isLocked ?? previousRow.isLocked,
  });
}

export function isAdministratorMasterLocked(row = {}) {
  return Boolean(row.isLocked);
}

export function buildAssignmentSuccessMessage() {
  return "Approver chain saved.";
}

// Turn an ordered list of draft selections (option objects or raw ids, possibly
// containing empty/blank slots) into the PUT body the backend expects:
//   { manualApprovers: [userId1, userId2, ...] }  (ordered, empties dropped).
export function buildSaveChainPayload(draftManualIds = []) {
  const manualApprovers = (Array.isArray(draftManualIds) ? draftManualIds : [])
    .map(extractApproverId)
    .filter(id => id !== "");
  return { manualApprovers };
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
  const email = String(pickValue(row.email, row.user_email, row.emailAddress, "")).trim();
  return {
    id,
    value: userId,
    label: fullName,
    userId,
    username: userId,
    fullName,
    fullname: fullName,
    email,
    roleGroupName,
    userGroupName: roleGroupName,
    role,
  };
}

// Normalize a single requester row into the variable-length chain shape.
// manualApprovers: ordered [{ level, approverUserId, approverName,
//   approverUsername, approverEmail }]. Accepts either the new array shape
// (camel or snake), or — as a fallback — falls back to an empty chain.
function normalizeAdministratorMasterRow(row = {}) {
  const requesterUserId = String(pickDefinedValue(row.requester_user_id, row.requesterUserId, ""));
  return {
    id: requesterUserId,
    requesterUserId,
    requesterUsername: String(pickDefinedValue(row.requester_username, row.requesterUsername, "-")),
    requesterFullname: String(pickDefinedValue(row.requester_fullname, row.requesterFullname, "")),
    requesterEmail: String(pickDefinedValue(row.requester_email, row.requesterEmail, "")),
    manualApprovers: normalizeManualApprovers(
      pickDefinedValue(row.manualApprovers, row.manual_approvers, [])
    ),
    isLocked: Boolean(row.is_locked ?? row.isLocked),
  };
}

function normalizeManualApprovers(steps = []) {
  return (Array.isArray(steps) ? steps : [])
    .map((step, index) => normalizeManualApprover(step, index))
    .filter(step => step.approverUserId !== "");
}

function normalizeManualApprover(step = {}, index = 0) {
  const approverUserId = String(
    pickDefinedValue(step.approverUserId, step.approver_user_id, step.userId, step.user_id, "")
  );
  return {
    level: Number(pickDefinedValue(step.level, index + 1)),
    approverUserId,
    approverName: String(
      pickDefinedValue(step.approverName, step.approver_name, step.fullName, step.full_name, "")
    ),
    approverUsername: String(
      pickDefinedValue(step.approverUsername, step.approver_username, step.username, "")
    ),
    approverEmail: String(pickDefinedValue(step.approverEmail, step.approver_email, step.email, "")),
  };
}

function extractApproverId(entry) {
  if (entry === undefined || entry === null) return "";
  if (typeof entry === "object") {
    return String(pickDefinedValue(entry.approverUserId, entry.id, entry.userId, entry.value, "")).trim();
  }
  return String(entry).trim();
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
  if (selectedValue === undefined || selectedValue === null || selectedValue === "") return false;
  const candidates = [option.id, option.userId, option.username, option.value];
  return candidates.some(candidate => identifiersMatch(candidate, selectedValue));
}
