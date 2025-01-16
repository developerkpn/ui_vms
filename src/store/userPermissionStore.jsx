import { create } from 'zustand';

const usePermissionStore = create((set) => {
  return {
    permission: {},
    setPermission: (permission) => {
      set({ permission: permission });
    },
  };
});

export default usePermissionStore;
