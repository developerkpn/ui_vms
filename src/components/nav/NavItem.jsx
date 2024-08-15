import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ListItemButton, ListItemText } from '@mui/material';

NavItem.propTypes = {
  keynav: PropTypes.string,
  text: PropTypes.string,
};

export default function NavItem({ keynav, text, url, upNavMenu, curstate }) {
  const onClickUpNavMenu = (item) => () => {
    upNavMenu(item);
  };
  return (
    <ListItemButton
      key={`button-${keynav}`}
      component={Link}
      to={url}
      sx={{ pl: 4 }}
      onClick={onClickUpNavMenu(keynav)}
      selected={curstate === keynav}
    >
      <ListItemText key={`text-${keynav}`} primary={text} />
    </ListItemButton>
  );
}
