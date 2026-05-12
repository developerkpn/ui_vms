const ADMIN_MENU_KEY = "administrator-testing";
const ADMIN_CHILD_KEY = "administrator-approval-view-testing";
const APPROVAL_MENU_TEXT = "Approval";
const ADMIN_MENU_TEXT = "Administrator";
const ADMIN_CHILD_TEXT = "My Approval";
const INSERT_AFTER_TEXT = "Coupa";
const ADMIN_ROUTE = "/dashboard/administrator/approval";

export function buildTestingAdminMenu(menu = {}) {
  const entries = Object.entries(menu);
  const hasAdministrator = entries.some(([, item]) => item?.text === ADMIN_MENU_TEXT);

  if (hasAdministrator) {
    return menu;
  }

  const nextEntries = [];
  let inserted = false;

  for (const [key, item] of entries) {
    if (item?.text === APPROVAL_MENU_TEXT) {
      continue;
    }

    nextEntries.push([key, item]);

    if (item?.text === INSERT_AFTER_TEXT) {
      nextEntries.push([ADMIN_MENU_KEY, createAdministratorMenu()]);
      inserted = true;
    }
  }

  if (!inserted) {
    nextEntries.push([ADMIN_MENU_KEY, createAdministratorMenu()]);
  }

  return Object.fromEntries(nextEntries);
}

export function buildTestingAdminPermission(permission = {}) {
  const approvalPermission = permission?.[APPROVAL_MENU_TEXT];

  if (!approvalPermission?.read) {
    return permission;
  }

  return {
    ...permission,
    [ADMIN_MENU_TEXT]: { ...approvalPermission },
    [ADMIN_CHILD_TEXT]: { ...approvalPermission },
  };
}

export function getTestingAdminRoute() {
  return ADMIN_ROUTE;
}

function createAdministratorMenu() {
  return {
    key: ADMIN_MENU_KEY,
    text: ADMIN_MENU_TEXT,
    icon: "AdminPanelSettings",
    access: [false, true, false, false],
    children: [
      {
        key: ADMIN_CHILD_KEY,
        text: ADMIN_CHILD_TEXT,
        url: ADMIN_ROUTE,
        access: [false, true, false, false],
      },
    ],
  };
}
