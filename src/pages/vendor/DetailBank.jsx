import React from 'react';
import { Box, Divider } from '@mui/material';
import TableInfoBankVendor from './TableInfoBankVendor';
import { useTheme } from '@mui/material/styles';

export default function DetailBank({ control, getValues }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
        <h3>Bank Information</h3>
        <Divider sx={{ display: 'flex', flexGrow: 1 }} />
      </Box>
      <Box sx={{ display: '100%' }}>
        <TableInfoBankVendor data={getValues('banks')} sx={{ height: '20rem' }} />
      </Box>
    </Box>
  );
}
