import React from 'react';
import { TextFieldComp } from 'src/components/common/TextFieldComp';
import { Box, Divider } from '@mui/material';
import TableInfoFileVendor from './TableInfoFileVendor';
import { useTheme } from '@mui/material/styles';

export default function DetailTab({ control, getValues }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
        <h3>Company Details</h3>
        <Divider sx={{ display: 'flex', flexGrow: 1 }} />
      </Box>
      <Box sx={{ display: 'flex', gap: 3 }}>
        <TextFieldComp control={control} label="Title" name="title" disabled />
        <TextFieldComp control={control} label="Local / Overseas" name="local_ovs" disabled />
        <TextFieldComp control={control} label="Company Name" name="name_1" disabled />
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          border: 'solid',
          borderWidth: '2px',
          borderColor: theme.palette.grey[300],
          borderRadius: '4px',
        }}
      >
        <Box
          sx={{
            ml: '5px',

            backgroundColor: theme.palette.background.default,
            px: 2,
            top: '-10px',
            width: 'fit-content',
            position: 'relative',
            justifyContent: 'center',
          }}
        >
          <h4 style={{ margin: '0 0 0 0', textAlign: 'center' }}>Address</h4>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2 }}>
          <TextFieldComp name="street" control={control} disabled />
          <TextFieldComp name="street2" control={control} disabled />
          <TextFieldComp name="street3" control={control} disabled />
          <TextFieldComp name="street4" control={control} disabled />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextFieldComp name="country" label="Country" control={control} disabled />
        <TextFieldComp name="postal" label="Postal" control={control} disabled />
        <TextFieldComp name="city" label="City" control={control} disabled />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, width: '80%' }}>
        <TextFieldComp name="telf1" label="Telephone Num." control={control} disabled />
        <TextFieldComp name="email" label="Email" control={control} disabled />
      </Box>
      <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
        <h3>Tax and Payment</h3>
        <Divider sx={{ display: 'flex', flexGrow: 1 }} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextFieldComp name="npwp" label="Tax Number" control={control} disabled />
        <TextFieldComp name="pay_mthd" label="Payment Method" control={control} disabled />
        <TextFieldComp name="pay_term" label="Payment Term" control={control} disabled />
      </Box>
      <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
        <h3>Files</h3>
        <Divider sx={{ display: 'flex', flexGrow: 1 }} />
      </Box>
      <TableInfoFileVendor data={getValues('files')} />
    </Box>
  );
}
