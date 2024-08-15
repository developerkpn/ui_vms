import { Box, Stack } from '@mui/material';

export default function Error404() {
  return (
    <>
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h1>Error 404</h1>
        </Stack>
      </Box>
    </>
  );
}
