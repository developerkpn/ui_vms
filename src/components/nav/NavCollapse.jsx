import { Collapse } from '@mui/material';
import PropTypes from 'prop-types';

NavCollapse.propTypes = {
  children: PropTypes.object,
  parent: PropTypes.string,
  curstate: PropTypes.object,
};
export default function NavCollapse({ children, parent, curstate }) {
  return (
    <Collapse in={parent === curstate.head && curstate.state} timeout="auto" unmountOnExit>
      {children}
    </Collapse>
  );
}
