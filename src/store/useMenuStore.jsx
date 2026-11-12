import { create } from 'zustand';
import { withMaterialMenu } from 'src/helper/materialMenu';

const useMenuStore = create((set) => {
  return {
    menu: {},
    setMenu: (menu) => {
      set({ menu: withMaterialMenu(menu) });
    },
  };
});

export default useMenuStore;
