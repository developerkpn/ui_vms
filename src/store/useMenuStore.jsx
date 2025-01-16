import { create } from 'zustand';

const useMenuStore = create((set) => {
  return {
    menu: {},
    setMenu: (menu) => {
      set({ menu: menu });
    },
  };
});

export default useMenuStore;
