// Which guide folders a viewer has collapsed.
//
// Kept as a set of ids and stored per viewer, because it is a display
// convenience rather than shared state: one person folding away a folder they
// are not working in should not fold it for anyone else.
//
// Ids arrive from the API as numbers and come back out of storage as strings, so
// everything here normalises to strings and the membership test accepts either.

export function normalizeFolderId(folderId) {
  return String(folderId ?? "").trim();
}

/**
 * Read a stored value back into a set, tolerating anything that is not the
 * array of ids we wrote: a hand-edited entry, a value from an older build, or a
 * storage read that returned something unexpected.
 */
export function parseCollapsedFolders(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return new Set();
  }

  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch (error) {
    return new Set();
  }

  if (!Array.isArray(parsed)) {
    return new Set();
  }

  return new Set(
    parsed.map(normalizeFolderId).filter(folderId => folderId !== "")
  );
}

export function serializeCollapsedFolders(collapsed) {
  const ids = collapsed instanceof Set ? [...collapsed] : [];
  return JSON.stringify(ids);
}

export function isFolderCollapsed(collapsed, folderId) {
  if (!(collapsed instanceof Set)) {
    return false;
  }
  return collapsed.has(normalizeFolderId(folderId));
}

/**
 * A new set with the folder flipped. Returns a fresh Set rather than mutating,
 * so React sees a changed reference and re-renders.
 */
export function toggleCollapsedFolder(collapsed, folderId) {
  const id = normalizeFolderId(folderId);
  const next = new Set(collapsed instanceof Set ? collapsed : []);

  if (id === "") {
    return next;
  }

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  return next;
}

export function collapseAllFolders(folderIds = []) {
  return new Set(
    (Array.isArray(folderIds) ? folderIds : [])
      .map(normalizeFolderId)
      .filter(folderId => folderId !== "")
  );
}
