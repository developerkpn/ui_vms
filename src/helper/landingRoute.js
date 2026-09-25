// Where a user gets sent when no specific page was asked for: after login, from
// the /dashboard index, and when a guard bounces them off a page.
//
// The sidebar (NavSection) renders a parent only when permission[parent.text].read
// is true, and a child only when that parent is readable AND permission[child.text].read
// is true. Landing routes are resolved against exactly that rule, so a user is
// never dropped on a page their own sidebar does not offer. Routes come back in
// sidebar reading order — a parent's own link, then its children, then the next
// parent — so the fallback is the topmost thing they can actually see.

function isReadable(permission, text) {
  return permission?.[text]?.read === true;
}

/**
 * Every route the sidebar would offer this user, in the order it offers them.
 */
export function collectReachableRoutes(menu, permission) {
  const routes = [];

  for (const parent of Object.values(menu ?? {})) {
    if (!isReadable(permission, parent?.text)) {
      continue;
    }

    if (parent?.url) {
      routes.push(parent.url);
    }

    for (const child of parent?.children ?? []) {
      if (isReadable(permission, child?.text) && child?.url) {
        routes.push(child.url);
      }
    }
  }

  return routes;
}

/**
 * The landing route for a user, or null when they can reach no page at all.
 *
 * `preferred` is honoured only when the user can actually reach it; otherwise it
 * is ignored in favour of the first route the sidebar offers. That is the whole
 * point: a preference is a nicety, permission is the rule.
 */
export function resolveLandingRoute({ menu, permission, preferred } = {}) {
  const routes = collectReachableRoutes(menu, permission);

  if (routes.length === 0) {
    return null;
  }

  if (preferred && routes.includes(preferred)) {
    return preferred;
  }

  return routes[0];
}

/**
 * The page a user of this department/role would land on if permission allowed it.
 *
 * Material departments live in the material menu and vendors never had a ticket
 * list, so neither should be aimed at one. Everyone else historically landed on
 * the ticket list, and still does wherever they can read it.
 */
export function preferredRouteFor({ dept_id, role } = {}) {
  if (dept_id === "MDM_MAT" || dept_id === "MATERIAL") {
    return "/dashboard/materials/lookup";
  }

  if (role === "VENDOR") {
    return null;
  }

  return "/dashboard/ticket";
}

/**
 * Convenience wrapper for the login response, which carries menu, permission,
 * department and role together.
 */
export function resolveLandingRouteForSession(session = {}) {
  return resolveLandingRoute({
    menu: session.menu,
    permission: session.permission,
    preferred: preferredRouteFor(session),
  });
}
