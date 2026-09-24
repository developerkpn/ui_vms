import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_STATUS_NOTE_TONE,
  STATUS_NOTE_KINDS,
  assignmentNoteKind,
  buildStatusNote,
  buildStatusNoteLabel,
  buildStatusNotesLabel,
  compactStatusNotes,
  pickStrongestTone,
} from "./statusNotes.js";

test("empty, blank and missing notes are dropped", () => {
  const notes = compactStatusNotes([
    { text: "Waiting for Master Data", tone: "info" },
    { text: "", tone: "error" },
    { text: "   ", tone: "error" },
    { text: null },
    null,
    undefined,
  ]);

  assert.equal(notes.length, 1);
  assert.equal(notes[0].text, "Waiting for Master Data");
  assert.equal(notes[0].tone, "info");
});

test("text is trimmed and duplicates collapse to one", () => {
  const notes = compactStatusNotes([
    { text: "  Rework mail unanswered  ", tone: "error" },
    { text: "Rework mail unanswered", tone: "info" },
  ]);

  assert.equal(notes.length, 1);
  assert.equal(notes[0].text, "Rework mail unanswered");
  // The first occurrence wins, so the stronger tone it arrived with is kept.
  assert.equal(notes[0].tone, "error");
});

test("an unrecognised tone falls back rather than colouring the marker at random", () => {
  const notes = compactStatusNotes([
    { text: "a", tone: "chartreuse" },
    { text: "b" },
  ]);

  assert.equal(notes[0].tone, DEFAULT_STATUS_NOTE_TONE);
  assert.equal(notes[1].tone, DEFAULT_STATUS_NOTE_TONE);
});

test("a malformed notes list yields nothing instead of throwing", () => {
  assert.deepEqual(compactStatusNotes(undefined), []);
  assert.deepEqual(compactStatusNotes(null), []);
  assert.deepEqual(compactStatusNotes("nope"), []);
});

test("the marker takes the most urgent tone present", () => {
  assert.equal(
    pickStrongestTone([
      { text: "settled", tone: "success" },
      { text: "broken", tone: "error" },
      { text: "owed", tone: "warning" },
    ]),
    "error"
  );

  assert.equal(
    pickStrongestTone([
      { text: "settled", tone: "success" },
      { text: "owed", tone: "warning" },
    ]),
    "warning"
  );

  assert.equal(
    pickStrongestTone([
      { text: "settled", tone: "success" },
      { text: "plain", tone: "info" },
    ]),
    "info"
  );
});

test("a single settled note keeps its own tone rather than being promoted", () => {
  assert.equal(pickStrongestTone([{ text: "Approver replied", tone: "success" }]), "success");
});

test("no notes resolves to the default tone", () => {
  assert.equal(pickStrongestTone([]), DEFAULT_STATUS_NOTE_TONE);
  assert.equal(pickStrongestTone(), DEFAULT_STATUS_NOTE_TONE);
});

test("the accessible label names the kind as well as the wording", () => {
  const label = buildStatusNotesLabel([
    buildStatusNote("APPROVER", "Waiting approval from Ben Pardede"),
    buildStatusNote("EMAIL_ANSWERED", "The approver replied by email"),
  ]);

  assert.equal(
    label,
    "Current approver: Waiting approval from Ben Pardede. " +
      "Rework email: The approver replied by email"
  );
  assert.equal(buildStatusNotesLabel([]), "");
});

test("every note kind carries its own icon and a label saying what it is about", () => {
  for (const [kind, descriptor] of Object.entries(STATUS_NOTE_KINDS)) {
    assert.equal(typeof descriptor.icon, "string", kind);
    assert.notEqual(descriptor.icon, "", kind);
    assert.notEqual(descriptor.label, "", kind);
  }

  // The two email states are one subject seen at two moments, so they share a
  // label but must not share an icon.
  assert.equal(
    STATUS_NOTE_KINDS.EMAIL_WAITING.label,
    STATUS_NOTE_KINDS.EMAIL_ANSWERED.label
  );
  assert.notEqual(
    STATUS_NOTE_KINDS.EMAIL_WAITING.icon,
    STATUS_NOTE_KINDS.EMAIL_ANSWERED.icon
  );
});

test("the approval note and the email note are labelled apart, not both as approval", () => {
  // The complaint this fixes: "Waiting approval from Ben Pardede" sitting next
  // to "Email Approval Confirmed" read as a contradiction.
  const approver = buildStatusNote("APPROVER", "Waiting approval from Ben Pardede");
  const email = buildStatusNote("EMAIL_ANSWERED", "The approver replied by email");

  assert.notEqual(approver.label, email.label);
  assert.notEqual(approver.icon, email.icon);
  assert.equal(buildStatusNoteLabel(approver).startsWith("Current approver:"), true);
  assert.equal(buildStatusNoteLabel(email).startsWith("Rework email:"), true);
});

test("a note with no text is nothing at all, so callers can push unconditionally", () => {
  assert.equal(buildStatusNote("APPROVER", ""), null);
  assert.equal(buildStatusNote("APPROVER", "   "), null);
  assert.equal(buildStatusNote("APPROVER", null), null);
  assert.equal(buildStatusNote("NOT_A_KIND", "text"), null);
});

test("assignment caption kinds map onto note kinds", () => {
  assert.equal(assignmentNoteKind("GRAB"), "PICKUP");
  assert.equal(assignmentNoteKind("UNASSIGNED"), "UNASSIGNED");
  assert.equal(assignmentNoteKind("APPROVAL"), "APPROVER");
  assert.equal(assignmentNoteKind(undefined), "APPROVER");
});
