import { CircularProgress } from '@mui/material';
export default function LoadingSuspense() {
  return (
    <>
      <div
        style={{
          minWidth: '100%',
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </div>
    </>
  );
}
