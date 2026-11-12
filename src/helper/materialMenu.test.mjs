import test from "node:test";
import assert from "node:assert/strict";
import {
  MATERIAL_DASHBOARD_PATH,
  MATERIAL_REPORT_PATH,
  withMaterialDashboardMenu,
  withMaterialMenu,
  withMaterialReportMenu,
} from "./materialMenu.js";
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

test("Materials Dashboard is available through the parent menu without separate Dashboard access", () => {
  const source = sessionMenu();
  source[7].children = source[7].children.filter(child => child.text !== "Dashboard");
  const decorated = withMaterialMenu(source);
  const dashboard = decorated[7].children[0];
  assert.equal(dashboard.text, "Dashboard");
  assert.equal(dashboard.url, MATERIAL_DASHBOARD_PATH);
  assert.equal(dashboard.permissionKey, "Materials");
  assert.deepEqual(dashboard.access, [false, true, false, false]);
  assert.equal(source[7].children.some(child => child.text === "Dashboard"), false);
  assert.ok(collectReachableRoutes(decorated, { Materials: { read: true } })
    .includes(MATERIAL_DASHBOARD_PATH));
  assert.ok(!collectReachableRoutes(decorated, { Materials: { read: false } })
    .includes(MATERIAL_DASHBOARD_PATH));
  assert.deepEqual(decorated[9], source[9]);
});

test("an existing Dashboard moves to the top and session reloads do not duplicate it", () => {
  const source = sessionMenu();
  const existing = source[7].children.shift();
  source[7].children.push(existing);
  const once = withMaterialMenu(source);
  assert.equal(once[7].children[0].key, existing.key);
  assert.equal(once[7].children[0].url, MATERIAL_DASHBOARD_PATH);
  assert.deepEqual(withMaterialMenu(once), once);
  assert.equal(once[7].children.filter(child => child.url === MATERIAL_DASHBOARD_PATH).length, 1);
  assert.deepEqual(source[7].children.at(-1), existing);
});

test("material Dashboard decoration leaves unrelated menus and empty sessions alone", () => {
  const source = { 9: sessionMenu()[9] };
  assert.deepEqual(withMaterialDashboardMenu(source), source);
  assert.deepEqual(withMaterialMenu(null), {});
  assert.deepEqual(withMaterialMenu(undefined), {});
});

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
