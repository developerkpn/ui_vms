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
import useSessionStore from 'src/store/useSessionStore';
import TableLayout from 'src/components/common/TableLayout';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import { LoadingButton } from '@mui/lab';
import RefreshButton from 'src/components/common/RefreshButton';

export default function ListReqStat() {
  const axiosPrivate = useAxiosPrivate();
  const [btnClicked, setBtnclicked] = useState();
  const columns = ['Ticket Number', 'Date', 'Requestor', 'Request', 'Vendor Code', 'Vendor Name'];
  const user_id = useSessionStore((state) => state.user_id);
  const [btnState, setBtn] = useState(['accept']);
  const [refreshBtn, setRefresh] = useState(true);
  const [reload, setReload] = useState(true);
  const [openValid, setOpenval] = useState(false);
  const [apprType, setAppr] = useState('');
  const [venData, setVendata] = useState({});
  const [ticket, setTicket] = useState();
  const [colLength, setColLength] = useState(0);
  const [filterAct, setFilteract] = useState(true);
  const [formStat, setFormstat] = useState({
    stat: false,
    type: 'success',
    message: '',
  });

  const getTicket = async (controller) => {
    try {
      const fetchTicket = await axiosPrivate.get(`/reqstat/show?is_active=${filterAct}`, {
        signal: controller.signal,
      });
      setTicket(fetchTicket.data.data);
    } catch (error) {
      console.log(error);
      // alert(error);
    } finally {
      if (refreshBtn) {
        setRefresh(false);
      }
    }
  };

  const handleSnackClose = (e, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setFormstat({ ...formStat, stat: false });
  };

  const handleAppr = (type, id) => {
    setOpenval(true);
    setAppr(type);
    setVendata(ticket.find((item) => item.id === id));
  };

  const buttonRefreshAct = () => {
    setRefresh(true);
  };

  const handleProcessReq = async (action, id) => {
    setBtnclicked(true);
    const controller = new AbortController();
    try {
      const jsonSend = {
        ticketid: id,
        session: user_id,
        action: action,
      };
      const processReq = await axiosPrivate.post(`/reqstat/process`, jsonSend);
      // await getTicket(controller);
      setRefresh(true);
      setFormstat({
        stat: true,
        type: 'success',
        message: processReq.data.message,
      });
      setOpenval(false);
      setBtnclicked(false);
    } catch (error) {
      setBtnclicked(false);
      setFormstat({
        stat: true,
        type: 'error',
        message: error,
      });
    }
  };

  useEffect(() => {
    console.log(refreshBtn);
    const controller = new AbortController();
    if (filterAct === false) {
      setBtn([]);
    } else {
      setBtn(['accept']);
    }

    getTicket(controller);

    return () => {
      controller.abort();
    };
  }, [filterAct, refreshBtn]);

  useEffect(() => {
    setColLength(columns.length + 1);
  }, [ticket]);

  return (
    <>
      <FormControl>
        <Select
          sx={{ width: '10em' }}
          id={'filterAct'}
          value={filterAct}
          onChange={() => {
            setFilteract(!filterAct);
            setRefresh(true);
          }}
        >
          <MenuItem value={true}>Active</MenuItem>
          <MenuItem value={false}>Not Active</MenuItem>
        </Select>
      </FormControl>
      <RefreshButton
        setRefreshbtn={buttonRefreshAct}
        isLoading={refreshBtn}
        sx={{ width: '3.5rem', height: '3.5rem', ml: 2 }}
      />

      {ticket != undefined ? (
        <TableLayout data={ticket} buttons={btnState} lengthRow={colLength} onAction={handleAppr} header={columns} />
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
      <Dialog
        open={openValid}
        onClose={() => {
          setOpenval(false);
        }}
      >
        <Box
          sx={{
            width: 400,
            height: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h4">Are you sure want to {apprType} ?</Typography>
          {venData['RequestDesc'] == 'Reactivation' && <Typography variant="h5">Reactivation Request</Typography>}
          {venData['RequestDesc'] == 'Deactivation' && <Typography variant="h5">Deactivation Request</Typography>}
          <Typography variant="h6">
            {venData['Vendor Name']} - {venData['Vendor Code']}{' '}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <LoadingButton
              sx={{ width: 50 }}
              variant="contained"
              onClick={(e) => handleProcessReq(apprType, venData['id'])}
              loading={btnClicked}
            >
              <Typography>Yes</Typography>
            </LoadingButton>
            <Button
              sx={{ width: 50 }}
              variant="contained"
              onClick={() => {
                setOpenval(false);
              }}
            >
              <Typography>No</Typography>
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
