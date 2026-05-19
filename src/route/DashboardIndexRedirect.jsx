import { Navigate } from "react-router-dom";
import useMenuStore from "src/store/useMenuStore";
import usePermissionStore from "src/store/userPermissionStore";

export default function DashboardIndexRedirect() {
  const menu = useMenuStore(state => state.menu);
  const permission = usePermissionStore(state => state.permission);

  const parentItems = Object.values(menu ?? {});
  const firstParentRoute = parentItems.find(item => {
    return permission[item.text]?.read === true && item.url;
  });
  const firstChildRoute = parentItems
    .flatMap(item => item.children ?? [])
    .find(item => permission[item.text]?.read === true);
  const targetRoute = firstParentRoute?.url || firstChildRoute?.url;

  if (!targetRoute) {
    return null;
  }

  return <Navigate to={targetRoute} replace />;
}
