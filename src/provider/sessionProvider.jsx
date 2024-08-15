import axios from 'axios';
import { useContext, createContext, useState, useEffect, useMemo, useCallback } from 'react';
import Cookies from 'js-cookie';

const SessionContext = createContext();

const SessionProvider = ({ children }) => {
  const [session, setSession_] = useState({
    fullname: Cookies.get('fullname') ?? '',
    username: Cookies.get('username') ?? '',
    email: Cookies.get('email') ?? '',
    accessToken: Cookies.get('accessToken') ?? '',
    user_id: Cookies.get('user_id') ?? '',
    role: Cookies.get('role') ?? '',
    permission: JSON.parse(localStorage.getItem('permission')) ?? {},
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
    setSession_({
      fullname: data.fullname,
      username: data.username,
      email: data.email,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user_id: data.user_id,
      role: data.role,
      permission: data.permission,
      groupid: data.groupid,
    });
  }, []);

  const setAccessToken = useCallback((act) => {
    setSession_({
      fullname: Cookies.get('fullname'),
      username: Cookies.get('username'),
      email: Cookies.get('email'),
      accessToken: act,
      user_id: Cookies.get('user_id'),
      role: Cookies.get('role'),
      permission: JSON.parse(localStorage.getItem('permission')),
      groupid: Cookies.get('groupid'),
    });
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
  }, []);

  const getPermission = useCallback((page) => {
    if (localStorage.getItem('permission') === null) {
      return '';
    }
    const permissions = JSON.parse(localStorage.getItem('permission'));
    const curPermission = permissions[page];
    return curPermission;
  }, []);

  useEffect(() => {
    // console.log(Cookies.get('accessToken'));
    if (session.accessToken) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + session.accessToken;
      Cookies.set('accessToken', session.accessToken);
      Cookies.set('fullname', session.fullname);
      Cookies.set('email', session.email);
      Cookies.set('username', session.username);
      Cookies.set('user_id', session.user_id);
      Cookies.set('role', session.role);
      Cookies.set('groupid', session.groupid);
      localStorage.setItem('permission', JSON.stringify(session.permission));
    }
  }, [session]);

  const contextValue = useMemo(() => ({ session, setSession, logOut, getPermission, setAccessToken }), [session]);

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  return useContext(SessionContext);
};

export default SessionProvider;
