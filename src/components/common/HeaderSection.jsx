import React from 'react';
import { Box, Divider } from '@mui/material';

export default function HeaderSection({ text }) {
  return (
    <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
      <h3>{text}</h3>
      <Divider sx={{ display: 'flex', flexGrow: 1 }} />
    </Box>
  );
}
