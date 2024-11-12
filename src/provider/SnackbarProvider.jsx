import { Snackbar, Alert } from '@mui/material';
import { useEffect, useContext, createContext, useState, useCallback, useMemo, ReactNode } from 'react';

import React from 'react';

const SnackBarContext = createContext();

const SnackbarProvider = ({ children }) => {
  const [sbComp, setSB] = useState({
    open: false,
    severity: 'info',
    message: '',
  });

  const openSnackbar = useCallback((type, message) => {
    setSB({ open: true, severity: type, message: message });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSB((prev) => ({ ...prev, open: false }));
  }, []);

  const sbContext = { openSnackbar, closeSnackbar };

  return (
    <SnackBarContext.Provider value={sbContext}>
      <Snackbar
        open={sbComp.open}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={closeSnackbar} severity={sbComp.severity}>
          {sbComp.message}
        </Alert>
      </Snackbar>
      {children}
    </SnackBarContext.Provider>
  );
};

export const useSnackBar = () => useContext(SnackBarContext);

export default SnackbarProvider;
