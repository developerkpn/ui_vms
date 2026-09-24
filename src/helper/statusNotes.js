// Notes that used to be stacked underneath a status badge: who the request is
// waiting on, a SAP write-back error, and whether a mailed rework has been
// answered.
//
// Rendering them as extra lines made every affected row two or three times
// taller than its neighbours, which is expensive in a ten-column table. Each is
// now a small icon beside the badge, picked to say what kind of note it is, with
// the wording on hover.
//
// Each note also carries a label. Two notes about "approval" sitting side by
// side read as a contradiction — a request can be waiting on its current
// approver while an earlier rework email has already been answered — so the
// label names which of the two things the note is about.

// Strongest first. The kinds below map onto these; where several notes share a
// row, the ordering decides nothing visually (each keeps its own icon) but is
// still the tie-break for any caller that wants one overall tone.
export const STATUS_NOTE_TONE_ORDER = ["error", "warning", "info", "success"];

export const DEFAULT_STATUS_NOTE_TONE = "info";

/**
 * The kinds of note a status cell can carry.
 *
 * `icon` is a key the presentation layer maps to a real icon, kept as a string
 * so this module stays free of components and testable on its own.
 */
export const STATUS_NOTE_KINDS = {
  APPROVER: { label: "Current approver", tone: "info", icon: "approver" },
  PICKUP: { label: "Master Data", tone: "warning", icon: "pickup" },
  UNASSIGNED: { label: "Approver", tone: "warning", icon: "unassigned" },
  EMAIL_WAITING: { label: "Rework email", tone: "error", icon: "emailWaiting" },
  EMAIL_ANSWERED: { label: "Rework email", tone: "success", icon: "emailAnswered" },
  SAP_ERROR: { label: "SAP error", tone: "error", icon: "sapError" },
};

/**
 * Build one note. Returns null when there is nothing to say, so callers can push
 * unconditionally and let compactStatusNotes drop the blanks.
 */
export function buildStatusNote(kind, text) {
  const descriptor = STATUS_NOTE_KINDS[kind];
  const body = String(text ?? "").trim();

  if (!descriptor || body === "") {
    return null;
  }

  return { kind, text: body, ...descriptor };
}

/**
 * The note kind for an assignment caption, whose own kinds predate this module.
 */
export function assignmentNoteKind(captionKind) {
  if (captionKind === "GRAB") {
    return "PICKUP";
  }
  if (captionKind === "UNASSIGNED") {
    return "UNASSIGNED";
  }
  return "APPROVER";
}

/**
 * Drop the empties, trim what is left, and collapse duplicates.
 *
 * Callers assemble notes from independent sources that do not know about each
 * other, so an absent caption arrives as "" or null rather than being omitted.
 */
export function compactStatusNotes(notes = []) {
  if (!Array.isArray(notes)) {
    return [];
  }

  const seen = new Set();
  const compacted = [];

  for (const note of notes) {
    const text = String(note?.text ?? "").trim();
    if (text === "" || seen.has(text)) {
      continue;
    }

    seen.add(text);
    compacted.push({
      text,
      label: String(note?.label ?? "").trim(),
      icon: note?.icon || "info",
      tone: STATUS_NOTE_TONE_ORDER.includes(note?.tone)
        ? note.tone
        : DEFAULT_STATUS_NOTE_TONE,
    });
  }

  return compacted;
}

export function pickStrongestTone(notes = []) {
  const compacted = compactStatusNotes(notes);

  for (const tone of STATUS_NOTE_TONE_ORDER) {
    if (compacted.some(note => note.tone === tone)) {
      return tone;
    }
  }

  return DEFAULT_STATUS_NOTE_TONE;
}

/**
 * One flat string for an icon's accessible name, since a tooltip alone is not
 * announced to a screen reader. The label is included because it is what makes
 * the wording unambiguous.
 */
export function buildStatusNoteLabel(note) {
  const compacted = compactStatusNotes([note]);
  if (compacted.length === 0) {
    return "";
  }

  const { label, text } = compacted[0];
  return label ? `${label}: ${text}` : text;
}

export function buildStatusNotesLabel(notes = []) {
  return compactStatusNotes(notes)
    .map(note => buildStatusNoteLabel(note))
    .join(". ");
}
