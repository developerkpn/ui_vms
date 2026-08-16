import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRequestFormData,
  buildMassRequestFormData,
} from "./approvalRequestPayload.js";

// The assertions below care about which item a file was paired with, not its
// bytes, so a one-character file is enough.
const fakeFile = name => new File(["x"], name, { type: "application/pdf" });

test("buildRequestFormData sends a string field unchanged and JSON-encodes the rest", () => {
  const form = buildRequestFormData(
    { remark: "sudah dicek", finalCodeSuffixes: { 1: "001" } },
    { keepAttachmentIds: [1], files: [] }
  );

  assert.equal(form.get("remark"), "sudah dicek");
  assert.equal(form.get("finalCodeSuffixes"), JSON.stringify({ 1: "001" }));
});

test("buildRequestFormData omits an undefined field", () => {
  const form = buildRequestFormData(
    { reworkToLevel: undefined, keep: "yes" },
    { keepAttachmentIds: [], files: [] }
  );

  assert.equal(form.has("reworkToLevel"), false);
  assert.equal(form.get("keep"), "yes");
});

test("buildRequestFormData sends the keep set under the name the server reads", () => {
  const form = buildRequestFormData(
    {},
    { keepAttachmentIds: [3, 4], files: [] }
  );

  assert.deepEqual(JSON.parse(form.get("attachments")), {
    keepAttachmentIds: [3, 4],
  });
});

test("buildMassRequestFormData pairs each file with its item, positionally", () => {
  const form = buildMassRequestFormData({ remark: "ok" }, [
    { id: 601, keepAttachmentIds: [], files: [fakeFile("a.pdf")] },
    {
      id: 602,
      keepAttachmentIds: [7],
      files: [fakeFile("b.pdf"), fakeFile("c.pdf")],
    },
  ]);

  // One fileItemId per file, in the same order the files were appended, which
  // is how the server maps files[i] to the item it lands on.
  assert.deepEqual(form.getAll("fileItemId"), ["601", "602", "602"]);
  assert.equal(form.getAll("files").length, 3);
});

test("buildMassRequestFormData sends per-item keep sets under the name the server reads", () => {
  const form = buildMassRequestFormData({}, [
    { id: 601, keepAttachmentIds: [11], files: [] },
    { id: 602, keepAttachmentIds: [], files: [] },
  ]);

  assert.deepEqual(JSON.parse(form.get("itemAttachments")), [
    { id: 601, keepAttachmentIds: [11] },
    { id: 602, keepAttachmentIds: [] },
  ]);
});

test("buildMassRequestFormData still sends an empty item list rather than omitting it", () => {
  const form = buildMassRequestFormData({ remark: "ok" }, []);

  assert.equal(form.get("itemAttachments"), "[]");
  assert.equal(form.getAll("fileItemId").length, 0);
});
