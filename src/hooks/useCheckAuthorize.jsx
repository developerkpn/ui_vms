import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveLandingRoute } from 'src/helper/landingRoute';
import useMenuStore from 'src/store/useMenuStore';
import usePermissionStore from 'src/store/userPermissionStore';
import useSessionStore from 'src/store/useSessionStore';
import useAccessTokStore from 'src/store/useAccessTokStore';

export default function CheckAuthorize(page) {
  const navigate = useNavigate();
  const accessToken = useAccessTokStore((state) => state.accessToken);
  const permission = usePermissionStore((state) => state.permission);
  const menu = useMenuStore((state) => state.menu);
  const resetSessionStore = useSessionStore((state) => state.resetSessionStore);
  useEffect(() => {
    if (!accessToken) {
      navigate('/login');
      resetSessionStore();
      return;
    }
    if (Object.keys(permission).length > 0) {
      // Optional chaining because a page missing from the permission map is a
      // page this user cannot read, not a crash.
      if (permission[page]?.read !== true) {
        // Somewhere they can actually go. Sending them to a fixed ticket list
        // only worked for users who could read one; for anybody else it swapped
        // one forbidden page for another.
        navigate(resolveLandingRoute({ menu, permission }) ?? '/dashboard', {
          replace: true,
        });
      }
    }
  }, [permission, menu, accessToken, page]);
  return <></>;
}
