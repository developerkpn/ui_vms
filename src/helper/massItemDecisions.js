// Master Data's per-item decisions on a mass request — each item of the batch
// approved, reworked or rejected on its own — and the per-item state the batch
// dialog reads to tell which items are the viewer's to act on.
//
// Import-free on purpose, like massFinalCode.js: the node --test suite loads
// the source through a data: URL, so any import would have to be resolved by
// hand.

export const MASS_DECISION_APPROVE = "APPROVE";
export const MASS_DECISION_REWORK = "REWORK";
export const MASS_DECISION_REJECT = "REJECT";

export const MASS_DECISION_ACTIONS = [
  MASS_DECISION_APPROVE,
  MASS_DECISION_REWORK,
  MASS_DECISION_REJECT,
];

export const MASS_DECISION_LABELS = {
  [MASS_DECISION_APPROVE]: "Approve",
  [MASS_DECISION_REWORK]: "Rework",
  [MASS_DECISION_REJECT]: "Reject",
};

/** Status a mass batch shows once its items' statuses differ. */
export const MASS_BATCH_STATUS_PARTIAL = "Partial";

const normalizeUpper = value => String(value ?? "").trim().toUpperCase();

/**
 * An item's active step: its lowest-level step not yet APPROVED, exactly as the
 * backend resolves it.
 *
 * @param {object} item - normalized mass item ({ approvalSteps })
 * @returns {object|null}
 */
export function resolveItemActiveStep(item = {}) {
  const steps = Array.isArray(item?.approvalSteps) ? item.approvalSteps : [];

  return (
    [...steps]
      .sort((a, b) => Number(a?.level) - Number(b?.level))
      .find(step => normalizeUpper(step?.status) !== "APPROVED") ?? null
  );
}

/**
 * Two items share a lane when one action moves both: the Master Data step (one
 * grab covers the batch), or the same manual level held by the same approver.
 *
 * @param {object|null} step
 * @returns {string|null}
 */
export function massStepLaneKey(step) {
  if (!step) {
    return null;
  }

  if (normalizeUpper(step.kind) === "MDM") {
    return "MDM";
  }

  const approverUserId = step.approverUserId ?? step.approver_user_id ?? "";
  return `MANUAL:${Number(step.level)}:${approverUserId}`;
}

/**
 * Whether an item takes part in the action the dialog is offering: still in
 * flight, and waiting at the same step as `leadStep` (the step the dialog acts
 * on). Done, cancelled, reworked-to-requester items and items waiting on
 * somebody else are not.
 *
 * @param {object} item - normalized mass item ({ status, approvalSteps })
 * @param {object|null} leadStep - the dialog's active step
 * @returns {boolean}
 */
export function isMassItemActionable(item = {}, leadStep = null) {
  if (!leadStep || normalizeUpper(item?.status) !== "SUBMIT") {
    return false;
  }

  return massStepLaneKey(resolveItemActiveStep(item)) === massStepLaneKey(leadStep);
}

/**
 * Short label for where an item is, for the rows the dialog cannot act on.
 *
 * @param {object} item - normalized mass item
 * @returns {string} "Done" | "Cancel" | "Rework" | the waiting stage's label
 */
export function describeMassItemState(item = {}) {
  const status = normalizeUpper(item?.status);

  if (status === "DONE") {
    return "Done";
  }
  if (["CANCEL", "CANCELLED", "REJECT", "REJECTED"].includes(status)) {
    return "Cancel";
  }
  if (status === "REWORK") {
    return "Rework";
  }

  const active = resolveItemActiveStep(item);
  if (!active) {
    return "Submit";
  }
  if (active.label) {
    return active.label;
  }
  return normalizeUpper(active.kind) === "MDM" ? "Master Data" : `Approval ${active.level}`;
}

/**
 * Set (or, with a falsy action, clear) the decision of the given items.
 *
 * @param {Record<string, string>} decisions - action per item id
 * @param {Array<string|number>} itemIds
 * @param {string|null} action - one of MASS_DECISION_ACTIONS, or null to clear
 * @returns {Record<string, string>} a new map
 */
export function applyMassDecision(decisions = {}, itemIds = [], action = null) {
  const next = { ...decisions };

  for (const itemId of itemIds) {
    if (MASS_DECISION_ACTIONS.includes(action)) {
      next[String(itemId)] = action;
    } else {
      delete next[String(itemId)];
    }
  }

  return next;
}

/**
 * Tally the decisions over the items that need one.
 *
 * @param {Record<string, string>} decisions - action per item id
 * @param {object[]} actionableItems - normalized items ({ id, itemNo })
 * @returns {{
 *   counts: Record<string, number>,
 *   itemIdsByAction: Record<string, Array>,
 *   itemNosByAction: Record<string, Array>,
 *   undecidedItemNos: Array,
 *   complete: boolean,
 * }}
 */
export function summarizeMassDecisions(decisions = {}, actionableItems = []) {
  const counts = {};
  const itemIdsByAction = {};
  const itemNosByAction = {};
  const undecidedItemNos = [];

  for (const action of MASS_DECISION_ACTIONS) {
    counts[action] = 0;
    itemIdsByAction[action] = [];
    itemNosByAction[action] = [];
  }

  for (const item of actionableItems) {
    const action = decisions[String(item?.id)];

    if (MASS_DECISION_ACTIONS.includes(action)) {
      counts[action] += 1;
      itemIdsByAction[action].push(item.id);
      itemNosByAction[action].push(item.itemNo);
    } else {
      undecidedItemNos.push(item?.itemNo);
    }
  }

  return {
    counts,
    itemIdsByAction,
    itemNosByAction,
    undecidedItemNos,
    complete: actionableItems.length > 0 && undecidedItemNos.length === 0,
  };
}

/**
 * One line for the dialog footer, e.g. "2 Approve · 1 Rework · 1 undecided".
 * Actions nobody picked are left out.
 *
 * @param {ReturnType<typeof summarizeMassDecisions>} summary
 * @returns {string}
 */
export function formatMassDecisionSummary(summary) {
  const parts = MASS_DECISION_ACTIONS.filter(action => summary.counts[action] > 0).map(
    action => `${summary.counts[action]} ${MASS_DECISION_LABELS[action]}`
  );

  if (summary.undecidedItemNos.length > 0) {
    parts.push(`${summary.undecidedItemNos.length} undecided`);
  }

  return parts.join(" · ");
}

/**
 * "item 1, 3" — which items an action section of the confirm dialog covers.
 *
 * @param {Array<string|number>} itemNos
 * @returns {string}
 */
export function formatMassItemNos(itemNos = []) {
  return `${itemNos.length === 1 ? "item" : "items"} ${itemNos.join(", ")}`;
}

/**
 * Request body of POST /material/requests/mass/:id/decide. Each action's fields
 * are only sent when some item got that action, so the endpoint never sees a
 * reject reason for a submit that rejected nothing.
 *
 * @param {object} params
 * @param {Record<string, string>} params.decisions - action per item id
 * @param {object[]} params.actionableItems - the items waiting at Master Data
 * @param {string|null} [params.remark] - approve remark
 * @param {Record<string, string>} [params.finalCodeSuffixes] - running number per item id
 * @param {object[]|null} [params.items] - field edits (approved items only)
 * @param {string|null} [params.reworkReason]
 * @param {object} [params.reworkDestination] - { newApprovers, notifyVia, emailSubject, emailBody }
 * @param {string|null} [params.rejectReason]
 * @returns {object}
 */
export function buildMassDecideRequestBody({
  decisions = {},
  actionableItems = [],
  remark = null,
  finalCodeSuffixes = {},
  items = null,
  reworkReason = null,
  reworkDestination = {},
  rejectReason = null,
} = {}) {
  const summary = summarizeMassDecisions(decisions, actionableItems);
  const body = {
    decisions: actionableItems
      .filter(item => MASS_DECISION_ACTIONS.includes(decisions[String(item.id)]))
      .map(item => ({ itemId: item.id, action: decisions[String(item.id)] })),
  };

  if (summary.counts[MASS_DECISION_APPROVE] > 0) {
    const approveIds = summary.itemIdsByAction[MASS_DECISION_APPROVE].map(String);
    body.remark = remark;
    body.finalCodeSuffixes = Object.fromEntries(
      approveIds.map(itemId => [itemId, finalCodeSuffixes?.[itemId] ?? ""])
    );
    body.items = Array.isArray(items) && items.length > 0 ? items : null;
  }

  if (summary.counts[MASS_DECISION_REWORK] > 0) {
    body.reworkReason = reworkReason;
    for (const key of ["newApprovers", "notifyVia", "emailSubject", "emailBody"]) {
      if (reworkDestination?.[key] !== undefined) {
        body[key] = reworkDestination[key];
      }
    }
  }

  if (summary.counts[MASS_DECISION_REJECT] > 0) {
    body.rejectReason = rejectReason;
  }

  return body;
}
