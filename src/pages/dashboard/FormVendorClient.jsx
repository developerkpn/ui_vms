import useSessionStore from 'src/store/useSessionStore';
import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';

export default function FormVendorClient() {
  const resetSessionStore = useSessionStore((state) => state.resetSessionStore);
  useEffect(() => {
    resetSessionStore();
  }, []);
  return (
    <>
      <Outlet />
    </>
  );
}
