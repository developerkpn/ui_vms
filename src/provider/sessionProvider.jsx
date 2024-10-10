import axios from 'axios';
import { useContext, createContext, useState, useEffect, useMemo, useCallback } from 'react';
import Cookies from 'js-cookie';

const SessionContext = createContext();

const SessionProvider = ({ children }) => {
  const [accessToken, _setAccessToken] = useState(Cookies.get('accessToken') ?? '');
  const [session, setSession_] = useState({
    fullname: Cookies.get('fullname') ?? '',
    username: Cookies.get('username') ?? '',
    email: Cookies.get('email') ?? '',
    user_id: Cookies.get('user_id') ?? '',
    role: Cookies.get('role') ?? '',
    permission: JSON.parse(localStorage.getItem('permission')) ?? {},
    menu: JSON.parse(localStorage.getItem('menu')) ?? {},
    groupid: Cookies.get('groupid') ?? '',
  });

  const setSession = useCallback((data) => {
    Cookies.set('accessToken', data.accessToken);
    Cookies.set('fullname', data.fullname);
    Cookies.set('email', data.email);
    Cookies.set('username', data.username);
    Cookies.set('user_id', data.user_id);
    Cookies.set('role', data.role);
    Cookies.set('groupid', data.groupid);
    localStorage.setItem('permission', JSON.stringify(data.permission));
    localStorage.setItem('menu', JSON.stringify(data.menu));
    setSession_({
      fullname: data.fullname,
      username: data.username,
      email: data.email,
      refreshToken: data.refreshToken,
      user_id: data.user_id,
      role: data.role,
      permission: data.permission,
      groupid: data.groupid,
      menu: data.menu,
    });
    _setAccessToken(data.accessToken);
  }, []);

  const setAccessToken = useCallback((act) => {
    _setAccessToken(act);
  }, []);
  const logOut = useCallback(() => {
    localStorage.clear();
    Cookies.remove('fullname');
    Cookies.remove('email');
    Cookies.remove('username');
    Cookies.remove('user_id');
    Cookies.remove('role');
    Cookies.remove('accessToken');
    Cookies.remove('groupid');
    Cookies.remove('menu');
  }, []);

  const getPermission = useCallback((page) => {
    if (localStorage.getItem('permission') === null) {
      return '';
    }
    const permissions = JSON.parse(localStorage.getItem('permission'));
    const curPermission = permissions[page];
    return curPermission;
  }, []);

  const getMenu = useCallback(() => {
    if (localStorage.getItem('menu') === null) {
      return '';
    }
    const menu = JSON.parse(localStorage.getItem('menu'));
    return menu;
  }, []);

  useEffect(() => {
    // console.log(Cookies.get('accessToken'));
    if (accessToken) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
      Cookies.set('accessToken', accessToken);
      Cookies.set('fullname', session.fullname);
      Cookies.set('email', session.email);
      Cookies.set('username', session.username);
      Cookies.set('user_id', session.user_id);
      Cookies.set('role', session.role);
      Cookies.set('groupid', session.groupid);
      localStorage.setItem('permission', JSON.stringify(session.permission));
      localStorage.setItem('menu', JSON.stringify(session.menu));
    }
  }, [session]);

  const contextValue = useMemo(
    () => ({ session, setSession, logOut, getPermission, getMenu, accessToken, setAccessToken }),
    [session]
  );

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  return useContext(SessionContext);
};

export default SessionProvider;
