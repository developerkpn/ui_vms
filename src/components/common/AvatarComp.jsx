import { Avatar, IconButton, Menu, MenuItem, Backdrop, CircularProgress, Box, Typography } from '@mui/material';
import { useState } from 'react';
import { useSession } from 'src/provider/sessionProvider';
import { useNavigate, redirect } from 'react-router-dom';
export default function AvatarComp() {
  const { session, logOut } = useSession();
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
    logOut();
    setLoader(true);
    setTimeout(() => {
      navigate('/login');
    }, 1000);
  };
  const handleUserInfo = () => {
    setAnchorel(null);
    navigate(`../../dashboard/account/edit?iduser=${session.user_id}`, { replace: true, state: { page: 'userinfo' } });
  };
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Typography alignItems={'center'}>Welcome, {session.fullname?.split(' ')[0]}</Typography>
        <IconButton onClick={handleMenu}>
          <Avatar>{session.username?.slice(0, 2).toUpperCase()}</Avatar>
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
              <Avatar>{session.username?.slice(0, 2).toUpperCase()}</Avatar>
            </IconButton>
            <Typography>{session.fullname?.split(' ')[0]}</Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ width: '10rem' }}>
          Logout
        </MenuItem>
        <MenuItem onClick={handleUserInfo} sx={{ width: '10rem' }}>
          Edit User Info
        </MenuItem>
      </Menu>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer - 2 }} open={loader}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}
