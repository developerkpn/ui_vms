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
    // Master Data (MDM_MATERIAL) membership, as decided by the backend from the
    // user's page-access group names. Never inferred here: role is "MATERIAL"
    // for the whole department, so only this flag tells Master Data apart.
    is_mdm_material: false,
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
        // Anything short of an explicit true stays false, so a stale or partial
        // payload can never hand out the Master Data view.
        is_mdm_material: payload.is_mdm_material === true,
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
        is_mdm_material: false,
        is_reset_pwd: true,
      });
    },
  };
});

export default useSessionStore;
