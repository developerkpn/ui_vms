import { useState, useEffect, useCallback } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import SvgIcon from '@mui/material/SvgIcon';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AvatarComp from 'src/components/common/AvatarComp';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import NavSection from 'src/components/nav/NavSection';
import { Menu } from 'src/_mock/Menu';
import { useSession } from 'src/provider/sessionProvider';
import Cookies from 'js-cookie';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import { ReactComponent as KpnLogo } from '../../images/kpn-logo-3.svg';
import { ReactComponent as KpnNav } from '../../images/kpn-logo.svg';

const drawerWidth = 240;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme) => ({
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
  overflowX: 'hidden',
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  backgroundColor: '#fc3d32',
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme),
  }),
}));

export default function MiniDrawer() {
  const theme = useTheme();
  const location = useLocation();
  const { session, setSession } = useSession();
  const axiosPrivate = useAxiosPrivate();

  const [open, setOpen] = useState(false);
  const [navCol, setNavcol] = useState({
    head: '',
    state: false,
  });
  const [navMenu, setNavmenu] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    if (Cookies.get('accessToken')) {
      const getAuthorization = async () => {
        try {
          const getAuth = await axiosPrivate.post(
            `/user/authorization`,
            {
              group_id: session.groupid,
            },
            { signal: controller.signal }
          );
          setSession({ ...session, ['permission']: getAuth.data });
        } catch (error) {
          console.error(error);
        }
      };
      getAuthorization();
    }
    return () => {
      controller.abort();
    };
  }, []);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
    setNavcol({ ...navCol, state: false });
  };

  const updateNavcol = useCallback((menu) => {
    setNavcol((prevNav) => {
      setOpen(prevNav.head != menu ? true : !prevNav.state);
      return {
        head: menu,
        state: prevNav.head != menu ? true : !prevNav.state,
      };
    });
  }, []);

  const updateNavmenu = useCallback((menu) => {
    setNavmenu(menu);
  }, []);

  if (Cookies.get('accessToken') === undefined || Cookies.get('accessToken') === '') {
    return <Navigate to="/login" />;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 2,
              ...(open && { display: 'none' }),
            }}
          >
            <SvgIcon component={KpnNav} sx={{ width: '2rem', height: '2rem' }} viewBox="0 0 5000 5000" color="white" />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Vendor Management System App
          </Typography>
          <AvatarComp />
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <SvgIcon sx={{ width: '10rem', height: '2rem' }} component={KpnLogo} viewBox="10 50 700 100"></SvgIcon>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <NavSection
          menu={Menu}
          collapsemen={navCol}
          navmen={navMenu}
          onUpNavCol={updateNavcol}
          onUpNavMenu={updateNavmenu}
        />
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, height: 530, width: open ? `calc(94% - ${drawerWidth}px)` : '94%' }}
      >
        <DrawerHeader />
        <Outlet />
      </Box>
    </Box>
  );
}
