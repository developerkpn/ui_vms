import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Imported rather than taken off the global, which the lint config does not
// declare — the sibling suites never needed it because they base64 the file
// buffer directly, and this one has a rewritten source string to encode.
import { Buffer } from "node:buffer";

const helperDir = path.dirname(fileURLToPath(import.meta.url));

const toDataUrl = source =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

// Loaded through a data: URL for the same reason as the other helper suites —
// the package defaults to CommonJS, so importing the .js path directly gets it
// parsed as CJS and blown up on `export`. This helper differs from the others in
// having one relative import, and a data: URL has no directory to resolve
// "./sapStatus.js" against, so the dependency is inlined as its own data: URL
// first. sapStatus.js imports nothing, so the chain stops there.
const sapStatusUrl = toDataUrl(
  fs.readFileSync(path.resolve(helperDir, "sapStatus.js"), "utf8")
);
const adminApprovalViewSource = fs
  .readFileSync(path.resolve(helperDir, "adminApprovalView.js"), "utf8")
  .replace("./sapStatus.js", () => sapStatusUrl);

const { isMdmMaterialUser, resolveStoredStatusFilter } = await import(
  toDataUrl(adminApprovalViewSource)
);

test("isMdmMaterialUser is true only when the backend flag is exactly true", () => {
  assert.equal(isMdmMaterialUser({ is_mdm_material: true }), true);
});

test("isMdmMaterialUser is false when the backend flag is false", () => {
  assert.equal(isMdmMaterialUser({ is_mdm_material: false }), false);
});

test("isMdmMaterialUser is false when the flag is missing from the session", () => {
  assert.equal(
    isMdmMaterialUser({ role: "MATERIAL", groupid: 12, dept_id: "MDM_MAT" }),
    false
  );
});

test("isMdmMaterialUser is false for an absent or empty session", () => {
  assert.equal(isMdmMaterialUser(), false);
  assert.equal(isMdmMaterialUser({}), false);
  assert.equal(isMdmMaterialUser(null), false);
  assert.equal(isMdmMaterialUser(undefined), false);
});

// The bug this replaced: role is "MATERIAL" for *every* material user, so
// matching role / groupid / dept_id against MDM_MATERIAL / MDM_MAT / MATERIAL
// handed the whole department the Master Data view — the two assignment-scoped
// Status options and the Pickup button — and "Assigned To Me" then filtered on a
// step they had never grabbed, rendering an empty table every time.
test("isMdmMaterialUser no longer infers membership from role, groupid or dept_id", () => {
  for (const session of [
    { role: "MATERIAL" },
    { role: "MDM_MATERIAL" },
    { role: "mdm_material" },
    { groupid: "MDM_MATERIAL" },
    { groupid: "MDM_MAT" },
    { dept_id: "MATERIAL" },
    { dept_id: " MDM_MATERIAL " },
    { role: "MATERIAL", groupid: "MDM_MAT", dept_id: "MDM_MATERIAL" },
  ]) {
    assert.equal(
      isMdmMaterialUser(session),
      false,
      `expected no MDM grant from ${JSON.stringify(session)}`
    );
  }
});

// A genuine Master Data user is a material user too, so the flag has to win over
// the surrounding fields rather than be confirmed by them.
test("isMdmMaterialUser grants a real MDM_MATERIAL user regardless of role", () => {
  assert.equal(
    isMdmMaterialUser({
      role: "MATERIAL",
      groupid: 9,
      dept_id: "PROC",
      is_mdm_material: true,
    }),
    true
  );
});

// The store coerces with `=== true`, but the helper is the last gate before the
// MDM-only UI, so a truthy stand-in must not pass it either.
test("isMdmMaterialUser rejects truthy stand-ins for the flag", () => {
  for (const value of ["true", "TRUE", 1, "1", "yes", {}, []]) {
    assert.equal(
      isMdmMaterialUser({ is_mdm_material: value }),
      false,
      `expected no MDM grant from ${JSON.stringify(value)}`
    );
  }
});

test("resolveStoredStatusFilter keeps a stored value that is a valid option", () => {
  assert.equal(resolveStoredStatusFilter("Rework", false), "Rework");
});

test("resolveStoredStatusFilter keeps a Master Data-only value for a Master Data user", () => {
  assert.equal(resolveStoredStatusFilter("Assigned To Me", true), "Assigned To Me");
  assert.equal(resolveStoredStatusFilter("Request All", true), "Request All");
});

test("resolveStoredStatusFilter falls back to All for a Master Data-only value on a non-Master Data user", () => {
  assert.equal(resolveStoredStatusFilter("Assigned To Me", false), "All");
  assert.equal(resolveStoredStatusFilter("Request All", false), "All");
});

test("resolveStoredStatusFilter falls back to All for an unrecognised, empty, or absent value", () => {
  assert.equal(resolveStoredStatusFilter("Nonexistent", false), "All");
  assert.equal(resolveStoredStatusFilter("", false), "All");
  assert.equal(resolveStoredStatusFilter(null, false), "All");
  assert.equal(resolveStoredStatusFilter(undefined, false), "All");
});
