import { Box, Typography } from '@mui/material';
import { Warning } from '@mui/icons-material';
import { useRouteError } from 'react-router-dom';
import { useEffect } from 'react';
export default function TicketInvalid() {
  const err = useRouteError();

  useEffect(() => {
    const chunkFailedMessage = /^.*Failed\s+to\s+fetch\s+dynamically\s+imported\s+module.*$/;
    if (err?.message && chunkFailedMessage.test(err?.message)) {
      window.location.reload();
    }
  }, [err]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Warning sx={{ fontSize: 100 }} />
      <Typography variant="h2">{err.response.data.message}</Typography>
    </Box>
  );
}
