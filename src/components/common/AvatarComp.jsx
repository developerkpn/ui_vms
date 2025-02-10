import { Avatar, IconButton, Menu, MenuItem, Backdrop, CircularProgress, Box, Typography } from '@mui/material';
import { useState } from 'react';
import useSessionStore from 'src/store/useSessionStore';
import { useNavigate, redirect } from 'react-router-dom';
import useAccessTokStore from 'src/store/useAccessTokStore';

export default function AvatarComp() {
  const fullname = useSessionStore((state) => state.fullname);
  const user_id = useSessionStore((state) => state.user_id);
  const username = useSessionStore((state) => state.username);
  const resetSessionStore = useSessionStore((state) => state.resetSessionStore);
  const logout = useAccessTokStore((state) => state.logout);

  const [loader, setLoader] = useState(false);
  const navigate = useNavigate();

  const [anchorEl, setAnchorel] = useState();
  const handleMenu = (e) => {
    setAnchorel(e.currentTarget);
  };
  const handleClose = () => {
    setAnchorel(null);
  };
  const handleLogout = () => {
    resetSessionStore();
    setLoader(true);
    logout();
    setTimeout(() => {
      navigate('/login');
    }, 1000);
  };
  const handleUserInfo = () => {
    setAnchorel(null);
    navigate(`../../dashboard/account/edit?iduser=${user_id}`, { replace: true, state: { page: 'userinfo' } });
  };
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Typography alignItems={'center'}>Welcome, {fullname.split(' ')[0]}</Typography>
        <IconButton onClick={handleMenu}>
          <Avatar>{username.slice(0, 2).toUpperCase()}</Avatar>
        </IconButton>
      </Box>
      <Menu
        id="avatar-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        keepMounted
      >
        <MenuItem sx={{ width: '10rem' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <IconButton onClick={handleMenu}>
              <Avatar>{username.slice(0, 2).toUpperCase()}</Avatar>
            </IconButton>
            <Typography>{fullname.split(' ').slice(0, 2).join(' ')}</Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ width: '10rem' }}>
          Logout
        </MenuItem>
        <MenuItem onClick={handleUserInfo} sx={{ width: '10rem' }}>
          Edit User Info
        </MenuItem>
        {/* <MenuItem>v1.2.6</MenuItem> */}
        <MenuItem>v1.2.9</MenuItem>
      </Menu>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer - 2 }} open={loader}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}
