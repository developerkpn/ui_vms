import { create } from 'zustand';

const useCheckResetPWD = create((set, get) => {
  return {
    is_reset_pwd: true,
    setIsResetPWD: (value) => {
      set({
        is_reset_pwd: value,
      });
    },
  };
});

export default useCheckResetPWD;
