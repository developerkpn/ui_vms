// Master Data can send a request back to the requester (until now the only
// destination) or rewind it to a MANUAL approval step that already approved.
// The API models the choice as a step *level*, never a user id: the engine's
// unit of work is the step, and one person can sit on two levels of the same
// chain. A null level is the requester, so the legacy path needs no sentinel.

/**
 * Dropdown value standing for "back to the requester". Empty string because a
 * MUI Select returns its value untouched and level values travel as strings;
 * it also parses to a null level, which is exactly what the API expects. The
 * cost is that the Select needs displayEmpty to render this option's label at
 * all — see the "Rework To" field.
 */
export const REWORK_TO_REQUESTER = "";

/**
 * Step label together with its approver, so picking a destination does not mean
 * guessing who "Approval 2" is.
 *
 * @param {object} step - Normalized approval step.
 * @returns {string} e.g. "Approval 2 - Budi Santoso", or just the label.
 */
export function formatReworkStepLabel(step = {}) {
  const label =
    String(step?.label ?? "").trim() || `Approval ${step?.level ?? ""}`.trim();
  const approverName = String(step?.approverName ?? "").trim();

  return approverName ? `${label} - ${approverName}` : label;
}

/**
 * Rework destinations besides the requester: this request's own MANUAL steps.
 * Only APPROVED ones qualify — while the Master Data step is active every
 * MANUAL step below it has already approved, so a step in any other state is
 * one the engine decided nobody had to act on (SKIPPED) and reopening it would
 * park the request in front of no one. A request without MANUAL steps (Extend)
 * yields nothing, which is what hides the dropdown.
 *
 * @param {object[]} approvalSteps - Normalized steps from buildApprovalDetail.
 * @returns {{value: string, label: string}[]} One option per eligible step, in level order.
 */
export function buildReworkStepOptions(approvalSteps = []) {
  if (!Array.isArray(approvalSteps)) {
    return [];
  }

  return approvalSteps
    .filter(step => step?.kind === "MANUAL" && step?.status === "APPROVED")
    .map(step => ({
      value: String(step.level),
      label: formatReworkStepLabel(step),
    }));
}

/**
 * Turn the selected dropdown value into the level the API takes. Anything that
 * is not a step level — the requester's empty string included — is null, the
 * value that keeps the request on the existing rework path.
 *
 * @param {string} selectedValue - Value held by the destination dropdown.
 * @returns {number|null} The target step level, or null for the requester.
 */
export function resolveReworkToLevel(selectedValue) {
  const level = Number.parseInt(selectedValue, 10);
  return Number.isInteger(level) ? level : null;
}

/**
 * Which step a level points at, for confirming the destination back to the user.
 *
 * @param {object[]} approvalSteps - Normalized steps from buildApprovalDetail.
 * @param {number|null} level - The level sent as reworkToLevel.
 * @returns {string|null} That step's label, or null when the level is absent or unknown.
 */
export function findReworkStepLabel(approvalSteps = [], level = null) {
  if (level === null || level === undefined || !Array.isArray(approvalSteps)) {
    return null;
  }

  const step = approvalSteps.find(item => Number(item?.level) === Number(level));
  return step ? formatReworkStepLabel(step) : null;
}
