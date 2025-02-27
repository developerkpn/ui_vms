import axios from 'axios';
import useSessionStore from 'src/store/useSessionStore';
import useAccessTokStore from 'src/store/useAccessTokStore';

const useRefreshToken = () => {
  const setAccessToken = useAccessTokStore((state) => state.setAccessToken);
  const accessToken = useAccessTokStore((state) => state.accessToken);
  const resetSessionStore = useSessionStore((state) => state.resetSessionStore);
  const refresh = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_URL_LOC}/user/refresh`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setAccessToken(response.data.accessToken);
      return response.data.accessToken;
    } catch (error) {
      console.log(error);
      resetSessionStore();
      // Object.keys(Cookies.get()).map((item) => {
      //   Cookies.remove(item);
      // });
      setTimeout(() => {
        window.location.replace(`/login`);
      }, 100);
    }
  };

  return refresh;
};

export default useRefreshToken;
