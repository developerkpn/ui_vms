import { Navigate } from "react-router-dom";
import { resolveLandingRoute } from "src/helper/landingRoute";
import useMenuStore from "src/store/useMenuStore";
import usePermissionStore from "src/store/userPermissionStore";

/**
 * Renders a route only when the session may read its page.
 *
 * The sidebar hides pages the permission map does not allow, but a typed or
 * bookmarked URL still opened them. Wrap a route's element with this to close
 * that path too: without read on `page`, the user is sent to a page they can
 * open instead.
 *
 * Renders nothing until the session's permission map has arrived (Dashboard
 * loads it), so a hard refresh is not bounced before the session is known.
 *
 * @param {object} props
 * @param {string} props.page - mst_page.page, the key of the permission map.
 */
export default function ProtectedRoute({ page, children }) {
  const permission = usePermissionStore((state) => state.permission);
  const menu = useMenuStore((state) => state.menu);

  if (Object.keys(permission ?? {}).length === 0) return null;

  if (permission[page]?.read !== true) {
    return (
      <Navigate to={resolveLandingRoute({ menu, permission }) ?? "/dashboard"} replace />
    );
  }

  return children;
}
