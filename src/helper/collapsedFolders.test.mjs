import test from "node:test";
import assert from "node:assert/strict";

import {
  collapseAllFolders,
  isFolderCollapsed,
  normalizeFolderId,
  parseCollapsedFolders,
  serializeCollapsedFolders,
  toggleCollapsedFolder,
} from "./collapsedFolders.js";

test("a folder id is the same key whether it arrives as a number or a string", () => {
  // The API sends numbers; storage hands them back as strings. Both have to hit
  // the same entry or a folder reopens itself on reload.
  const collapsed = toggleCollapsedFolder(new Set(), 7);

  assert.equal(isFolderCollapsed(collapsed, 7), true);
  assert.equal(isFolderCollapsed(collapsed, "7"), true);
  assert.equal(normalizeFolderId(7), "7");
  assert.equal(normalizeFolderId("  7 "), "7");
});

test("toggling folds a folder away and toggling again brings it back", () => {
  const once = toggleCollapsedFolder(new Set(), "folder-3");
  const twice = toggleCollapsedFolder(once, "folder-3");

  assert.equal(isFolderCollapsed(once, "folder-3"), true);
  assert.equal(isFolderCollapsed(twice, "folder-3"), false);
});

test("toggling returns a new set, so React sees the change", () => {
  const before = new Set(["1"]);
  const after = toggleCollapsedFolder(before, "2");

  assert.notEqual(before, after);
  assert.equal(before.has("2"), false);
  assert.equal(after.has("2"), true);
});

test("folders are independent of one another", () => {
  let collapsed = toggleCollapsedFolder(new Set(), "a");
  collapsed = toggleCollapsedFolder(collapsed, "b");
  collapsed = toggleCollapsedFolder(collapsed, "a");

  assert.equal(isFolderCollapsed(collapsed, "a"), false);
  assert.equal(isFolderCollapsed(collapsed, "b"), true);
});

test("an id that is empty or missing toggles nothing", () => {
  assert.deepEqual([...toggleCollapsedFolder(new Set(), "")], []);
  assert.deepEqual([...toggleCollapsedFolder(new Set(), null)], []);
  assert.deepEqual([...toggleCollapsedFolder(new Set(), "   ")], []);
});

test("a stored value round-trips", () => {
  const collapsed = collapseAllFolders([1, 2, "folder-3"]);
  const restored = parseCollapsedFolders(serializeCollapsedFolders(collapsed));

  assert.deepEqual([...restored].sort(), ["1", "2", "folder-3"]);
});

test("nothing stored means nothing collapsed, so folders open by default", () => {
  assert.deepEqual([...parseCollapsedFolders(null)], []);
  assert.deepEqual([...parseCollapsedFolders(undefined)], []);
  assert.deepEqual([...parseCollapsedFolders("")], []);
  assert.deepEqual([...parseCollapsedFolders("   ")], []);
});

test("a corrupt or foreign stored value opens everything rather than throwing", () => {
  // A hand-edited entry, or one written by an older build with a different
  // shape. Losing the collapse state is fine; failing to render is not.
  for (const stored of ["not json", "{}", '"a string"', "42", "[1,2"]) {
    assert.deepEqual([...parseCollapsedFolders(stored)], [], stored);
  }
});

test("blank entries inside a stored list are dropped", () => {
  assert.deepEqual([...parseCollapsedFolders('["1","","  ",null,"2"]')], ["1", "2"]);
});

test("membership on a non-set is false rather than an error", () => {
  assert.equal(isFolderCollapsed(undefined, "1"), false);
  assert.equal(isFolderCollapsed(null, "1"), false);
  assert.equal(isFolderCollapsed(["1"], "1"), false);
});

test("collapsing every folder tolerates a missing or malformed list", () => {
  assert.deepEqual([...collapseAllFolders()], []);
  assert.deepEqual([...collapseAllFolders(null)], []);
  assert.deepEqual([...collapseAllFolders(["a", "", null, "b"])], ["a", "b"]);
});

test("serializing anything that is not a set yields an empty list", () => {
  assert.equal(serializeCollapsedFolders(undefined), "[]");
  assert.equal(serializeCollapsedFolders(["1"]), "[]");
});
