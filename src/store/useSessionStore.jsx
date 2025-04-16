import { create } from 'zustand';

const useSessionStore = create((set, get) => {
  return {
    fullname: '',
    username: '',
    email: '',
    user_id: '',
    role: '',
    emp_role_id: null,
    bu_id: '',
    dept_id: '',
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
        emp_role_id: payload.emp_role_id,
        bu_id: payload.bu_id,
        dept_id: payload.dept_id,
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
        emp_role_id: '',
        bu_id: '',
        dept_id: '',
        permission: {},
        menu: {},
        groupid: {},
        is_reset_pwd: true,
      });
    },
  };
});

export default useSessionStore;
