import { Box, Typography } from "@mui/material";
import { Navigate } from "react-router-dom";
import { preferredRouteFor, resolveLandingRoute } from "src/helper/landingRoute";
import useMenuStore from "src/store/useMenuStore";
import useSessionStore from "src/store/useSessionStore";
import usePermissionStore from "src/store/userPermissionStore";

export default function DashboardIndexRedirect() {
  const menu = useMenuStore(state => state.menu);
  const permission = usePermissionStore(state => state.permission);
  const dept_id = useSessionStore(state => state.dept_id);
  const role = useSessionStore(state => state.role);

  const targetRoute = resolveLandingRoute({
    menu,
    permission,
    preferred: preferredRouteFor({ dept_id, role }),
  });

  if (targetRoute) {
    return <Navigate to={targetRoute} replace />;
  }

  // Menu and permission arrive together from /user/getsess, so an empty menu is
  // a session that has not landed yet rather than a user with no access. Render
  // nothing for that frame instead of accusing them of having no pages.
  if (Object.keys(menu ?? {}).length === 0) {
    return null;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        No pages available
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Your account has no menu access yet. Please contact the administrator to have
        access assigned to your user group.
      </Typography>
    </Box>
  );
}
