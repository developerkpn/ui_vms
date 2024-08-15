import { Tooltip, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

export default function RefreshButton(props) {
  const refreshBtn = () => {
    props.setRefreshbtn(true);
  };
  return (
    <Tooltip title={<Typography>Refresh</Typography>}>
      <LoadingButton loading={props.isLoading} onClick={refreshBtn} sx={props.sx} variant={'contained'}>
        <Refresh></Refresh>
      </LoadingButton>
    </Tooltip>
  );
}
