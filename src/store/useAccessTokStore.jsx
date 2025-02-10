import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAccessTokStore = create(
  persist(
    (set, get) => {
      return {
        accessToken: '',
        setAccessToken: (token) => {
          set({
            accessToken: token,
          });
        },
        logout: () => {
          set({
            accessToken: '',
          });
        },
      };
    },
    {
      name: 'accessToken',
    }
  )
);

export default useAccessTokStore;
