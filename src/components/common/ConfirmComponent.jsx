import { Dialog, Button, Typography, Box, DialogActions } from '@mui/material';

export default function ConfirmComponent({ open, handleConfirm, onCloseConf, sx, confirmText, ...props }) {
  const modalConfClose = () => {
    onCloseConf();
  };

  const confirmAction = () => {
    handleConfirm();
  };

  return (
    <Dialog open={open} onClose={modalConfClose} maxWidth="lg" sx={sx}>
      <Box
        sx={{
          width: '40rem',
          height: '12rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          p: 2,
          mb: 3,
          justifyContent: 'center',
        }}
      >
        <Typography textAlign={'center'} variant="h4">
          {confirmText}
        </Typography>
      </Box>
      <DialogActions>
        <Button
          onClick={() => {
            modalConfClose();
          }}
          variant="contained"
          color="error"
        >
          {props.t('Cancel')}
        </Button>
        <Button color="primary" variant="contained" onClick={() => confirmAction()}>
          {props.t('Submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
