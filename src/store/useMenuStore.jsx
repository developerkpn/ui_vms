import { create } from 'zustand';
import { withMaterialReportMenu } from 'src/helper/materialMenu';

const useMenuStore = create((set) => {
  return {
    menu: {},
    setMenu: (menu) => {
      set({ menu: withMaterialReportMenu(menu) });
    },
  };
});

export default useMenuStore;
