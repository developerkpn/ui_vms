const MATERIAL_APPROVAL_CHILD_KEY = "materials-approval-view-testing";
const MATERIAL_ADMIN_CHILD_KEY = "materials-administrator-view-testing";
const APPROVAL_MENU_TEXT = "Approval";
const ADMIN_MENU_TEXT = "Administrator";
const MATERIALS_MENU_TEXT = "Materials";
const REQUEST_MATERIAL_TEXT = "Request Material";
const ADMIN_CHILD_TEXT = "My Approval";
const ADMIN_ROUTE = "/dashboard/administrator/approval";
const MATERIAL_ADMIN_ROUTE = "/dashboard/materials/administrator";

export function buildTestingAdminMenu(menu = {}) {
  const entries = Object.entries(menu);
  const nextEntries = [];
  let materialsFound = false;

  for (const [key, item] of entries) {
    if (item?.text === APPROVAL_MENU_TEXT || item?.text === ADMIN_MENU_TEXT) {
      continue;
    }

    if (item?.text === MATERIALS_MENU_TEXT) {
      nextEntries.push([key, insertApprovalIntoMaterials(item)]);
      materialsFound = true;
      continue;
    }

    nextEntries.push([key, item]);
  }

  if (!materialsFound) {
    nextEntries.push(["materials-testing", createMaterialsMenu()]);
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
    [MATERIALS_MENU_TEXT]: buildMaterialsPermission(permission?.[MATERIALS_MENU_TEXT], approvalPermission),
    [ADMIN_CHILD_TEXT]: { ...approvalPermission },
    [ADMIN_MENU_TEXT]: { ...approvalPermission },
  };
}

export function getTestingAdminRoute() {
  return ADMIN_ROUTE;
}

function createMaterialsMenu() {
  return {
    key: "materials-testing",
    text: MATERIALS_MENU_TEXT,
    icon: "Inventory2",
    access: [false, true, false, false],
    children: [createApprovalMenuChild(), createAdministratorMenuChild()],
  };
}

function insertApprovalIntoMaterials(item = {}) {
  const nextChildren = Array.isArray(item.children)
    ? item.children.filter(
        child => child?.text !== ADMIN_CHILD_TEXT && child?.text !== ADMIN_MENU_TEXT
      )
    : [];
  const approvalChild = createApprovalMenuChild();
  const administratorChild = createAdministratorMenuChild();
  const requestMaterialIndex = nextChildren.findIndex(child => child?.text === REQUEST_MATERIAL_TEXT);

  if (requestMaterialIndex >= 0) {
    nextChildren.splice(requestMaterialIndex + 1, 0, approvalChild);
    nextChildren.splice(requestMaterialIndex + 2, 0, administratorChild);
  } else {
    nextChildren.push(approvalChild);
    nextChildren.push(administratorChild);
  }

  return {
    ...item,
    children: nextChildren,
  };
}

function createApprovalMenuChild() {
  return {
    key: MATERIAL_APPROVAL_CHILD_KEY,
    text: ADMIN_CHILD_TEXT,
    url: ADMIN_ROUTE,
    access: [false, true, false, false],
  };
}

function createAdministratorMenuChild() {
  return {
    key: MATERIAL_ADMIN_CHILD_KEY,
    text: ADMIN_MENU_TEXT,
    url: MATERIAL_ADMIN_ROUTE,
    access: [false, true, false, false],
  };
}

function buildMaterialsPermission(materialsPermission = {}, approvalPermission = {}) {
  return {
    ...materialsPermission,
    read: true,
    create: materialsPermission.create ?? approvalPermission.create ?? false,
    update: materialsPermission.update ?? approvalPermission.update ?? false,
    delete: materialsPermission.delete ?? approvalPermission.delete ?? false,
  };
}
