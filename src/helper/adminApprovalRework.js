// Master Data can send a request back to the requester (until now the only
// destination), rewind it to a MANUAL approval step that already approved, or —
// when the request never had a manual chain at all — hand it to an arbitrary
// active user picked from mst_user ("chain replacement rework").
//
// The rewind path models the choice as a step *level*, never a user id: the
// engine's unit of work is the step, and one person can sit on two levels of
// the same chain. A null level is the requester, so the legacy path needs no
// sentinel. The chain-replacement path is the one exception — there is no step
// to point at yet, so it travels as `newApprovers: [userId]` instead, and the
// two are mutually exclusive on the wire.

/**
 * Destination value standing for "back to the requester". Empty string because
 * a MUI radio/select returns its value untouched and level values travel as
 * strings; it also parses to a null level, which is exactly what the API
 * expects for the legacy path.
 */
export const REWORK_TO_REQUESTER = "";

/**
 * Destination value of the hand-picked "Approval 1" row. Deliberately not a
 * number-like string so it can never be mistaken for a step level by
 * resolveReworkToLevel.
 */
export const REWORK_TO_NEW_APPROVER = "NEW_APPROVER";

/** notifyVia values accepted by the rework endpoints. */
export const NOTIFY_VIA_APP = "APP";
export const NOTIFY_VIA_EMAIL = "EMAIL";

/** Fallback label part when a row has no approver behind it. */
export const REWORK_EMPTY_SLOT_TEXT = "N/A";

/**
 * A hand-picked approver always reads as "Approval 1": it is offered only to a
 * request with no manual chain, and v1 adds exactly one — the backend takes an
 * array regardless.
 */
export const REWORK_NEW_APPROVER_POSITION = 1;

const MASS_STEP_HINT = "Mass request hanya bisa dikembalikan ke requester.";
const UNAPPROVED_STEP_HINT = "Hanya step yang sudah approved yang bisa dipilih.";

const NEW_APPROVER_REQUIRED_MESSAGE = "Pilih user untuk Approval 1 terlebih dahulu.";
const NEW_APPROVER_IS_REQUESTER_MESSAGE =
  "Approver baru tidak boleh sama dengan requester.";
const NEW_APPROVER_IS_ACTOR_MESSAGE = "Approver baru tidak boleh diri Anda sendiri.";

/**
 * Step label together with its approver, so picking a destination does not mean
 * guessing who "Approval 2" is. The email is appended when the step payload
 * carries one; without it the label stays exactly what it was before.
 *
 * @param {object} step - Normalized approval step.
 * @returns {string} e.g. "Approval 2 - Budi Santoso - budi@kpn.co.id".
 */
export function formatReworkStepLabel(step = {}) {
  const label =
    String(step?.label ?? "").trim() || `Approval ${step?.level ?? ""}`.trim();

  return joinLabelParts([
    label,
    step?.approverName,
    step?.approverEmail ?? step?.approver_email,
  ]);
}

/**
 * Turn the selected destination value into the level the API takes. Anything
 * that is not a step level — the requester's empty string and the new-approver
 * sentinel included — is null, the value that keeps the request on the existing
 * rework path.
 *
 * @param {string} selectedValue - Value held by the destination control.
 * @returns {number|null} The target step level, or null for the requester.
 */
export function resolveReworkToLevel(selectedValue) {
  if (selectedValue === REWORK_TO_NEW_APPROVER) {
    return null;
  }

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

/**
 * The requester as the destination list needs them: a label to show and every
 * identifier a picked approver must not collide with. Single requests expose
 * the requester as `requester_user_id` + a `created_by` username, mass requests
 * as `created_by` + `created_by_username`, and neither carries an email today —
 * hence the wide candidate lists and the username fallback for the label.
 *
 * @param {object} source - Approval detail, or the raw row behind it.
 * @returns {{email: string, username: string, label: string, identifiers: string[]}}
 */
export function resolveReworkRequester(source = {}) {
  const row =
    source?.rawRow && typeof source.rawRow === "object" ? source.rawRow : source;

  const email = firstFilled(
    row.requesterEmail,
    row.requester_email,
    row.createdByEmail,
    row.created_by_email,
    source.requesterEmail
  );
  const username = firstFilled(
    row.createdByUsername,
    row.created_by_username,
    source.createdBy,
    row.createdBy,
    row.created_by,
    row.requesterUsername,
    row.requester_username
  );

  return {
    email,
    username,
    label: email || username || "-",
    identifiers: uniqueIdentifiers([
      row.requesterUserId,
      row.requester_user_id,
      row.createdByUserId,
      row.created_by_user_id,
      row.createdBy,
      row.created_by,
      row.createdByUsername,
      row.created_by_username,
      row.requesterUsername,
      row.requester_username,
      source.requesterUserId,
      source.createdBy,
    ]),
  };
}

/**
 * The rework destination list: the requester, then one row per REAL manual step
 * of this request — no padding, so a request with a two-step chain shows two
 * approval rows and one with no chain shows none.
 *
 * A step row is selectable only when that step already APPROVED — while the
 * Master Data step is active every MANUAL step below it has approved, so a step
 * in any other state is one the engine decided nobody had to act on (SKIPPED),
 * and reopening it would park the request in front of no one. Mass requests have
 * no rewind support at all, so their real steps render disabled.
 *
 * A request with no MANUAL chain whatsoever (the MDM-only case this feature
 * exists for) gets no approval row at all until the user hand-picks one; once
 * picked it is appended as a normal selectable "Approval 1" row. Until then the
 * renderer offers the add affordance — see canAddReworkApprover.
 *
 * @param {object} params
 * @param {object[]} [params.approvalSteps] - Normalized steps of the request.
 * @param {string} [params.requesterLabel] - Email (or username) of the requester.
 * @param {object|null} [params.newApprover] - Hand-picked user, when there is one.
 * @param {boolean} [params.allowStepRewind] - False for mass requests.
 * @returns {{key: string, value: string, kind: string, label: string, position: number|null,
 *   selectable: boolean, disabledReason: string}[]}
 */
export function buildReworkDestinationSlots({
  approvalSteps = [],
  requesterLabel = "",
  newApprover = null,
  allowStepRewind = true,
} = {}) {
  const manualSteps = collectManualSteps(approvalSteps);

  const slots = [
    {
      key: "requester",
      value: REWORK_TO_REQUESTER,
      kind: "REQUESTER",
      label: joinLabelParts(["Requestor", requesterLabel]),
      position: null,
      selectable: true,
      disabledReason: "",
    },
  ];

  manualSteps.forEach((step, index) => {
    const isApproved = String(step.status ?? "").toUpperCase() === "APPROVED";
    slots.push({
      key: `step-${step.level}`,
      value: String(step.level),
      kind: "STEP",
      label: formatReworkStepLabel(step),
      position: index + 1,
      selectable: allowStepRewind && isApproved,
      disabledReason: !allowStepRewind
        ? MASS_STEP_HINT
        : isApproved
          ? ""
          : UNAPPROVED_STEP_HINT,
    });
  });

  // A hand-picked approver replaces an absent chain, so it is offered only when
  // there is none — and it stays selectable on mass, where the newApprovers
  // path works even though a level rewind does not.
  const hasPickedApprover =
    manualSteps.length === 0 && Boolean(resolveNewApproverUserId(newApprover));

  if (hasPickedApprover) {
    slots.push({
      key: "new-approver",
      value: REWORK_TO_NEW_APPROVER,
      kind: "NEW_APPROVER",
      label: formatNewApproverSlotLabel(REWORK_NEW_APPROVER_POSITION, newApprover),
      position: REWORK_NEW_APPROVER_POSITION,
      selectable: true,
      disabledReason: "",
    });
  }

  return slots;
}

/**
 * Whether the destination list should offer "Tambah Approver": only a request
 * with no manual chain may hand itself to a picked user, and v1 adds exactly
 * one. Derived from the rows themselves so the renderer needs nothing but the
 * slots it was given.
 *
 * @param {object[]} [slots] - From buildReworkDestinationSlots.
 * @returns {boolean}
 */
export function canAddReworkApprover(slots = []) {
  if (!Array.isArray(slots)) {
    return false;
  }

  return !slots.some(slot => slot?.kind === "STEP" || slot?.kind === "NEW_APPROVER");
}

/**
 * Label of the hand-picked row: "Approval 1 - Name - email", dropping whichever
 * part the picked user has no value for.
 *
 * @param {number} position - 1-based row position.
 * @param {object|null} approver - Picked user option.
 * @returns {string}
 */
export function formatNewApproverSlotLabel(position, approver = null) {
  if (!resolveNewApproverUserId(approver)) {
    return `Approval ${position} - ${REWORK_EMPTY_SLOT_TEXT}`;
  }

  return joinLabelParts([
    `Approval ${position}`,
    approver.fullName ?? approver.label ?? approver.username,
    approver.email,
  ]);
}

/**
 * Candidates for the added approver: every ACTIVE user the search returned,
 * minus the identifiers the request forbids (requester, acting Master Data
 * user). Labelled "Name - email" so the picker reads like the row it becomes.
 *
 * @param {object} params
 * @param {object[]} [params.users] - Options from normalizeApproverOptions.
 * @param {string[]} [params.excludeIdentifiers] - user ids / usernames to drop.
 * @returns {{id: string, value: string, label: string, fullName: string, username: string, email: string}[]}
 */
export function buildNewApproverOptions({ users = [], excludeIdentifiers = [] } = {}) {
  const blocked = uniqueIdentifiers(excludeIdentifiers);

  return (Array.isArray(users) ? users : [])
    .filter(user => !blocked.some(identifier => optionMatchesIdentifier(user, identifier)))
    .map(user => {
      const fullName = String(user.fullName ?? user.label ?? user.username ?? "").trim();
      const email = String(user.email ?? "").trim();
      return {
        // option.id is the user_id (uuid); option.value is the username. The
        // API keys approvers by uuid, so that is what the payload must carry.
        id: String(user.id ?? user.value ?? "").trim(),
        value: String(user.value ?? user.id ?? "").trim(),
        label: joinLabelParts([fullName, email]),
        fullName,
        username: String(user.username ?? user.value ?? "").trim(),
        email,
      };
    })
    .filter(option => option.id !== "");
}

/**
 * The user id a picked option contributes to `newApprovers`.
 *
 * @param {object|null} approver - Picked user option.
 * @returns {string} The uuid, or "" when nothing is picked.
 */
export function resolveNewApproverUserId(approver) {
  if (!approver || typeof approver !== "object") {
    return "";
  }

  return String(approver.id ?? approver.userId ?? approver.value ?? "").trim();
}

/**
 * Normalize the notify channel to what the API accepts; anything unknown falls
 * back to the in-app default rather than tripping the endpoint's 400.
 *
 * @param {string} value - Radio value.
 * @returns {"APP"|"EMAIL"}
 */
export function normalizeNotifyVia(value) {
  return String(value ?? "").trim().toUpperCase() === NOTIFY_VIA_EMAIL
    ? NOTIFY_VIA_EMAIL
    : NOTIFY_VIA_APP;
}

/**
 * Why the chosen destination cannot be submitted yet. The requester and the
 * step rewinds are always fine; only the hand-picked approver can be in a bad
 * state. The backend re-checks all of this — this only keeps the button honest.
 *
 * @param {object} params
 * @param {string} params.selectedValue - Selected destination value.
 * @param {object|null} [params.newApprover] - Hand-picked user, when there is one.
 * @param {string[]} [params.requesterIdentifiers] - From resolveReworkRequester.
 * @param {string[]} [params.actorIdentifiers] - Session user id / username.
 * @returns {string} Error message, or "" when the destination is submittable.
 */
export function validateReworkDestination({
  selectedValue,
  newApprover = null,
  requesterIdentifiers = [],
  actorIdentifiers = [],
} = {}) {
  if (selectedValue !== REWORK_TO_NEW_APPROVER) {
    return "";
  }

  const userId = resolveNewApproverUserId(newApprover);
  if (!userId) {
    return NEW_APPROVER_REQUIRED_MESSAGE;
  }

  if (uniqueIdentifiers(requesterIdentifiers).some(identifier => optionMatchesIdentifier(newApprover, identifier))) {
    return NEW_APPROVER_IS_REQUESTER_MESSAGE;
  }

  if (uniqueIdentifiers(actorIdentifiers).some(identifier => optionMatchesIdentifier(newApprover, identifier))) {
    return NEW_APPROVER_IS_ACTOR_MESSAGE;
  }

  return "";
}

/**
 * The destination half of a rework payload, as the dialog hands it to the page.
 * A hand-picked approver travels as `newApprovers` and suppresses
 * `reworkToLevel` entirely — the API rejects both at once — while every other
 * destination keeps sending exactly the level it sent before.
 *
 * The EMAIL channel adds the draft Master Data edited in the dialog; see
 * buildReworkEmailPayload in reworkEmailThread.js for why it is not trimmed and
 * why the APP channel contributes nothing.
 *
 * @param {object} params
 * @param {string} params.selectedValue - Selected destination value.
 * @param {object|null} [params.newApprover] - Hand-picked user, when there is one.
 * @param {string} [params.notifyVia] - Radio value of the notify channel.
 * @param {object} [params.emailContent] - From buildReworkEmailPayload.
 * @returns {{reworkToLevel: number|null}|{newApprovers: string[], notifyVia: string}}
 */
export function buildReworkDestinationPayload({
  selectedValue,
  newApprover = null,
  notifyVia = NOTIFY_VIA_APP,
  emailContent = {},
} = {}) {
  if (selectedValue === REWORK_TO_NEW_APPROVER) {
    const userId = resolveNewApproverUserId(newApprover);
    if (userId) {
      const channel = normalizeNotifyVia(notifyVia);
      // v1 adds a single approver, so the array is always exactly one element.
      return {
        newApprovers: [userId],
        notifyVia: channel,
        ...(channel === NOTIFY_VIA_EMAIL ? pickEmailContent(emailContent) : {}),
      };
    }
  }

  return { reworkToLevel: resolveReworkToLevel(selectedValue) };
}

/**
 * Request body for the single-request rework endpoint. Without a hand-picked
 * approver this is byte-for-byte the body the endpoint already received.
 *
 * @param {object} params
 * @param {string|null} [params.reason] - Rework reason (required server-side).
 * @param {object} [params.destination] - From buildReworkDestinationPayload.
 * @returns {object} POST body.
 */
export function buildSingleReworkRequestBody({ reason = null, destination = {} } = {}) {
  if (hasNewApprovers(destination)) {
    return {
      reason,
      newApprovers: destination.newApprovers,
      notifyVia: normalizeNotifyVia(destination.notifyVia),
      ...pickEmailContent(destination),
    };
  }

  return {
    // null is the requester, i.e. the only destination this endpoint had
    // before; a level rewinds the chain to that MANUAL step.
    reason,
    reworkToLevel: destination?.reworkToLevel ?? null,
  };
}

/**
 * Request body for the mass rework endpoint. Mass has no rewind support, so
 * reworkToLevel is never sent — only the requester default or a replacement
 * chain.
 *
 * @param {object} params
 * @param {string|null} [params.reason] - Rework reason (required server-side).
 * @param {object} [params.destination] - From buildReworkDestinationPayload.
 * @returns {object} POST body.
 */
export function buildMassReworkRequestBody({ reason = null, destination = {} } = {}) {
  if (hasNewApprovers(destination)) {
    return {
      reason,
      newApprovers: destination.newApprovers,
      notifyVia: normalizeNotifyVia(destination.notifyVia),
      ...pickEmailContent(destination),
    };
  }

  return { reason };
}

/**
 * Destination label for the success snackbar. Null for the requester so the
 * generic "dikembalikan untuk dirework" message keeps being used.
 *
 * @param {object} params
 * @param {object[]} [params.slots] - From buildReworkDestinationSlots.
 * @param {string} [params.selectedValue] - Selected destination value.
 * @returns {string|null}
 */
export function describeReworkDestination({ slots = [], selectedValue } = {}) {
  if (selectedValue === REWORK_TO_REQUESTER || !Array.isArray(slots)) {
    return null;
  }

  const slot = slots.find(item => item.value === selectedValue);
  return slot && slot.kind !== "REQUESTER" ? slot.label : null;
}

function hasNewApprovers(destination = {}) {
  return Array.isArray(destination?.newApprovers) && destination.newApprovers.length > 0;
}

// The two draft fields, carried only when both are actually there: a body with
// no subject is not a mail the endpoint would accept, and half a pair on the
// wire would turn the dialog's own validation gap into a 400.
function pickEmailContent(source = {}) {
  const subject = source?.emailSubject;
  const body = source?.emailBody;

  if (typeof subject !== "string" || typeof body !== "string") {
    return {};
  }

  return { emailSubject: subject, emailBody: body };
}

// Every non-MDM step is a manual chain step. Matching on "not MDM" rather than
// on kind === "MANUAL" keeps mass requests working: their steps come through
// normalizeApprovalSteps, which passes the raw kind along without defaulting it.
function collectManualSteps(approvalSteps = []) {
  if (!Array.isArray(approvalSteps)) {
    return [];
  }

  return approvalSteps
    .filter(step => String(step?.kind ?? "").trim().toUpperCase() !== "MDM")
    .slice()
    .sort((left, right) => Number(left?.level ?? 0) - Number(right?.level ?? 0));
}

function joinLabelParts(parts = []) {
  return parts
    .map(part => String(part ?? "").trim())
    .filter(part => part !== "")
    .join(" - ");
}

function firstFilled(...values) {
  const value = values.find(
    item => item !== undefined && item !== null && String(item).trim() !== ""
  );
  return value === undefined ? "" : String(value).trim();
}

function uniqueIdentifiers(values = []) {
  const identifiers = (Array.isArray(values) ? values : [])
    .map(value => String(value ?? "").trim())
    .filter(value => value !== "");
  return [...new Set(identifiers)];
}

function optionMatchesIdentifier(option = {}, identifier) {
  const target = String(identifier ?? "").trim();
  if (target === "" || !option || typeof option !== "object") {
    return false;
  }

  return [option.id, option.userId, option.value, option.username].some(
    candidate => String(candidate ?? "").trim() === target
  );
}
