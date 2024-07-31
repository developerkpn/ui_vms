import {
  FormControl,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Dialog,
  Box,
  Button,
  Typography,
  Skeleton,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from 'src/provider/sessionProvider';
import TableLayout from 'src/components/common/TableLayout';
import axios from 'axios';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';

export default function ListUserGroup() {
  const axiosPrivate = useAxiosPrivate();
  const columns = ['User Group', 'Date'];
  const { session } = useSession();
  const navigate = useNavigate();
  const [colLength, setColLength] = useState(0);
  const [secGroup, setSec] = useState();
  const [formStat, setFormstat] = useState({
    stat: false,
    type: 'success',
    message: '',
  });

  const handleSnackClose = (e, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setFormstat({ ...formStat, stat: false });
  };

  useEffect(() => {
    const controller = new AbortController();
    const getSecurityGroup = async () => {
      const dataSec = await axiosPrivate.get(`/user/lssecmtx`, { signal: controller.signal });
      const dataView = dataSec.data.data.map((item) => ({
        id: item.user_group_id,
        user_group: item.user_group_name,
        createddate: item.createddate,
      }));
      setSec(dataView);
    };
    getSecurityGroup();
    return () => {
      controller.abort();
    };
  }, []);

  const buttonNewGroup = () => {
    navigate('./create');
  };

  const buttonAction = (action, id) => {
    if (action === 'edit') {
      navigate({
        pathname: './create',
        search: `?idgroup=${id}`,
      });
    }
  };

  useEffect(() => {
    setColLength(columns.length + 1);
  }, [secGroup]);

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button sx={{ width: 200, heigth: 50, margin: 2 }} variant="contained" onClick={buttonNewGroup}>
          <Typography>Create New</Typography>
        </Button>
      </Box>

      {secGroup != undefined ? (
        <TableLayout
          data={secGroup}
          buttons={['edit', 'disable']}
          lengthRow={colLength}
          onAction={buttonAction}
          header={columns}
        />
      ) : (
        <Box>
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
        </Box>
      )}

      <Snackbar
        open={formStat.stat}
        onClose={handleSnackClose}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={formStat.type} onClose={handleSnackClose} variant="filled">
          {formStat.message}
        </Alert>
      </Snackbar>
    </>
  );
}
