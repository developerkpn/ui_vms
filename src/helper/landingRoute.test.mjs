import test from "node:test";
import assert from "node:assert/strict";

import {
  collectReachableRoutes,
  preferredRouteFor,
  resolveLandingRoute,
  resolveLandingRouteForSession,
} from "./landingRoute.js";
import { MATERIAL_DASHBOARD_PATH, withMaterialMenu } from "./materialMenu.js";

// Menu shapes below mirror what /user/login returns on dev for the real user
// groups: a parent per menu header, children already filtered to fread = true
// by the backend, and a flat permission map keyed by page name.

const materialOnlyMenu = {
  55: {
    key: 55,
    text: "Materials",
    url: "",
    children: [
      { key: 56, text: "Material Groups", url: "/dashboard/materials/lookup" },
      { key: 57, text: "Material Search", url: "/dashboard/materials/search" },
      { key: 58, text: "Request Material", url: "/dashboard/materials/request" },
      { key: 59, text: "My Approval", url: "/dashboard/materials/approval" },
      { key: 60, text: "Administrator", url: "/dashboard/materials/administrator" },
    ],
  },
};

const materialOnlyPermission = {
  Materials: { read: true },
  "Material Groups": { read: true },
  "Material Search": { read: true },
  "Request Material": { read: true },
  "My Approval": { read: true },
  Administrator: { read: true },
};

const adminMenu = {
  1: {
    key: 1,
    text: "Ticket",
    url: "",
    children: [{ key: 2, text: "Ticket Request", url: "/dashboard/ticket" }],
  },
  10: {
    key: 10,
    text: "Vendor Mgt.",
    url: "",
    children: [{ key: 11, text: "Vendor", url: "/dashboard/vendor" }],
  },
  55: materialOnlyMenu[55],
};

const adminPermission = {
  Ticket: { read: true },
  "Ticket Request": { read: true },
  "Vendor Mgt.": { read: true },
  Vendor: { read: true },
  ...materialOnlyPermission,
};

const vendorMenu = {
  20: {
    key: 20,
    text: "Master",
    url: "",
    children: [{ key: 21, text: "E-Invoice Submission", url: "/dashboard/esubmission" }],
  },
};

const vendorPermission = {
  Master: { read: true },
  "E-Invoice Submission": { read: true },
};

test("a materials-only user lands on the Materials dashboard", () => {
  // test.requester4 on dev: dept_id is null, so the old dept_id !== "VENDOR"
  // check aimed it at /dashboard/ticket, a page absent from its sidebar.
  const route = resolveLandingRouteForSession({
    dept_id: null,
    role: "MATERIAL",
    menu: materialOnlyMenu,
    permission: materialOnlyPermission,
  });

  assert.equal(route, "/dashboard/materials/dashboard");
});

for (const [page, group] of [
  ["Material Groups", "MATERIAL"],
  ["Material Search", "MATERIAL"],
  ["Request Material", "MATERIAL"],
  ["My Approval", "MDM_MATERIAL"],
  ["Administrator", "MATERIAL_ADMIN"],
]) {
  test(`${group} with only ${page} access lands on Dashboard at login and session restore`, () => {
    const menu = {
      55: {
        ...materialOnlyMenu[55],
        children: materialOnlyMenu[55].children.filter(child => child.text === page),
      },
    };
    const permission = { Materials: { read: true }, [page]: { read: true } };
    const session = { menu, permission, dept_id: null, role: group };

    // Login resolves the raw response; restored sessions use the decorated store.
    assert.equal(resolveLandingRouteForSession(session), MATERIAL_DASHBOARD_PATH);
    assert.equal(
      resolveLandingRouteForSession({ ...session, menu: withMaterialMenu(menu) }),
      MATERIAL_DASHBOARD_PATH
    );
    assert.equal(resolveLandingRoute({ menu, permission }), MATERIAL_DASHBOARD_PATH);
    assert.deepEqual(collectReachableRoutes(menu, permission), [
      MATERIAL_DASHBOARD_PATH,
      menu[55].children[0].url,
      ...(page === "Administrator" ? ["/dashboard/materials/report"] : []),
    ]);
    assert.equal(permission.Dashboard, undefined);
    assert.equal(menu[55].children.length, 1);
  });
}

test("an explicitly readable material Dashboard is preferred over Material Groups", () => {
  const menu = {
    55: {
      ...materialOnlyMenu[55],
      children: [
        ...materialOnlyMenu[55].children,
        { key: 61, text: "Dashboard", url: MATERIAL_DASHBOARD_PATH },
      ],
    },
  };
  assert.equal(resolveLandingRouteForSession({
    menu,
    permission: { ...materialOnlyPermission, Dashboard: { read: true } },
    dept_id: "MATERIAL",
  }), MATERIAL_DASHBOARD_PATH);
});

test("a user who can read the ticket list still lands on it", () => {
  const route = resolveLandingRouteForSession({
    dept_id: "ADMIN",
    role: "ADMIN",
    menu: adminMenu,
    permission: adminPermission,
  });

  assert.equal(route, "/dashboard/ticket");
});

test("a material department keeps its material landing even with ticket access", () => {
  const route = resolveLandingRouteForSession({
    dept_id: "MDM_MAT",
    role: "MATERIAL",
    menu: adminMenu,
    permission: adminPermission,
  });

  assert.equal(route, "/dashboard/materials/dashboard");
});

test("a vendor lands on the first page its own menu offers", () => {
  const route = resolveLandingRouteForSession({
    dept_id: "",
    role: "VENDOR",
    menu: vendorMenu,
    permission: vendorPermission,
  });

  assert.equal(route, "/dashboard/esubmission");
});

test("a user with nothing readable resolves to no route at all", () => {
  const route = resolveLandingRouteForSession({
    dept_id: "VERIF",
    role: "VERIFIC",
    menu: materialOnlyMenu,
    permission: { Materials: { read: false } },
  });

  assert.equal(route, null);
});

test("an unreadable parent hides its children, matching the sidebar", () => {
  // NavSection renders a child only inside a readable parent, so a child whose
  // parent is closed to the user is not a place they can be sent.
  const routes = collectReachableRoutes(materialOnlyMenu, {
    ...materialOnlyPermission,
    Materials: { read: false },
  });

  assert.deepEqual(routes, []);
});

test("unreadable children are skipped while readable siblings remain", () => {
  const routes = collectReachableRoutes(materialOnlyMenu, {
    ...materialOnlyPermission,
    "Material Groups": { read: false },
    "Material Search": { read: false },
  });

  assert.deepEqual(routes, [
    "/dashboard/materials/dashboard",
    "/dashboard/materials/request",
    "/dashboard/materials/approval",
    "/dashboard/materials/administrator",
    "/dashboard/materials/report",
  ]);
});

test("routes come back in sidebar reading order, parent link before its children", () => {
  const menu = {
    1: {
      text: "Reports",
      url: "/dashboard/report",
      children: [{ text: "Ticket Position", url: "/dashboard/report/ticpos" }],
    },
    2: {
      text: "Ticket",
      url: "",
      children: [{ text: "Ticket Request", url: "/dashboard/ticket" }],
    },
  };
  const permission = {
    Reports: { read: true },
    "Ticket Position": { read: true },
    Ticket: { read: true },
    "Ticket Request": { read: true },
  };

  assert.deepEqual(collectReachableRoutes(menu, permission), [
    "/dashboard/report",
    "/dashboard/report/ticpos",
    "/dashboard/ticket",
  ]);
});

test("an unreachable preference is ignored, a reachable one is honoured", () => {
  assert.equal(
    resolveLandingRoute({
      menu: materialOnlyMenu,
      permission: materialOnlyPermission,
      preferred: "/dashboard/ticket",
    }),
    "/dashboard/materials/dashboard"
  );

  assert.equal(
    resolveLandingRoute({
      menu: materialOnlyMenu,
      permission: materialOnlyPermission,
      preferred: "/dashboard/materials/approval",
    }),
    "/dashboard/materials/approval"
  );
});

test("a missing menu or permission map resolves to no route instead of throwing", () => {
  assert.equal(resolveLandingRoute(), null);
  assert.equal(resolveLandingRoute({ menu: {}, permission: {} }), null);
  assert.equal(resolveLandingRoute({ menu: materialOnlyMenu }), null);
  assert.deepEqual(collectReachableRoutes(undefined, undefined), []);
});

test("department and role decide only the preference, not the outcome", () => {
  assert.equal(preferredRouteFor({ dept_id: "MDM_MAT" }), "/dashboard/materials/dashboard");
  assert.equal(preferredRouteFor({ dept_id: "MATERIAL" }), "/dashboard/materials/dashboard");
  assert.equal(preferredRouteFor({ dept_id: "", role: "VENDOR" }), null);
  assert.equal(preferredRouteFor({ dept_id: "ADMIN" }), "/dashboard/ticket");
  assert.equal(preferredRouteFor({ dept_id: null }), "/dashboard/ticket");
  assert.equal(preferredRouteFor(), "/dashboard/ticket");
});
