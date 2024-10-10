import { Box } from '@mui/material';
import TableParentVerif from 'src/components/table/TableParentVerif';
import SnackbarProvider from 'src/provider/SnackbarProvider';

export default function VerificationPage() {
  return (
    <Box sx={{ height: '100%' }}>
      <SnackbarProvider>
        <TableParentVerif />
      </SnackbarProvider>
    </Box>
  );
}
