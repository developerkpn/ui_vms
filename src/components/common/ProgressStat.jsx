import { Paper as MUIPaper } from '@mui/material';
import { styled } from '@mui/material';
import PropTypes from 'prop-types';

const Paper = styled(MUIPaper)(() => ({
  width: 100,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 1,
}));

export default function ProgressStat({ children, color }) {
  return <Paper sx={{ backgroundColor: color }}>{children}</Paper>;
}

ProgressStat.propTypes = {
  children: PropTypes.element.isRequired,
  color: PropTypes.string,
};
