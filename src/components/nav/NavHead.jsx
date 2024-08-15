import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Suspense, lazy } from 'react';

const getIcon = (icon) => {
  // add as many icons as you need
  switch (icon) {
    case 'ConfirmationNumber':
      return lazy(() => import('@mui/icons-material/ConfirmationNumber'));
    case 'TurnedIn':
      return lazy(() => import('@mui/icons-material/TurnedIn'));
    case 'SupervisedUserCircle':
      return lazy(() => import('@mui/icons-material/SupervisedUserCircle'));
    case 'Calculate':
      return lazy(() => import('@mui/icons-material/Calculate'));
    default:
      return HelpOutlineIcon;
  }
};

export default function NavHead({ keyhead, text, icon, curstate, upNav }) {
  const updateNavcol = (item) => () => {
    upNav(item);
  };

  const SelectedIcon = getIcon(icon);
  return (
    <ListItem disablePadding key={`item-${keyhead}`} sx={{ display: 'block' }}>
      <ListItemButton key={`button-${keyhead}`} onClick={updateNavcol(keyhead)} selected={keyhead === curstate.head}>
        <ListItemIcon key={`icon-${keyhead}`}>
          <ListItemIcon key={`icon-${keyhead}`}>
            <Suspense fallback={<HelpOutlineIcon />}>
              <SelectedIcon />
            </Suspense>
          </ListItemIcon>
        </ListItemIcon>
        <ListItemText key={`text-${keyhead}`} primary={text} />
      </ListItemButton>
    </ListItem>
  );
}
