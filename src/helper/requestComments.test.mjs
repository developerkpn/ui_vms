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
  "requestComments.js"
);
const helper = await import(
  `data:text/javascript;base64,${fs.readFileSync(helperPath).toString("base64")}`
);

const {
  buildRequestCommentEventLabel,
  buildRequestCommentsPath,
  buildRequestCommentTitle,
  normalizeRequestComments,
  resolveRequestCommentKind,
  resolveRequesterCommentRequirement,
  validateRequesterComment,
  REQUEST_COMMENT_KIND_MASS,
  REQUEST_COMMENT_KIND_SINGLE,
  REQUESTER_COMMENT_REQUIRED_MESSAGE,
} = helper;

test("resolveRequestCommentKind picks the table the id belongs to", () => {
  assert.equal(resolveRequestCommentKind(true), REQUEST_COMMENT_KIND_MASS);
  assert.equal(resolveRequestCommentKind(false), REQUEST_COMMENT_KIND_SINGLE);
});

test("buildRequestCommentsPath routes by kind and encodes the id", () => {
  assert.equal(
    buildRequestCommentsPath({ requestKind: "SINGLE", requestId: 810 }),
    "/material/requests/single/810/comments"
  );
  assert.equal(
    buildRequestCommentsPath({ requestKind: "mass", requestId: 42 }),
    "/material/requests/mass/42/comments"
  );
  // Anything unrecognised falls to single, the same way the mail-thread path does.
  assert.equal(
    buildRequestCommentsPath({ requestId: "a/b" }),
    "/material/requests/single/a%2Fb/comments"
  );
});

test("buildRequestCommentsPath asks for nothing without an id", () => {
  assert.equal(buildRequestCommentsPath(), "");
  assert.equal(buildRequestCommentsPath({ requestKind: "SINGLE" }), "");
  assert.equal(
    buildRequestCommentsPath({ requestKind: "SINGLE", requestId: "  " }),
    ""
  );
});

test("normalizeRequestComments unwraps a response, an envelope, or a bare array", () => {
  const rows = [
    {
      id: 1,
      event_type: "submit",
      stage: null,
      actor_name: "Siti Rahayu",
      comment: null,
      created_at: "2026-08-10T02:00:00.000Z",
    },
  ];
  const expected = [
    {
      id: "1",
      eventType: "SUBMIT",
      stage: "",
      actorName: "Siti Rahayu",
      comment: null,
      createdAt: "2026-08-10T02:00:00.000Z",
    },
  ];

  assert.deepEqual(normalizeRequestComments(rows), expected);
  assert.deepEqual(normalizeRequestComments({ data: rows }), expected);
  assert.deepEqual(normalizeRequestComments({ data: { data: rows } }), expected);
});

test("normalizeRequestComments keeps 'nothing was said' distinct from text", () => {
  const [blank, whitespace, said] = normalizeRequestComments([
    { id: 1, eventType: "SUBMIT" },
    { id: 2, eventType: "APPROVE", comment: "   " },
    { id: 3, eventType: "REWORK", comment: "  Deskripsi kurang  " },
  ]);

  assert.equal(blank.comment, null);
  assert.equal(whitespace.comment, null);
  assert.equal(said.comment, "Deskripsi kurang");
});

test("normalizeRequestComments survives anything that is not a list of rows", () => {
  assert.deepEqual(normalizeRequestComments(undefined), []);
  assert.deepEqual(normalizeRequestComments({ data: null }), []);
  assert.deepEqual(normalizeRequestComments({ data: { data: "nope" } }), []);
  assert.deepEqual(normalizeRequestComments([null, 7, "x"]), []);
});

test("normalizeRequestComments gives every entry a key even without an id", () => {
  const [first, second] = normalizeRequestComments([
    { eventType: "SUBMIT" },
    { eventType: "APPROVE" },
  ]);

  assert.equal(first.id, "request-comment-0");
  assert.equal(second.id, "request-comment-1");
});

test("buildRequestCommentEventLabel shows an unknown event rather than dropping it", () => {
  assert.equal(
    buildRequestCommentEventLabel({ eventType: "APPROVE" }),
    "Approve"
  );
  assert.equal(
    buildRequestCommentEventLabel({ eventType: "SOMETHING_NEW" }),
    "SOMETHING_NEW"
  );
  assert.equal(buildRequestCommentEventLabel({}), "-");
});

test("buildRequestCommentTitle files an entry under its stage, or its actor", () => {
  assert.equal(
    buildRequestCommentTitle({ stage: "Approval 1", actorName: "Budi" }),
    "Approval 1"
  );
  // Submit and resubmit belong to no stage, so the requester's name leads.
  assert.equal(
    buildRequestCommentTitle({ stage: "", actorName: "Siti Rahayu" }),
    "Siti Rahayu"
  );
  assert.equal(buildRequestCommentTitle({}), "-");
});

test("resolveRequesterCommentRequirement is required only on a resubmit", () => {
  assert.equal(resolveRequesterCommentRequirement(true), "required");
  assert.equal(resolveRequesterCommentRequirement(false), "optional");
  assert.equal(resolveRequesterCommentRequirement(), "optional");
});

test("validateRequesterComment never rejects a new submission, comment or not", () => {
  assert.deepEqual(validateRequesterComment(undefined, { isResubmit: false }), {
    error: false,
    message: "",
  });
  assert.deepEqual(validateRequesterComment("   ", { isResubmit: false }), {
    error: false,
    message: "",
  });
  assert.deepEqual(validateRequesterComment("Butuh stok tambahan", { isResubmit: false }), {
    error: false,
    message: "",
  });
});

test("validateRequesterComment rejects empty and whitespace-only on a resubmit", () => {
  assert.equal(validateRequesterComment(undefined, { isResubmit: true }).error, true);
  assert.equal(validateRequesterComment("", { isResubmit: true }).error, true);
  assert.equal(
    validateRequesterComment("   ", { isResubmit: true }).message,
    REQUESTER_COMMENT_REQUIRED_MESSAGE
  );
});

test("validateRequesterComment accepts real text on a resubmit", () => {
  assert.deepEqual(
    validateRequesterComment("  Sudah saya perbaiki UoM-nya  ", { isResubmit: true }),
    { error: false, message: "" }
  );
});
