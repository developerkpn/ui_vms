// Master Data (MDM) is a claimable queue rather than an assignable stage: the
// step carries no approver until an MDM_MATERIAL user grabs it, and only the
// grabber (or ADMIN) may act on it afterwards. Both approval dialogs draw the
// same button off the same rules — AdminApprovalFormDialog for a single request,
// MassApprovalFormDialog for a batch — so the rules live here rather than twice
// in JSX.
//
// Nothing here authorizes anything: claimSingleRequestMdmStepByUser /
// claimMassRequestMdmStepByUser (backend/services/materialService.js) re-check
// MDM_MATERIAL membership, that the MDM step is the active one, and the
// separation-of-duties rule below, and they own the single-winner race. This
// module only decides what the dialog shows.

export const MDM_STEP_KIND = "MDM";

export const MDM_GRAB_BUTTON_LABEL = "Grab / Claim";
export const MDM_GRAB_BUTTON_BUSY_LABEL = "Grabbing...";
export const MDM_CLAIM_NOTICE_UNCLAIMED = "Master Data stage belum di-claim.";
export const MDM_CLAIM_NOTICE_CLAIMED_BY_OTHER =
  "Master Data stage sudah di-claim oleh user MDM lain.";
export const MDM_CLAIM_ERROR_FALLBACK =
  "Gagal claim Master Data step. Silakan coba lagi.";

/**
 * Compare two user identifiers. Ids arrive as numbers from one payload and as
 * strings from another, and an absent approver is variously null, undefined or
 * "" — none of which is anybody, so none of them ever matches.
 *
 * @param {*} left
 * @param {*} right
 * @returns {boolean}
 */
export function identifiersMatch(left, right) {
  if (left === undefined || left === null || left === "") return false;
  if (right === undefined || right === null || right === "") return false;
  return String(left).trim() === String(right).trim();
}

/**
 * True when an identifier names nobody — how an unclaimed MDM step reads.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isBlankIdentifier(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

/**
 * A step's kind, uppercased, from either payload casing.
 *
 * @param {object} step
 * @returns {string} e.g. "MDM", "MANUAL", or "" when the step carries none.
 */
export function resolveStepKind(step) {
  return String(step?.kind ?? step?.stage_kind ?? "")
    .trim()
    .toUpperCase();
}

/**
 * @param {object} step
 * @returns {boolean} True for the Master Data step.
 */
export function isMdmStep(step) {
  return resolveStepKind(step) === MDM_STEP_KIND;
}

/**
 * A step's approver/claimer id, from either payload casing.
 *
 * @param {object} step
 * @returns {*} The id, or null when the step is still unassigned/unclaimed.
 */
export function resolveStepApproverUserId(step) {
  return step?.approverUserId ?? step?.approver_user_id ?? null;
}

/**
 * Separation of duties: whoever already acted as approver on an earlier
 * (non-MDM) step of this request must not grab its Master Data step. Mirrors
 * hasActorApprovedEarlierStep on the backend, which enforces it for real.
 *
 * @param {object} params
 * @param {object[]} [params.approvalSteps=[]] - The request's/batch's steps.
 * @param {*} [params.userId] - The acting user's id.
 * @returns {boolean}
 */
export function hasApprovedEarlierStep({ approvalSteps = [], userId } = {}) {
  const steps = Array.isArray(approvalSteps) ? approvalSteps : [];

  return steps.some(
    step =>
      !isMdmStep(step) && identifiersMatch(resolveStepApproverUserId(step), userId)
  );
}

/**
 * Path of the claim endpoint. The two request tables are separate, so a batch
 * claims through the mass path and a single request through its own.
 *
 * @param {object} params
 * @param {string|number} [params.requestId] - Request or mass-request id.
 * @param {boolean} [params.isMassRequest=false] - True for a batch.
 * @returns {string} The axios path, or "" when there is no id to claim.
 */
export function buildClaimMdmPath({ requestId, isMassRequest = false } = {}) {
  if (isBlankIdentifier(requestId)) {
    return "";
  }

  return `/material/requests/${
    isMassRequest ? "mass" : "single"
  }/${requestId}/claim-mdm`;
}

/**
 * Everything the dialogs gate the Master Data stage on, from one place.
 *
 * The grab button shows only while the queue is genuinely open to this user:
 * the MDM stage is the active one, nobody holds it, the user is MDM_MATERIAL,
 * they did not already approve an earlier step, and the request is still
 * actionable (status Submit). `claimNotice` is the caption that explains a
 * missing button to an MDM user who could otherwise have grabbed — empty for
 * everyone the notice would only confuse.
 *
 * @param {object} params
 * @param {object[]} [params.approvalSteps=[]] - Steps as currently known.
 * @param {boolean} [params.isMdmStageActive=false] - Active step is Master Data.
 * @param {*} [params.mdmApproverUserId] - Active step's approver/claimer id.
 * @param {*} [params.currentUserId] - Session user id.
 * @param {boolean} [params.isMdmUser=false] - Session user is MDM_MATERIAL.
 * @param {boolean} [params.canSubmitApprovalAction=false] - Request is actionable.
 * @returns {{isMdmUnclaimed: boolean, isMdmClaimedByMe: boolean,
 *   hasApprovedEarlierStep: boolean, canGrabMdm: boolean, claimNotice: string}}
 */
export function evaluateMdmClaimGate({
  approvalSteps = [],
  isMdmStageActive = false,
  mdmApproverUserId = null,
  currentUserId = null,
  isMdmUser = false,
  canSubmitApprovalAction = false,
} = {}) {
  const mdmStageActive = Boolean(isMdmStageActive);
  const isMdmUnclaimed = mdmStageActive && isBlankIdentifier(mdmApproverUserId);
  const isMdmClaimedByMe =
    mdmStageActive && identifiersMatch(mdmApproverUserId, currentUserId);
  const approvedEarlierStep = hasApprovedEarlierStep({
    approvalSteps,
    userId: currentUserId,
  });
  // An MDM user who is neither the claimer nor barred from claiming is the only
  // one told why the stage is not theirs to act on yet.
  const showsClaimNotice =
    mdmStageActive &&
    Boolean(canSubmitApprovalAction) &&
    !isMdmClaimedByMe &&
    Boolean(isMdmUser) &&
    !approvedEarlierStep;

  return {
    isMdmUnclaimed,
    isMdmClaimedByMe,
    hasApprovedEarlierStep: approvedEarlierStep,
    canGrabMdm:
      mdmStageActive &&
      isMdmUnclaimed &&
      Boolean(isMdmUser) &&
      !approvedEarlierStep &&
      Boolean(canSubmitApprovalAction) &&
      !isMdmClaimedByMe,
    claimNotice: showsClaimNotice
      ? isMdmUnclaimed
        ? MDM_CLAIM_NOTICE_UNCLAIMED
        : MDM_CLAIM_NOTICE_CLAIMED_BY_OTHER
      : "",
  };
}

/**
 * The refreshed steps a won claim echoes back, whichever envelope they came in.
 *
 * @param {object} responseData - The axios response body.
 * @returns {object[]|null} The steps, or null when the response echoed none.
 */
export function extractClaimedApprovalSteps(responseData) {
  const nextSteps =
    responseData?.data?.approvalSteps ||
    responseData?.data?.approval_steps ||
    responseData?.approvalSteps ||
    responseData?.approval_steps ||
    (Array.isArray(responseData?.data) ? responseData.data : null);

  return Array.isArray(nextSteps) ? nextSteps : null;
}

/**
 * Steps as they would read after a won claim, for the case where the response
 * echoed none: this user becomes the open Master Data step's claimer and
 * nothing else moves. Only ever called after the endpoint answered 200, so it
 * asserts a claim the server already granted.
 *
 * @param {object} params
 * @param {object[]} [params.approvalSteps=[]] - Steps as currently known.
 * @param {*} [params.currentStageLevel] - Active level, for the empty-steps case.
 * @param {*} [params.userId] - The claiming user's id.
 * @returns {object[]} The patched steps.
 */
export function applyOptimisticMdmClaim({
  approvalSteps = [],
  currentStageLevel = null,
  userId = null,
} = {}) {
  const steps = Array.isArray(approvalSteps) ? approvalSteps : [];
  // Nothing to patch — stand up the one step the claim was about, which is all
  // the gate reads.
  const claimedStep = {
    level: currentStageLevel,
    kind: MDM_STEP_KIND,
    status: "WAITING",
    approverUserId: userId,
  };

  if (steps.length === 0) {
    return [claimedStep];
  }

  let claimed = false;

  const nextSteps = steps.map(step => {
    if (
      claimed ||
      !isMdmStep(step) ||
      !isBlankIdentifier(resolveStepApproverUserId(step))
    ) {
      return step;
    }

    claimed = true;
    return { ...step, approverUserId: userId };
  });

  return claimed ? nextSteps : [...steps, claimedStep];
}

/**
 * What to show when a claim fails. The backend's own message is the useful one —
 * it names the reason (already claimed, prior approver, not an MDM user) — so it
 * wins whenever there is one.
 *
 * @param {object} error - The axios error.
 * @returns {string}
 */
export function resolveMdmClaimErrorMessage(error) {
  return error?.response?.data?.message || MDM_CLAIM_ERROR_FALLBACK;
}
