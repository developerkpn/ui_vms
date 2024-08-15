import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Paper, SvgIcon, Typography, Button, Snackbar, Alert, Link, CircularProgress } from '@mui/material';
import imgbg from '../images/gama-tower.jpg';
import { PasswordWithEyes } from 'src/components/common/PasswordWithEyes';
import KpnNav from '../images/kpn-logo.svg?react';
import { LoadingButton } from '@mui/lab';
import useMediaQuery from '@mui/material/useMediaQuery';
import { TextFieldComp } from 'src/components/common/TextFieldComp';
import { useForm } from 'react-hook-form';
import PatternFieldComp from 'src/components/common/PatternFieldComp';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { set } from 'date-fns';

export default function ResetPassword() {
  const navigate = useNavigate();
  const matches = useMediaQuery('(max-width:380px)');
  const { handleSubmit, control, reset, getValues } = useForm({
    defaultValues: {
      username: '',
    },
  });
  const [countDown, setCountdown] = useState();

  const Submission = async (values) => {
    if (userid === '') {
      await sendOTP(values);
      setCountdown(60);
    } else if (!otpVerified && userid !== '') {
      await verifOTP(values);
    } else if (otpVerified && userid !== '') {
      await resetUser(values);
    }
  };

  const GoBack = () => {
    if (userid !== '') {
      setUserid('');
    }
    if (otpVerified) {
      setOtp(false);
    }
  };

  const sendOTP = async (values) => {
    try {
      setBtnclicked(true);
      setResendload(true);
      const send_otp = await axios.post(`${import.meta.env.VITE_URL_LOC}/otp/sendotp`, {
        username: values.username === undefined ? userName : values.username,
      });
      Cookies.set('user_id', send_otp.data.user_id);
      setOpennotif({
        open: true,
        status: 'success',
        message: send_otp.data.message,
      });
      setUserid(send_otp.data.user_id);
      setBtnclicked(false);
      setResendload(false);
      setUsername(values.username);
    } catch (error) {
      console.log(error);
      setResendload(false);
      setBtnclicked(false);
      setUserid('');
      setOpennotif({
        open: true,
        status: 'error',
        message: error.response.data.message,
      });
    }
  };

  const verifOTP = async (values) => {
    setBtnclicked(true);
    try {
      const verif_otp = await axios.post(
        `${import.meta.env.VITE_URL_LOC}/otp/validateotp`,
        {
          OTP: values.OTP,
        },
        { withCredentials: true }
      );
      setOpennotif({
        open: true,
        status: 'success',
        message: verif_otp.data.message,
      });
      reset({
        username: userName,
      });
      setOtp(true);
      setBtnclicked(false);
    } catch (error) {
      setBtnclicked(false);
      setOtp(false);
      setOpennotif({
        open: true,
        status: 'error',
        message: error.response.data.message,
      });
    }
  };

  const resetUser = async (values) => {
    try {
      setBtnclicked(true);
      const verif_otp = await axios.post(
        `${import.meta.env.VITE_URL_LOC}/user/resetpwd`,
        {
          newpwd: values.newpwd,
        },
        { withCredentials: true }
      );
      setOpennotif({
        open: true,
        status: 'success',
        message: verif_otp.data.message,
      });
      setBtnclicked(false);
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (error) {
      setOpennotif({
        open: true,
        status: 'error',
        message: error.response.data.message,
      });
      setBtnclicked(false);
    }
  };

  const resendCode = () => {
    setResendload(true);

    setTimeout(() => {
      setResendload(false);
    }, 1000);
  };

  const backLogin = () => {
    navigate('/login');
  };

  const handleSnackClose = () => {
    setOpennotif({ ...openNotif, open: false });
  };

  useEffect(() => {
    let countDowninterval = setInterval(() => {
      if (countDown > 0) {
        setCountdown(countDown - 1);
      } else {
        clearInterval(countDowninterval);
      }
    }, 1000);
    return () => clearInterval(countDowninterval);
  }, [countDown]);

  const [btnClicked, setBtnclicked] = useState();
  const [userName, setUsername] = useState('');
  const [resendLoad, setResendload] = useState(false);
  const [userid, setUserid] = useState('');
  const [otpVerified, setOtp] = useState(false);
  const [openNotif, setOpennotif] = useState({
    open: false,
    status: 'success',
    message: '',
  });
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          backgroundImage: `url(${imgbg})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      >
        <form onSubmit={handleSubmit(Submission)}>
          <Paper
            sx={{
              display: 'flex',
              width: matches ? '18.75rem' : '37.5rem',
              height: matches ? '41.5rem' : '22.75rem',
              p: 2,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            elevation={3}
          >
            <Box sx={{ display: 'flex', gap: 1, height: '2rem', mt: '0.1rem' }}>
              <SvgIcon
                component={KpnNav}
                sx={{ width: '2rem', height: '2rem', mt: '0.1rem' }}
                viewBox="0 0 5000 5000"
                color="white"
              />
              <Typography variant="h4">Vendor Management System KPN</Typography>
            </Box>
            <Box sx={{ display: 'flex' }}>
              <Typography variant="h5">Password Reset</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 1, mt: '2rem', flexGrow: 2 }}>
              {userid === '' && !otpVerified && <TextFieldComp control={control} name="username" label="Username" />}
              {userid !== '' && !otpVerified && (
                <PatternFieldComp control={control} name="OTP" label="OTP" format="######" />
              )}
              {userid !== '' && otpVerified && (
                <>
                  <TextFieldComp control={control} name="username" label="Username" readOnly={true} />
                  <PasswordWithEyes control={control} name="newpwd" label="New Password" />
                </>
              )}
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                flexGrow: 1,
                alignItems: 'center',
                height: matches ? '3.125rem' : '0.1rem',
                width: matches ? '18.75rem' : '37.5rem',
              }}
            >
              {countDown > 0 && userid !== '' && !otpVerified && `Wait for resend OTP code (${countDown}) `}
              {userid !== '' && !otpVerified && resendLoad && <CircularProgress sx={{ mr: 6 }} />}
              {userid !== '' && !otpVerified && countDown <= 0 && !resendLoad && (
                <Link onClick={sendOTP}>Resend OTP Code</Link>
              )}
              {userid !== '' && (
                <Button
                  onClick={GoBack}
                  sx={{ height: '3.125rem', m: 1, width: '6.25rem' }}
                  disabled={countDown > 0 && userid !== '' && !otpVerified}
                >
                  Back
                </Button>
              )}
              {userid === '' && !otpVerified && (
                <Button onClick={backLogin} sx={{ height: '3.125rem', m: 1, width: '6.25rem' }}>
                  Back
                </Button>
              )}
              <LoadingButton type="submit" sx={{ height: '3.125rem', m: 1, width: '6.25rem' }} loading={btnClicked}>
                {userid === '' && !otpVerified && 'Send OTP'}
                {userid !== '' && !otpVerified && 'Verify'}
                {userid !== '' && otpVerified && 'Submit'}
              </LoadingButton>
            </Box>
          </Paper>
        </form>
      </Box>
      <Snackbar
        open={openNotif.open}
        onClose={handleSnackClose}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={openNotif.status} variant="filled" onClose={handleSnackClose}>
          {openNotif.message}
        </Alert>
      </Snackbar>
    </>
  );
}
