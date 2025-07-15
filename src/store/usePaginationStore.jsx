import { create } from "zustand";

const usePaginationStore = create(set => ({
  // Material Groups
  groupPage: 1,
  groupPageSize: 10,
  setGroupPage: page => set({ groupPage: page }),
  setGroupPageSize: size => set({ groupPageSize: size }),

  // Subgroups
  subgroupPage: 1,
  subgroupPageSize: 10,
  setSubgroupPage: page => set({ subgroupPage: page }),
  setSubgroupPageSize: size => set({ subgroupPageSize: size }),

  // Materials
  materialPage: 1,
  materialPageSize: 10,
  setMaterialPage: page => set({ materialPage: page }),
  setMaterialPageSize: size => set({ materialPageSize: size }),
}));

export default usePaginationStore;
