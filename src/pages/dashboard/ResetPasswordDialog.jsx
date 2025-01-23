import { Dialog, Box, DialogTitle, Alert } from '@mui/material';
import { useForm } from 'react-hook-form';
import { LoadingButton } from '@mui/lab';
import { PasswordWithEyes } from 'src/components/common/PasswordWithEyes';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import { useSnackBar } from 'src/provider/SnackbarProvider';
import { useSession } from 'src/provider/sessionProvider';
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';

export default function ResetPasswordDialog({ open, setOpen }) {
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(false);
  const { openSnackbar } = useSnackBar();
  const { setIsResetPWD } = useSession();
  const { handleSubmit, control } = useForm({
    defaultValues: {
      password: '',
    },
  });

  const submitResetPass = async (value) => {
    try {
      setLoading(true);
      const { data } = await axiosPrivate.post(`/user/resetpassven`, {
        password: value.password,
      });

      openSnackbar('success', data.message);
      setIsResetPWD();
      setOpen(false);
    } catch (error) {
      console.error(error);
      openSnackbar('error', error.response.data.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Dialog open={open} sx={{ zIndex: theme.zIndex.drawer - 1 }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Set New Password</h3>
            <Alert severity="warning">
              <p>For your security, please set a new password before accessing the application.</p>
            </Alert>
          </Box>
        </DialogTitle>
        <form
          onKeyDown={(e) => {
            if (e.key == 'Enter') e.preventDefault();
          }}
          onSubmit={handleSubmit(submitResetPass)}
        >
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <PasswordWithEyes
              control={control}
              name="password"
              label="New Password"
              rules={{ required: 'Please insert this field' }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <LoadingButton type="submit" sx={{ width: '6rem' }} loading={loading}>
                Submit
              </LoadingButton>
            </Box>
          </Box>
        </form>
      </Dialog>
    </>
  );
}
