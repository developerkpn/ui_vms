import axios from 'axios';
import { useSession } from 'src/provider/sessionProvider';
import Cookies from 'js-cookie';

const useRefreshToken = () => {
  const { setAccessToken, logOut } = useSession();
  const refresh = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_URL_LOC}/user/refresh`, {
        withCredentials: true,
      });
      setAccessToken(response.data.accessToken);
      return response.data.accessToken;
    } catch (error) {
      console.log(error);
      Object.keys(Cookies.get()).map((item) => {
        Cookies.remove(item);
      });
      setTimeout(() => {
        window.location.replace(`${window.location.hostname}/login`);
      }, 100);
    }
  };

  return refresh;
};

export default useRefreshToken;
