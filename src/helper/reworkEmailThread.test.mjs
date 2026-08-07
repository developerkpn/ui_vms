import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The helper is an ES module inside a package that defaults to CommonJS, so a
// plain import of the .js path would be parsed as CJS and blow up on `export`.
// The module has no imports of its own, so loading its source through a data:
// URL gives the real exports without a bundler.
const helperPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "reworkEmailThread.js"
);
const helper = await import(
  `data:text/javascript;base64,${fs.readFileSync(helperPath).toString("base64")}`
);

const {
  buildEmailReplyCaption,
  buildReworkEmailPayload,
  buildReworkEmailSentMessage,
  buildReworkEmailTemplatePath,
  buildReworkEmailThreadPath,
  deriveReworkEmailReason,
  hasReworkEmailContentError,
  isReworkEmailOnlyResult,
  isReworkEmailSendFailed,
  normalizeEmailReplyCount,
  normalizeReworkEmailTemplate,
  normalizeReworkEmailThread,
  resolveReworkEmailKind,
  validateReworkEmailContent,
  REWORK_EMAIL_KIND_MASS,
  REWORK_EMAIL_KIND_SINGLE,
  REWORK_EMAIL_NOTICE,
  REWORK_EMAIL_REASON_NOTICE,
  REWORK_EMAIL_REASON_PREFIX,
  REWORK_EMAIL_REPLY_RECEIVED_TEXT,
  REWORK_EMAIL_SENDER_ADDRESS,
} = helper;

test("the request kind follows the row the dialog opened", () => {
  assert.equal(resolveReworkEmailKind(true), REWORK_EMAIL_KIND_MASS);
  assert.equal(resolveReworkEmailKind(false), REWORK_EMAIL_KIND_SINGLE);
  assert.equal(resolveReworkEmailKind(undefined), REWORK_EMAIL_KIND_SINGLE);
});

test("endpoint paths pick the segment matching the request kind", () => {
  assert.equal(
    buildReworkEmailTemplatePath({ requestKind: REWORK_EMAIL_KIND_SINGLE, requestId: 42 }),
    "/material/requests/single/42/rework-email-template"
  );
  assert.equal(
    buildReworkEmailTemplatePath({ requestKind: REWORK_EMAIL_KIND_MASS, requestId: 7 }),
    "/material/requests/mass/7/rework-email-template"
  );
  assert.equal(
    buildReworkEmailThreadPath({ requestKind: REWORK_EMAIL_KIND_MASS, requestId: 7 }),
    "/material/requests/mass/7/rework-email-thread"
  );
  // Anything that is not MASS is a single request, so a missing or misspelled
  // kind still points at a real endpoint rather than a 404.
  assert.equal(
    buildReworkEmailThreadPath({ requestId: 9 }),
    "/material/requests/single/9/rework-email-thread"
  );
});

test("a request with no id yields no path, so nothing is fetched", () => {
  assert.equal(buildReworkEmailTemplatePath(), "");
  assert.equal(buildReworkEmailTemplatePath({ requestKind: REWORK_EMAIL_KIND_SINGLE }), "");
  assert.equal(buildReworkEmailThreadPath({ requestId: null }), "");
  assert.equal(buildReworkEmailThreadPath({ requestId: "   " }), "");
});

test("path ids are encoded, so an odd id cannot escape the route", () => {
  assert.equal(
    buildReworkEmailTemplatePath({ requestId: "a/b" }),
    "/material/requests/single/a%2Fb/rework-email-template"
  );
});

test("the draft is read through the response, the envelope, or bare", () => {
  const expected = { subject: "Rework [VMS#REQ-1]", body: "Kepada Yth. Approver," };

  assert.deepEqual(
    normalizeReworkEmailTemplate({ data: { success: true, data: expected } }),
    expected
  );
  assert.deepEqual(normalizeReworkEmailTemplate({ success: true, data: expected }), expected);
  assert.deepEqual(normalizeReworkEmailTemplate(expected), expected);
});

test("an unusable draft response becomes two empty fields, not a crash", () => {
  const blank = { subject: "", body: "" };

  assert.deepEqual(normalizeReworkEmailTemplate(undefined), blank);
  assert.deepEqual(normalizeReworkEmailTemplate(null), blank);
  assert.deepEqual(normalizeReworkEmailTemplate({ data: { data: null } }), blank);
  assert.deepEqual(normalizeReworkEmailTemplate({ subject: 12 }), { subject: "12", body: "" });
});

test("thread rows are read in either camelCase or the raw column names", () => {
  const rows = normalizeReworkEmailThread({
    data: {
      success: true,
      data: [
        {
          id: 5,
          subject: "Review material [VMS#REQ-9]",
          body: "Kepada Yth. Approver,",
          toEmail: "budi@kpn.co.id",
          sendStatus: "sent",
          sentAt: "2026-08-07T03:00:00.000Z",
          replies: [
            {
              fromEmail: "budi@kpn.co.id",
              senderMatches: true,
              receivedAt: "2026-08-07T04:00:00.000Z",
              bodyText: "Sudah saya review, mohon dilanjutkan.",
            },
          ],
        },
        {
          id: 4,
          subject: "Review material [VMS#REQ-9]",
          body: "Draft lama",
          to_email: "citra@kpn.co.id",
          send_status: "FAILED",
          send_error: "550 mailbox unavailable",
          sent_at: "2026-08-06T03:00:00.000Z",
          replies: [],
        },
      ],
    },
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, "5");
  assert.equal(rows[0].toEmail, "budi@kpn.co.id");
  // Case is normalized so the chip only ever has to match SENT / FAILED.
  assert.equal(rows[0].sendStatus, "SENT");
  assert.equal(rows[0].replies[0].senderMatches, true);
  assert.equal(rows[1].toEmail, "citra@kpn.co.id");
  assert.equal(rows[1].sendStatus, "FAILED");
  assert.equal(rows[1].sendError, "550 mailbox unavailable");
  assert.deepEqual(rows[1].replies, []);
});

test("a reply is only trusted when the backend explicitly says the sender matched", () => {
  const [row] = normalizeReworkEmailThread([
    {
      id: 1,
      replies: [
        { from_email: "budi@kpn.co.id", sender_matches: true, body_text: "ok" },
        { from_email: "asisten@kpn.co.id", sender_matches: false, body_text: "ok" },
        // No flag at all — an older row, or a shape the backend never wrote.
        // The warning chip is the safe reading of "not checked".
        { from_email: "entah@kpn.co.id", body_text: "ok" },
        { from_email: "entah@kpn.co.id", sender_matches: "true", body_text: "ok" },
      ],
    },
  ]);

  assert.deepEqual(
    row.replies.map(reply => reply.senderMatches),
    [true, false, false, false]
  );
});

test("a thread that is not a list of rows renders as no section", () => {
  assert.deepEqual(normalizeReworkEmailThread(undefined), []);
  assert.deepEqual(normalizeReworkEmailThread({ data: { data: null } }), []);
  assert.deepEqual(normalizeReworkEmailThread({ data: { data: "nope" } }), []);
  // Junk entries are dropped rather than rendered as empty cards.
  assert.deepEqual(normalizeReworkEmailThread([null, 3, "x"]), []);
});

test("rows missing an id still get a stable React key", () => {
  const rows = normalizeReworkEmailThread([{ subject: "a" }, { subject: "b" }]);

  assert.equal(rows[0].id, "rework-email-0");
  assert.equal(rows[1].id, "rework-email-1");
});

test("only the EMAIL channel has a draft to validate", () => {
  const blank = { subject: "", body: "" };

  assert.deepEqual(validateReworkEmailContent({ notifyVia: "APP" }), blank);
  assert.deepEqual(validateReworkEmailContent({ notifyVia: "APP", subject: "", body: "" }), blank);
  assert.deepEqual(validateReworkEmailContent(), blank);
});

test("the EMAIL channel requires both fields, whitespace not counting as content", () => {
  const bothBlank = validateReworkEmailContent({ notifyVia: "EMAIL", subject: "", body: "" });
  assert.ok(bothBlank.subject);
  assert.ok(bothBlank.body);
  assert.equal(hasReworkEmailContentError(bothBlank), true);

  const whitespace = validateReworkEmailContent({
    notifyVia: "EMAIL",
    subject: "   ",
    body: "\n\t ",
  });
  assert.equal(hasReworkEmailContentError(whitespace), true);

  const subjectOnly = validateReworkEmailContent({
    notifyVia: "EMAIL",
    subject: "Review material [VMS#REQ-9]",
    body: "",
  });
  assert.equal(subjectOnly.subject, "");
  assert.ok(subjectOnly.body);
  assert.equal(hasReworkEmailContentError(subjectOnly), true);

  const filled = validateReworkEmailContent({
    notifyVia: "EMAIL",
    subject: "Review material [VMS#REQ-9]",
    body: "Kepada Yth. Approver,",
  });
  assert.deepEqual(filled, { subject: "", body: "" });
  assert.equal(hasReworkEmailContentError(filled), false);
});

test("the channel is matched case- and padding-insensitively", () => {
  assert.equal(
    hasReworkEmailContentError(
      validateReworkEmailContent({ notifyVia: " email ", subject: "", body: "" })
    ),
    true
  );
});

test("hasReworkEmailContentError tolerates a missing error object", () => {
  assert.equal(hasReworkEmailContentError(), false);
  assert.equal(hasReworkEmailContentError(undefined), false);
  assert.equal(hasReworkEmailContentError({}), false);
});

test("the APP channel contributes nothing to the rework payload", () => {
  assert.deepEqual(
    buildReworkEmailPayload({ notifyVia: "APP", subject: "s", body: "b" }),
    {}
  );
  assert.deepEqual(buildReworkEmailPayload(), {});
});

test("the EMAIL channel sends the draft byte-for-byte, untrimmed", () => {
  const body = "Kepada Yth. Approver,\n\n  1. Item satu\n\nTerima kasih.\n";

  assert.deepEqual(
    buildReworkEmailPayload({ notifyVia: "EMAIL", subject: " Review [VMS#REQ-9] ", body }),
    { emailSubject: " Review [VMS#REQ-9] ", emailBody: body }
  );
});

test("a missing draft still travels as a pair of strings, so the endpoint 400s rather than half-sending", () => {
  assert.deepEqual(buildReworkEmailPayload({ notifyVia: "EMAIL" }), {
    emailSubject: "",
    emailBody: "",
  });
});

test("the caption names the mailbox replies come back to, and spells out the consequence", () => {
  assert.ok(REWORK_EMAIL_NOTICE.includes(REWORK_EMAIL_SENDER_ADDRESS));
  assert.ok(REWORK_EMAIL_NOTICE.includes("balasan approver akan muncul di detail request"));
  // The surprising half: this channel reassigns nothing.
  assert.ok(
    REWORK_EMAIL_NOTICE.includes(
      "Request tetap di Master Data - email hanya untuk korespondensi."
    )
  );
});

test("the success snackbar names the recipient and says the request did not move", () => {
  assert.equal(
    buildReworkEmailSentMessage("budi@kpn-corp.com"),
    "Email terkirim ke budi@kpn-corp.com. Request tetap di Master Data."
  );
  // A padded address is still an address.
  assert.equal(
    buildReworkEmailSentMessage("  budi@kpn-corp.com  "),
    "Email terkirim ke budi@kpn-corp.com. Request tetap di Master Data."
  );
});

test("without an address to hand the snackbar falls back to the generic line", () => {
  for (const missing of ["", "   ", null, undefined]) {
    assert.equal(
      buildReworkEmailSentMessage(missing),
      "Email terkirim. Request tetap di Master Data.",
      `expected ${JSON.stringify(missing)} to fall back`
    );
  }
});

test("emailOnly is read through every envelope, and only an explicit true counts", () => {
  // Full axios response, {success, data} envelope, and the bare payload.
  assert.equal(
    isReworkEmailOnlyResult({ data: { success: true, data: { emailOnly: true } } }),
    true
  );
  assert.equal(isReworkEmailOnlyResult({ success: true, data: { emailOnly: true } }), true);
  assert.equal(isReworkEmailOnlyResult({ emailOnly: true }), true);

  // The reassigning path, and an older backend that sends no flag at all.
  assert.equal(
    isReworkEmailOnlyResult({ data: { data: { status: "Submit", assigned_to: "Approval 1" } } }),
    false
  );
  for (const absent of [{ emailOnly: false }, { emailOnly: "true" }, {}, null, undefined]) {
    assert.equal(
      isReworkEmailOnlyResult(absent),
      false,
      `expected ${JSON.stringify(absent)} to read as a normal rework`
    );
  }
});

test("a failed send is only ever the explicit emailOnly + sent:false pair", () => {
  // The one true failure shape, through every envelope.
  assert.equal(
    isReworkEmailSendFailed({
      data: { success: true, data: { emailOnly: true, notify: { sent: false } } },
    }),
    true
  );
  assert.equal(
    isReworkEmailSendFailed({ emailOnly: true, notify: { sent: false } }),
    true
  );

  // A sent mail, a reassigning rework, and shapes with no notify at all.
  for (const notFailed of [
    { emailOnly: true, notify: { sent: true } },
    { emailOnly: false, notify: { sent: false } },
    { emailOnly: true },
    {},
    null,
    undefined,
  ]) {
    assert.equal(
      isReworkEmailSendFailed(notFailed),
      false,
      `expected ${JSON.stringify(notFailed)} not to read as a send failure`
    );
  }

  // The warning copy still tells the user the request did not move.
  assert.match(helper.REWORK_EMAIL_SEND_FAILED_MESSAGE, /GAGAL terkirim/);
  assert.match(helper.REWORK_EMAIL_SEND_FAILED_MESSAGE, /Request tetap di Master Data\./);
});

test("the derived reason drops the threading token the subject was stamped with", () => {
  assert.equal(
    deriveReworkEmailReason("Review material [VMS#REQ-9]"),
    "Dikirim via email: Review material"
  );
  // Mid-subject token: the space it leaves behind is collapsed, not doubled.
  assert.equal(
    deriveReworkEmailReason("Review [VMS#REQ-9] material"),
    "Dikirim via email: Review material"
  );
  // More than one token, and one carrying a mass batch id.
  assert.equal(
    deriveReworkEmailReason("[VMS#REQ-9] Review material [VMS#MASS-3]"),
    "Dikirim via email: Review material"
  );
});

test("a plain subject travels as-is behind the prefix", () => {
  assert.equal(
    deriveReworkEmailReason("Mohon dilengkapi spesifikasi"),
    "Dikirim via email: Mohon dilengkapi spesifikasi"
  );
});

test("the derived reason is trimmed, and never blank even without a subject left", () => {
  assert.equal(
    deriveReworkEmailReason("   Review material   "),
    "Dikirim via email: Review material"
  );
  // Nothing but a token, or nothing at all: the prefix alone still reads as a
  // reason, so the endpoint's required-reason check can never trip.
  assert.equal(deriveReworkEmailReason("[VMS#REQ-9]"), "Dikirim via email:");
  assert.equal(deriveReworkEmailReason("   "), "Dikirim via email:");
  assert.equal(deriveReworkEmailReason(), "Dikirim via email:");
  assert.equal(deriveReworkEmailReason(null), "Dikirim via email:");
});

test("the derived reason is capped at the column the backend stores it in", () => {
  const reason = deriveReworkEmailReason(`Review ${"a".repeat(400)}`);

  assert.equal(reason.length, 250);
  assert.ok(reason.startsWith(REWORK_EMAIL_REASON_PREFIX));
  // The cap is applied after the prefix, so the whole stored value fits.
  assert.equal(reason, `${REWORK_EMAIL_REASON_PREFIX}Review ${"a".repeat(400)}`.slice(0, 250));
});

test("a cap landing on a space does not leave the reason ending in one", () => {
  // The prefix is 19 chars, so the 250th character is exactly the space before
  // the last word — the cut has to take it with it.
  const reason = deriveReworkEmailReason(`${"a".repeat(230)} berikutnya`);

  assert.equal(reason, `${REWORK_EMAIL_REASON_PREFIX}${"a".repeat(230)}`.trim());
  assert.equal(reason.length, 249);
});

test("the notice tells Master Data where the reason came from", () => {
  assert.ok(REWORK_EMAIL_REASON_NOTICE.includes("subjek email"));
});

// ---------------------------------------------------------------------------
// Reply indicator under the Status chip (email_reply_count on the list rows).
// ---------------------------------------------------------------------------

test("a request with no replies renders no indicator at all", () => {
  // "" is the signal the status cell checks: anything falsy means the row looks
  // exactly as it did before the indicator existed.
  assert.equal(buildEmailReplyCaption(0), "");
  assert.equal(buildEmailReplyCaption(undefined), "");
  assert.equal(buildEmailReplyCaption(null), "");
  assert.equal(buildEmailReplyCaption(""), "");
  assert.equal(buildEmailReplyCaption("not a number"), "");
  // A negative count is nonsense the backend cannot produce, but it must not
  // render as a reply either.
  assert.equal(buildEmailReplyCaption(-3), "");
});

test("a single reply says so without spelling out the count", () => {
  assert.equal(buildEmailReplyCaption(1), REWORK_EMAIL_REPLY_RECEIVED_TEXT);
  // pg hands COUNT() back as a string on drivers that do not cast bigint.
  assert.equal(buildEmailReplyCaption("1"), REWORK_EMAIL_REPLY_RECEIVED_TEXT);
});

test("more than one reply carries the count", () => {
  assert.equal(buildEmailReplyCaption(2), `${REWORK_EMAIL_REPLY_RECEIVED_TEXT} (2)`);
  assert.equal(buildEmailReplyCaption("11"), `${REWORK_EMAIL_REPLY_RECEIVED_TEXT} (11)`);
});

test("the count is normalized to a whole number of replies", () => {
  assert.equal(normalizeEmailReplyCount("4"), 4);
  assert.equal(normalizeEmailReplyCount(4.9), 4);
  assert.equal(normalizeEmailReplyCount(0), 0);
  assert.equal(normalizeEmailReplyCount(-1), 0);
  assert.equal(normalizeEmailReplyCount(Infinity), 0);
  assert.equal(normalizeEmailReplyCount(NaN), 0);
  assert.equal(normalizeEmailReplyCount(undefined), 0);
});
