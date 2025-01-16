import {
  Dialog,
  Button,
  Typography,
  TextField,
  IconButton,
  OutlinedInput,
  InputLabel,
  FormControl,
  InputAdornment,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Link } from '@mui/icons-material';
import axios from 'axios';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import useSessionStore from 'src/store/useSessionStore';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LoadingButton } from '@mui/lab';
import SelectCompNoCont from './SelectCompNoCont';

const ticket_type = [
  { value: 'UPS', label: 'UPSTREAM' },
  {
    value: 'DWS',
    label: 'DOWNSTREAM',
  },
];

export default function ModalCreateTicket({ open, onClose, popUp, onClick, refresh }) {
  const axiosPrivate = useAxiosPrivate();
  const user_id = useSessionStore((state) => state.user_id);
  const navigate = useNavigate();
  const [link, setLink] = useState('');
  const [btnClicked, setBtnclicked] = useState(false);
  const [ttype, setTType] = useState('');
  const [formStat, setFormStat] = useState({
    stat: false,
    message: '',
    type: 'success',
  });

  const handleSnackClose = () => {
    setFormStat({
      stat: false,
      message: '',
      type: 'info',
    });
  };

  const changeTType = (value) => {
    // console.log(value);
    setTType(value);
  };

  const handlePopUp = (e) => {
    popUp(e);
  };

  const handleClick = (e) => {
    onClick(link);
  };

  const handlegenticket = (param) => async () => {
    if (ttype !== '') {
      setBtnclicked(true);
      try {
        const response = await axiosPrivate.post(`/ticket/new`, {
          user_id: user_id,
          to_who: param,
          ticket_type: ttype,
        });
        const createdTicket = response.data;
        if (param === 'VENDOR') {
          setLink(`${location.protocol}/${location.host}/${createdTicket.data.link}`);
          setFormStat({
            stat: true,
            message: 'Success generate ticket',
            type: 'success',
          });
          setBtnclicked(false);
          refresh();
        } else {
          navigate(`../form/${createdTicket.data.token}`);
        }
      } catch (err) {
        setBtnclicked(false);
        alert(err);
      }
    } else {
      setFormStat({
        stat: true,
        message: 'Please provide ticket type',
        type: 'error',
      });
    }
  };
  const handleClickLink = async (e) => {
    if (navigator.clipboard === undefined) {
      handleClick();
    } else {
      navigator.clipboard.writeText(link);
    }
    handlePopUp(e);
  };

  return (
    <>
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
      <Dialog open={open} onClose={onClose} maxWidth="xl">
        <Box
          sx={{
            width: 800,
            height: 500,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ mb: 7 }} variant="h5">
            Create New Form Request Ticket
          </Typography>
          <SelectCompNoCont
            options={ticket_type}
            value={ttype}
            label="Business Unit"
            sx={{ width: '20rem' }}
            onChangeovr={changeTType}
          />
          <Button disabled={btnClicked} sx={{ height: 80, width: 400, mb: 2 }} onClick={handlegenticket('VENDOR')}>
            {btnClicked ? <CircularProgress /> : 'By Vendor'}
          </Button>
          <Button disabled={btnClicked} sx={{ height: 80, width: 400, mb: 2 }} onClick={handlegenticket('PROC')}>
            {btnClicked ? <CircularProgress /> : 'By User'}
          </Button>
          <FormControl sx={{ mt: 5, mb: 1, width: 780 }} variant="outlined">
            <InputLabel htmlFor="link-url-form-label">Link Form</InputLabel>
            <OutlinedInput
              id="link-url-form"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton>
                    <Link />
                  </IconButton>
                </InputAdornment>
              }
              label="Password"
              value={link}
              readOnly={true}
              onClick={handleClickLink}
            />
          </FormControl>
        </Box>
      </Dialog>
    </>
  );
}
