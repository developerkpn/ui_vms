import test from "node:test";
import assert from "node:assert/strict";
import { MATERIAL_REPORT_PATH, withMaterialReportMenu } from "./materialMenu.js";
import { collectReachableRoutes } from "./landingRoute.js";

function sessionMenu() {
  return {
    7: {
      key: 7,
      text: "Materials",
      children: [
        { key: 104, text: "Dashboard", url: "/dashboard/materials/dashboard" },
        {
          key: 103,
          text: "Administrator",
          url: "/dashboard/materials/administrator",
          access: [true, true, true, true],
        },
        { key: 105, text: "My Approval", url: "/dashboard/materials/approval" },
      ],
    },
    9: {
      key: 9,
      text: "Report",
      children: [{ key: 91, text: "Ticket Position", url: "/dashboard/report/ticket" }],
    },
  };
}

test("Report is a separate Materials submenu after Administrator", () => {
  const source = sessionMenu();
  const decorated = withMaterialReportMenu(source);
  assert.deepEqual(
    decorated[7].children.map(child => child.text),
    ["Dashboard", "Administrator", "Report", "My Approval"]
  );
  assert.equal(decorated[7].children[2].url, MATERIAL_REPORT_PATH);
  assert.deepEqual(decorated[7].children[2].access, [false, true, false, false]);
  assert.equal(source[7].children.length, 3);
  assert.deepEqual(decorated[9], source[9]);
});

test("Materials admins can reach Report even without vendor report permission", () => {
  const routes = collectReachableRoutes(withMaterialReportMenu(sessionMenu()), {
    Materials: { read: true },
    Administrator: { read: true },
    Report: { read: false },
  });
  assert.ok(routes.includes(MATERIAL_REPORT_PATH));
  assert.ok(!routes.includes("/dashboard/report/ticket"));
});

test("vendor report permission cannot grant Materials SLA access", () => {
  const routes = collectReachableRoutes(withMaterialReportMenu(sessionMenu()), {
    Materials: { read: true },
    Administrator: { read: false },
    Report: { read: true },
    "Ticket Position": { read: true },
  });
  assert.ok(!routes.includes(MATERIAL_REPORT_PATH));
  assert.ok(routes.includes("/dashboard/report/ticket"));
});

test("Report is not added to groups with no Administrator menu entry", () => {
  const source = sessionMenu();
  source[7].children = source[7].children.filter(child => child.text !== "Administrator");
  assert.deepEqual(withMaterialReportMenu(source), source);
});

test("session reloads do not duplicate Report", () => {
  const once = withMaterialReportMenu(sessionMenu());
  assert.deepEqual(withMaterialReportMenu(once), once);
  assert.equal(
    withMaterialReportMenu(once)[7].children.filter(child => child.url === MATERIAL_REPORT_PATH)
      .length,
    1
  );
  assert.deepEqual(withMaterialReportMenu(null), {});
});
