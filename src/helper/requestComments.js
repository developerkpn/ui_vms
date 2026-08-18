// "View Comments" reads one request's whole conversation — the submit reason,
// every approve remark, every rework reason, the reject reason — from
// /material/requests/{single|mass}/:id/comments, which returns them in the
// order they were said.
//
// This module is the client half of that endpoint: the path, the row
// normalizer, and the copy the dialog renders. Deliberately import-free, like
// reworkEmailThread.js: the node --test suite loads the source through a data:
// URL, so any import would have to be resolved by hand.

/** Request kinds the comments endpoint is keyed by. */
export const REQUEST_COMMENT_KIND_SINGLE = "SINGLE";
export const REQUEST_COMMENT_KIND_MASS = "MASS";

/** Dialog heading. */
export const REQUEST_COMMENTS_TITLE = "Comments";

/** Shown when the request has no comment rows at all. */
export const REQUEST_COMMENTS_EMPTY_TEXT =
  "Belum ada komentar untuk request ini.";

/** Shown in place of the thread when the endpoint fails. */
export const REQUEST_COMMENTS_ERROR_TEXT =
  "Gagal memuat komentar request. Silakan coba lagi.";

/**
 * Stands in for the comment text on an event that carries none. Half the events
 * legitimately have nothing to say — a Create request is submitted without a
 * reason and an approve remark is optional — so this is a normal outcome, and
 * it gets the same dash every other empty value in these dialogs gets.
 */
export const REQUEST_COMMENT_NO_TEXT = "-";

/**
 * Badge wording per event. English like every other status word in these
 * dialogs (the approval cards' Approve / Rework / Reject / Waiting badges), so
 * the two views name the same action the same way.
 */
export const REQUEST_COMMENT_EVENT_LABELS = {
  SUBMIT: "Submit",
  RESUBMIT: "Resubmit",
  APPROVE: "Approve",
  REWORK: "Rework",
  REJECT: "Reject",
  // A rework sent "Via email" is correspondence: a message went out and the
  // request stayed where it was. Labelled separately from Rework so the thread
  // never claims a request moved when it did not.
  CORRESPONDENCE: "Correspondence",
};

/**
 * Which of the two request tables an id belongs to. Mirrors how the dialogs
 * already choose between the single and mass paths.
 *
 * @param {boolean} isMassRequest - True when the open row is a mass batch.
 * @returns {"SINGLE"|"MASS"}
 */
export function resolveRequestCommentKind(isMassRequest) {
  return isMassRequest ? REQUEST_COMMENT_KIND_MASS : REQUEST_COMMENT_KIND_SINGLE;
}

/**
 * Path of the comments endpoint for a request.
 *
 * @param {object} params
 * @param {string} [params.requestKind] - From resolveRequestCommentKind.
 * @param {string|number} [params.requestId] - The request's id.
 * @returns {string} The axios path, or "" when there is no id to ask about.
 */
export function buildRequestCommentsPath({ requestKind, requestId } = {}) {
  const id = asText(requestId);

  if (id === "") {
    return "";
  }

  const segment =
    asText(requestKind).toUpperCase() === REQUEST_COMMENT_KIND_MASS
      ? "mass"
      : "single";

  return `/material/requests/${segment}/${encodeURIComponent(id)}/comments`;
}

/**
 * The thread as the dialog renders it, oldest first. Accepts the whole axios
 * response, its `data` envelope, or the bare row array, so a caller never has to
 * know which layer it is holding; anything else becomes an empty thread.
 *
 * `comment` stays null rather than "" when nothing was said — the dialog shows
 * different copy for "no reason given" than for a reason, so the two cannot
 * collapse into one value.
 *
 * @param {object} source - Response, envelope, or the row array itself.
 * @returns {{id: string, eventType: string, stage: string, actorName: string,
 *   comment: string|null, createdAt: string|null}[]}
 */
export function normalizeRequestComments(source) {
  const payload = unwrapPayload(source);

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter(row => row && typeof row === "object")
    .map((row, index) => {
      const comment = asText(row.comment);

      return {
        id: asText(row.id) || `request-comment-${index}`,
        eventType: asText(row.eventType ?? row.event_type).toUpperCase(),
        stage: asText(row.stage),
        actorName: asText(row.actorName ?? row.actor_name),
        comment: comment === "" ? null : comment,
        createdAt: row.createdAt ?? row.created_at ?? null,
      };
    });
}

/**
 * Badge wording for one entry. An event type the client does not know is shown
 * as it arrived rather than dropped or relabelled — a thread that hides an event
 * is worse than one showing an unfamiliar word.
 *
 * @param {object} [comment] - A normalized entry.
 * @returns {string}
 */
export function buildRequestCommentEventLabel(comment = {}) {
  const eventType = asText(comment.eventType).toUpperCase();
  return REQUEST_COMMENT_EVENT_LABELS[eventType] || eventType || "-";
}

/**
 * Who this entry is filed under: the approval stage that acted, or the
 * requester's own name when the event belongs to no stage (submit / resubmit
 * carry no stage by design).
 *
 * @param {object} [comment] - A normalized entry.
 * @returns {string} e.g. "Approval 1", "Master Data", or the requester's name.
 */
export function buildRequestCommentTitle(comment = {}) {
  return comment.stage || comment.actorName || "-";
}

/**
 * Message shown under the comment field when a resubmit is missing one.
 */
export const REQUESTER_COMMENT_REQUIRED_MESSAGE =
  "Komentar wajib diisi saat resubmit setelah rework.";

/**
 * Whether the requester's comment is required, per the rule that only a
 * resubmit-after-rework demands an answer — a new submission never does.
 *
 * @param {boolean} [isResubmit] - True for any of the three resubmit surfaces
 *   (mass, Change/Extend, single Create); false for a brand-new submission.
 * @returns {"required"|"optional"}
 */
export function resolveRequesterCommentRequirement(isResubmit) {
  return isResubmit ? "required" : "optional";
}

/**
 * Validates a requester's comment draft against that requirement. Whitespace
 * is not content: a resubmit comment of only spaces fails the same as an
 * empty one, so the requirement cannot be defeated by a space.
 *
 * @param {string} [value] - The comment as typed so far.
 * @param {object} [options]
 * @param {boolean} [options.isResubmit] - See resolveRequesterCommentRequirement.
 * @returns {{error: boolean, message: string}}
 */
export function validateRequesterComment(value, { isResubmit } = {}) {
  if (resolveRequesterCommentRequirement(isResubmit) !== "required") {
    return { error: false, message: "" };
  }

  if (asText(value) === "") {
    return { error: true, message: REQUESTER_COMMENT_REQUIRED_MESSAGE };
  }

  return { error: false, message: "" };
}

// Peel the axios response / {success, data} envelope off a payload. Written as
// a loop rather than a chain of optional reads so a bare payload, an envelope,
// and a full response all land on the same value.
function unwrapPayload(source) {
  let current = source;

  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return current;
    }
    if (!("data" in current)) {
      return current;
    }
    current = current.data;
  }

  return current;
}

function asText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
