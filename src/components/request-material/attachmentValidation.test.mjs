import test from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  MAX_ATTACHMENTS,
  MIN_ATTACHMENTS,
  getAttachmentValidationError,
  normalizeAttachmentSelection,
} from "./attachmentValidation.mjs";

const createFile = name => ({
  name,
  size: 1024,
  type: "",
});

test("allows document formats including doc and docx", () => {
  const result = normalizeAttachmentSelection([
    createFile("spec.doc"),
    createFile("drawing.docx"),
    createFile("photo.jpg"),
  ]);

  assert.deepEqual(
    result.files.map(file => file.name),
    ["spec.doc", "drawing.docx", "photo.jpg"]
  );
  assert.equal(result.error, "");
  assert.deepEqual(ALLOWED_ATTACHMENT_EXTENSIONS, ["pdf", "doc", "docx", "png", "jpg", "jpeg"]);
});

test("rejects unsupported file extensions", () => {
  const result = normalizeAttachmentSelection([createFile("malware.exe")]);

  assert.equal(
    result.error,
    "Format file tidak didukung. Gunakan PDF, DOC, DOCX, PNG, JPG, atau JPEG."
  );
  assert.equal(result.files.length, 0);
});

test("keeps only first three files when selection exceeds maximum", () => {
  const result = normalizeAttachmentSelection([
    createFile("1.pdf"),
    createFile("2.doc"),
    createFile("3.docx"),
    createFile("4.jpg"),
  ]);

  assert.equal(MAX_ATTACHMENTS, 3);
  assert.deepEqual(
    result.files.map(file => file.name),
    ["1.pdf", "2.doc", "3.docx"]
  );
  assert.equal(result.error, "Maksimal 3 attachment.");
});

test("requires at least one attachment before save", () => {
  assert.equal(MIN_ATTACHMENTS, 1);
  assert.equal(getAttachmentValidationError([]), "Minimal 1 attachment.");
  assert.equal(getAttachmentValidationError([createFile("evidence.pdf")]), "");
});
