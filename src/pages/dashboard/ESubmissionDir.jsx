import React, { useEffect } from 'react';
import { Box, Button } from '@mui/material';
import useSessionStore from 'src/store/useSessionStore';

export default function ESubmissionDir() {
  const username = useSessionStore((state) => state.username);
  const directTo = () => {
    window.open(`https://${window.location.hostname}/esubmission/login?username=${username}`);
  };
  useEffect(() => {
    directTo();
  }, []);
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h3>Directed To E-Submission</h3>
      <Button
        onClick={() => {
          directTo();
        }}
      >
        Not Directed ?
      </Button>
    </Box>
  );
}
