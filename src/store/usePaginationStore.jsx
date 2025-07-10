import { create } from "zustand";

const usePaginationStore = create(set => {
  return {
    page: 1,
    setPageGlobal: value => {
      set({ page: value });
    },
  };
});

export default usePaginationStore;
