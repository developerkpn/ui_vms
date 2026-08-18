import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const helperPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "attachmentValidation.js"
);
const helper = await import(
  `data:text/javascript;base64,${fs.readFileSync(helperPath).toString("base64")}`
);

const {
  MAX_ATTACHMENT_SIZE_MB,
  MAX_ATTACHMENTS,
  MIN_ATTACHMENTS,
  getAttachmentValidationError,
  isAllowedAttachmentFile,
  normalizeAttachmentSelection,
} = helper;

const MB = 1024 * 1024;

function makeFile(name, sizeBytes) {
  return { name, size: sizeBytes };
}

test("isAllowedAttachmentFile accepts supported extensions", () => {
  assert.equal(isAllowedAttachmentFile(makeFile("spec.pdf", 100)), true);
  assert.equal(isAllowedAttachmentFile(makeFile("photo.JPG", 100)), true);
  assert.equal(isAllowedAttachmentFile(makeFile("notes.txt", 100)), false);
});

test("normalizeAttachmentSelection rejects unsupported formats", () => {
  const existing = [makeFile("keep.pdf", 100)];
  const result = normalizeAttachmentSelection([makeFile("bad.exe", 100)], existing);

  assert.deepEqual(result.files, existing);
  assert.match(result.error, /Format file tidak didukung/);
});

test("normalizeAttachmentSelection rejects files larger than 5MB", () => {
  const existing = [makeFile("keep.pdf", 100)];
  const oversized = makeFile("large.pdf", MAX_ATTACHMENT_SIZE_MB * MB + 1);
  const result = normalizeAttachmentSelection([oversized], existing);

  assert.deepEqual(result.files, existing);
  assert.equal(result.error, "Ukuran file maksimal 5MB.");
});

test("normalizeAttachmentSelection accepts files at the size limit", () => {
  const atLimit = makeFile("limit.pdf", MAX_ATTACHMENT_SIZE_MB * MB);
  const result = normalizeAttachmentSelection([atLimit], []);

  assert.equal(result.files.length, 1);
  assert.equal(result.error, "");
});

test("normalizeAttachmentSelection enforces the max attachment count", () => {
  const existing = [
    makeFile("a.pdf", 100),
    makeFile("b.pdf", 100),
    makeFile("c.pdf", 100),
  ];
  const result = normalizeAttachmentSelection([makeFile("d.pdf", 100)], existing);

  assert.equal(result.files.length, MAX_ATTACHMENTS);
  assert.match(result.error, /Maksimal 3 attachment/);
});

test("normalizeAttachmentSelection accepts adding after a removal frees a slot", () => {
  const atLimit = [makeFile("a.pdf", 100), makeFile("b.pdf", 100), makeFile("c.pdf", 100)];
  const afterRemoval = atLimit.slice(1); // simulates removing "a.pdf"
  const result = normalizeAttachmentSelection([makeFile("d.pdf", 100)], afterRemoval);

  assert.equal(result.files.length, MAX_ATTACHMENTS);
  assert.equal(result.error, "");
});

test("normalizeAttachmentSelection composes removals and additions into the expected resulting set", () => {
  const existing = [makeFile("a.pdf", 100), makeFile("b.pdf", 100), makeFile("c.pdf", 100)];
  const afterRemovingB = existing.filter(file => file.name !== "b.pdf");
  const result = normalizeAttachmentSelection([makeFile("d.pdf", 100)], afterRemovingB);

  assert.deepEqual(
    result.files.map(file => file.name),
    ["a.pdf", "c.pdf", "d.pdf"]
  );
  assert.equal(result.error, "");
});

test("getAttachmentValidationError still enforces min and max counts on submit", () => {
  assert.match(getAttachmentValidationError([]), /Minimal 1 attachment/);
  assert.match(
    getAttachmentValidationError([
      makeFile("a.pdf", 100),
      makeFile("b.pdf", 100),
      makeFile("c.pdf", 100),
      makeFile("d.pdf", 100),
    ]),
    /Maksimal 3 attachment/
  );
  assert.equal(
    getAttachmentValidationError([
      makeFile("a.pdf", 100),
      makeFile("b.pdf", 100),
    ]),
    ""
  );
  assert.equal(MIN_ATTACHMENTS, 1);
});
