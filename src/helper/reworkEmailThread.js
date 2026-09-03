// Chain-replacement rework can tell the hand-picked approver by e-mail instead
// of in-app. That mail is a real one now: Master Data prefills a draft from the
// request's own data, edits it in the rework dialog, and the reply the approver
// sends back is polled into the request detail as a read-only thread.
//
// This module is the client half of both endpoints — the draft
// (`rework-email-template`) and the thread (`rework-email-thread`) — plus the
// blank-field validation the dialog runs before it lets a rework through.
// Deliberately import-free, like adminApprovalRework.js: the node --test suite
// loads the source through a data: URL, so any import would have to be resolved
// by hand.

/** Request kinds the rework e-mail endpoints are keyed by. */
export const REWORK_EMAIL_KIND_SINGLE = "SINGLE";
export const REWORK_EMAIL_KIND_MASS = "MASS";

/**
 * The mailbox rework mails leave from and replies come back to — the backend's
 * SMTP_USERNAME, identical in development.env and production.env. Hardcoded
 * because the template endpoint returns only {subject, body}: this address is
 * copy, not data, and it exists so the approver knows which sender to expect in
 * their inbox.
 */
export const REWORK_EMAIL_SENDER_ADDRESS = "vms.kpn@kpndomain.com";

/**
 * Caption under the "Via email" radio.
 *
 * The last sentence is the consequence, and it is the surprising half: unlike
 * "Via aplikasi", this channel does NOT hand the request to the person picked.
 * Nothing is reassigned — the mail goes out, the request stays claimed at Master
 * Data, and Master Data acts on the reply itself.
 */
export const REWORK_EMAIL_NOTICE =
  `Email dikirim dari ${REWORK_EMAIL_SENDER_ADDRESS}, ` +
  "balasan approver akan muncul di detail request. " +
  "Request tetap di Master Data - email hanya untuk korespondensi.";

/**
 * Tail of the success snackbar, and the reason it exists: the list refreshes
 * after a rework, and on this channel the row comes back unchanged. Saying so
 * turns "nothing happened" into "exactly what was supposed to happen".
 */
export const REWORK_EMAIL_SENT_SUFFIX = "Request tetap di Master Data.";

/**
 * Success snackbar for a correspondence-only ("Via email") rework.
 *
 * @param {string} [recipientEmail] - Address the mail went to, when the dialog
 *        had one to hand up; anything blank falls back to the generic line
 *        rather than rendering "Email terkirim ke .".
 * @returns {string}
 */
export function buildReworkEmailSentMessage(recipientEmail) {
  const recipient = asText(recipientEmail);

  return recipient === ""
    ? `Email terkirim. ${REWORK_EMAIL_SENT_SUFFIX}`
    : `Email terkirim ke ${recipient}. ${REWORK_EMAIL_SENT_SUFFIX}`;
}

/**
 * Did the rework endpoint answer with the correspondence-only outcome? The flag
 * is what tells the page that nothing moved, so it must be an explicit true —
 * an older backend that does not send it keeps the reassignment copy.
 *
 * @param {object} source - Response, {success, data} envelope, or bare payload.
 * @returns {boolean}
 */
export function isReworkEmailOnlyResult(source) {
  return unwrapPayload(source)?.emailOnly === true;
}

/**
 * Warning snackbar for the correspondence-only rework whose SMTP send failed:
 * the endpoint still answers 200 (the mail is best-effort by design), so
 * without this the user would be told the mail went out when it did not.
 */
export const REWORK_EMAIL_SEND_FAILED_MESSAGE =
  "Email GAGAL terkirim - cek bagian Email Rework di detail request. " +
  REWORK_EMAIL_SENT_SUFFIX;

/**
 * Did the correspondence-only rework fail to actually send the mail? Only
 * meaningful when {@link isReworkEmailOnlyResult} is true; requires the
 * explicit `sent: false` the backend writes on a send failure.
 *
 * @param {object} source - Response, {success, data} envelope, or bare payload.
 * @returns {boolean}
 */
export function isReworkEmailSendFailed(source) {
  const payload = unwrapPayload(source);
  return payload?.emailOnly === true && payload?.notify?.sent === false;
}

/** Shown in place of the draft when the template endpoint fails. */
export const REWORK_EMAIL_TEMPLATE_ERROR_TEXT =
  "Gagal memuat template email. Silakan tulis subject dan isi email secara manual.";

const EMAIL_SUBJECT_REQUIRED_MESSAGE = "Subject email wajib diisi.";
const EMAIL_BODY_REQUIRED_MESSAGE = "Isi email wajib diisi.";

/**
 * Shown in place of the reason box once the mail is the message: on the EMAIL
 * channel Master Data writes the reason as the mail itself, so asking for a
 * second one would only be typing the same thing twice.
 */
export const REWORK_EMAIL_REASON_NOTICE = "Alasan rework otomatis dari subjek email.";

/** Lead-in of a reason derived from the subject, so the history says where it came from. */
export const REWORK_EMAIL_REASON_PREFIX = "Dikirim via email: ";

/** Longest reason the rework endpoints store in rework_reason. */
const REWORK_REASON_MAX_LENGTH = 250;

// The threading token the template stamps into every subject ("[VMS#REQ-9]").
// It is plumbing for matching the reply back to the request, not something a
// reader of the in-app history needs, so the derived reason drops it.
const SUBJECT_REQUEST_TOKEN_PATTERN = /\[VMS#[^\]]*\]/g;

/** Section heading of the read-only thread in the request detail. */
export const REWORK_EMAIL_THREAD_TITLE = "Email Rework";

/** Chip on a reply whose sender is not the approver the mail was addressed to. */
export const REWORK_EMAIL_SENDER_MISMATCH_TEXT = "Pengirim berbeda";

/**
 * Sub-text under the Status chip while a rework mail is out and unanswered.
 * Nothing else on the row says so: the pill still reads Submit and the request
 * is still parked at Master Data, so without this line a request waiting on
 * someone's inbox is indistinguishable from one waiting on nothing.
 */
export const REWORK_EMAIL_AWAITING_APPROVAL_TEXT = "Awaiting Email Approval";

/**
 * Sub-text under the Status chip once the approver has written back. The reply
 * itself lives in the request detail's thread section; this only says one is
 * there, so a requester or approver scanning the list knows to open the row.
 */
export const REWORK_EMAIL_APPROVAL_CONFIRMED_TEXT = "Email Approval Confirmed";

/**
 * One of the list payload's rework-mail counts as a number. Anything that is
 * not a finite count reads as none, which renders no line at all — the same as
 * a request that never had a mail sent.
 *
 * @param {*} value - Raw `emailSentCount` / `emailReplyCount` off a row.
 * @returns {number} 0 or more.
 */
export function normalizeEmailThreadCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

/**
 * The one-line e-mail approval indicator under the Status chip.
 *
 * Reads two counts, and neither is the thread's reply total. The sent count
 * decides whether there is anything to say at all — "no mail was ever sent" and
 * "sent, still waiting" are both zero replies, and only the sent count
 * separates them. The count of sent mails with no reply then decides answered
 * vs waiting: a request can be reworked by mail more than once, and every mail
 * that went out is owed an answer, so one that is still unanswered holds the
 * request even after a later one has been replied to.
 *
 * Counted per mail rather than by comparing the two totals, because replies are
 * not one per mail. An approver who writes back twice leaves two rows against a
 * single mail, which would make the totals match on a request that still has an
 * ignored mail, and mismatch on one that is fully answered.
 *
 * @param {object} [row] - List row carrying emailSentCount, emailUnansweredCount
 *        and emailReplyCount.
 * @returns {{text: string, confirmed: boolean}} text is "" when the request
 *          never had a rework mail sent, which renders no line at all.
 */
export function buildEmailApprovalCaption(row = {}) {
  if (normalizeEmailThreadCount(row?.emailSentCount) === 0) {
    // A backend that predates the sent count answers 0 for it. A reply is
    // proof a mail went out, so the row still reads as answered rather than as
    // one that never had a mailed rework.
    return normalizeEmailThreadCount(row?.emailReplyCount) > 0
      ? { text: REWORK_EMAIL_APPROVAL_CONFIRMED_TEXT, confirmed: true }
      : { text: "", confirmed: false };
  }

  return normalizeEmailThreadCount(row?.emailUnansweredCount) > 0
    ? { text: REWORK_EMAIL_AWAITING_APPROVAL_TEXT, confirmed: false }
    : { text: REWORK_EMAIL_APPROVAL_CONFIRMED_TEXT, confirmed: true };
}

/**
 * Which of the two request tables an id belongs to. Mirrors how the dialogs
 * already choose between the single and mass claim-mdm paths.
 *
 * @param {boolean} isMassRequest - True when the open row is a mass batch.
 * @returns {"SINGLE"|"MASS"}
 */
export function resolveReworkEmailKind(isMassRequest) {
  return isMassRequest ? REWORK_EMAIL_KIND_MASS : REWORK_EMAIL_KIND_SINGLE;
}

/**
 * Path of the draft endpoint for a request.
 *
 * @param {object} params
 * @param {string} [params.requestKind] - From resolveReworkEmailKind.
 * @param {string|number} [params.requestId] - The request's id.
 * @returns {string} The axios path, or "" when there is no id to ask about.
 */
export function buildReworkEmailTemplatePath({ requestKind, requestId } = {}) {
  return buildReworkEmailPath(requestKind, requestId, "rework-email-template");
}

/**
 * Path of the thread endpoint for a request.
 *
 * @param {object} params
 * @param {string} [params.requestKind] - From resolveReworkEmailKind.
 * @param {string|number} [params.requestId] - The request's id.
 * @returns {string} The axios path, or "" when there is no id to ask about.
 */
export function buildReworkEmailThreadPath({ requestKind, requestId } = {}) {
  return buildReworkEmailPath(requestKind, requestId, "rework-email-thread");
}

/**
 * The draft as the two text fields need it. Accepts the whole axios response,
 * its `data` envelope, or the bare payload, so a caller never has to know which
 * layer it is holding.
 *
 * @param {object} source - Response, envelope, or {subject, body}.
 * @returns {{subject: string, body: string}} Both empty when nothing usable came back.
 */
export function normalizeReworkEmailTemplate(source) {
  const payload = unwrapPayload(source);

  return {
    subject: asText(payload?.subject),
    body: asText(payload?.body),
  };
}

/**
 * Every mail sent for a request, newest first, each with its replies. Same
 * unwrapping tolerance as normalizeReworkEmailTemplate; anything that is not a
 * list of rows becomes an empty thread, which the detail renders as no section
 * at all.
 *
 * @param {object} source - Response, envelope, or the row array itself.
 * @returns {{id: string, subject: string, body: string, toEmail: string, sendStatus: string,
 *   sendError: string, sentAt: string|null,
 *   replies: {fromEmail: string, senderMatches: boolean, receivedAt: string|null, bodyText: string}[]}[]}
 */
export function normalizeReworkEmailThread(source) {
  const payload = unwrapPayload(source);

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter(row => row && typeof row === "object")
    .map((row, index) => ({
      id: asText(row.id) || `rework-email-${index}`,
      subject: asText(row.subject),
      body: asText(row.body),
      toEmail: asText(row.toEmail ?? row.to_email),
      // The backend only ever writes SENT or FAILED; an unknown value is shown
      // as-is rather than guessed at.
      sendStatus: asText(row.sendStatus ?? row.send_status).toUpperCase() || "SENT",
      sendError: asText(row.sendError ?? row.send_error),
      sentAt: row.sentAt ?? row.sent_at ?? null,
      replies: normalizeReworkEmailReplies(row.replies),
    }));
}

/**
 * Blank-field check for the draft. Only the EMAIL channel has anything to
 * validate — the APP channel sends no mail, so its fields are not even shown.
 * The endpoint re-checks both (400 `<PREFIX>_REWORK_EMAIL_CONTENT_REQUIRED`);
 * this only keeps the submit button honest.
 *
 * @param {object} params
 * @param {string} [params.notifyVia] - Radio value of the notify channel.
 * @param {string} [params.subject] - Edited subject.
 * @param {string} [params.body] - Edited body.
 * @returns {{subject: string, body: string}} Per-field message, "" when fine.
 */
export function validateReworkEmailContent({ notifyVia, subject, body } = {}) {
  if (!isEmailChannel(notifyVia)) {
    return { subject: "", body: "" };
  }

  return {
    subject: asText(subject) === "" ? EMAIL_SUBJECT_REQUIRED_MESSAGE : "",
    body: asText(body) === "" ? EMAIL_BODY_REQUIRED_MESSAGE : "",
  };
}

/**
 * Whether validateReworkEmailContent found anything blocking.
 *
 * @param {object} [errors] - From validateReworkEmailContent.
 * @returns {boolean}
 */
export function hasReworkEmailContentError(errors = {}) {
  return Boolean(errors?.subject || errors?.body);
}

/**
 * The e-mail half of a rework payload. Untrimmed on purpose: the body's own
 * blank lines and indentation are the approver's mail, and the endpoint stores
 * exactly what was sent. Only the EMAIL channel contributes anything, so an
 * in-app rework keeps sending byte-for-byte the body it sent before.
 *
 * @param {object} params
 * @param {string} [params.notifyVia] - Radio value of the notify channel.
 * @param {string} [params.subject] - Edited subject.
 * @param {string} [params.body] - Edited body.
 * @returns {{emailSubject: string, emailBody: string}|{}}
 */
export function buildReworkEmailPayload({ notifyVia, subject, body } = {}) {
  if (!isEmailChannel(notifyVia)) {
    return {};
  }

  return {
    emailSubject: String(subject ?? ""),
    emailBody: String(body ?? ""),
  };
}

/**
 * The rework reason an EMAIL rework files instead of asking for one. Every
 * rework stores a rework_reason and the in-app history renders it, so the
 * subject — the one line the approver actually reads first — stands in for the
 * reason nobody would type twice.
 *
 * The prefix is unconditional, so the result is never blank even for a subject
 * that is nothing but the threading token.
 *
 * @param {string} [subject] - Edited subject at submit time.
 * @returns {string} e.g. "Dikirim via email: Review material".
 */
export function deriveReworkEmailReason(subject) {
  // Whitespace is collapsed because dropping a token from the middle of a
  // subject would otherwise leave a double space behind.
  const cleanedSubject = asText(subject)
    .replace(SUBJECT_REQUEST_TOKEN_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${REWORK_EMAIL_REASON_PREFIX}${cleanedSubject}`
    .slice(0, REWORK_REASON_MAX_LENGTH)
    .trim();
}

function buildReworkEmailPath(requestKind, requestId, suffix) {
  const id = asText(requestId);
  if (id === "") {
    return "";
  }

  const segment =
    asText(requestKind).toUpperCase() === REWORK_EMAIL_KIND_MASS ? "mass" : "single";
  return `/material/requests/${segment}/${encodeURIComponent(id)}/${suffix}`;
}

function normalizeReworkEmailReplies(replies) {
  if (!Array.isArray(replies)) {
    return [];
  }

  return replies
    .filter(reply => reply && typeof reply === "object")
    .map(reply => ({
      fromEmail: asText(reply.fromEmail ?? reply.from_email),
      // Absent means "not checked yet", which reads the same as a mismatch —
      // the warning chip is the safe default for anything but an explicit true.
      senderMatches: (reply.senderMatches ?? reply.sender_matches) === true,
      receivedAt: reply.receivedAt ?? reply.received_at ?? null,
      bodyText: asText(reply.bodyText ?? reply.body_text),
    }));
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

function isEmailChannel(notifyVia) {
  return String(notifyVia ?? "").trim().toUpperCase() === "EMAIL";
}

function asText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
