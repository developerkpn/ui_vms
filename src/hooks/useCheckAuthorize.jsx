import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePermissionStore from 'src/store/userPermissionStore';
import useSessionStore from 'src/store/useSessionStore';
import useAccessTokStore from 'src/store/useAccessTokStore';

export default function CheckAuthorize(page) {
  const navigate = useNavigate();
  const accessToken = useAccessTokStore((state) => state.accessToken);
  const permission = usePermissionStore((state) => state.permission);
  const resetSessionStore = useSessionStore((state) => state.resetSessionStore);
  useEffect(() => {
    if (Object.keys(permission).length > 0 && accessToken) {
      if (!permission[page].read) {
        navigate('/dashboard/ticket');
      }
    }
    if (!accessToken) {
      navigate('/login');
      resetSessionStore();
    }
  }, [permission]);
  return <></>;
}
