import { create } from 'zustand';

const useSessionStore = create((set, get) => {
  return {
    fullname: '',
    username: '',
    email: '',
    user_id: '',
    role: '',
    permission: {},
    menu: {},
    groupid: '',
    is_reset_pwd: true,
    setSessionStore: (payload) => {
      set({
        fullname: payload.fullname,
        username: payload.username,
        email: payload.email,
        user_id: payload.user_id,
        role: payload.role,
        permission: payload.permission,
        menu: payload.menu,
        groupid: payload.groupid,
        is_reset_pwd: payload.is_reset_pwd,
      });
    },
    resetSessionStore: () => {
      set({
        fullname: '',
        username: '',
        email: '',
        user_id: '',
        role: '',
        permission: {},
        menu: {},
        groupid: {},
        is_reset_pwd: true,
      });
    },
  };
});

export default useSessionStore;
