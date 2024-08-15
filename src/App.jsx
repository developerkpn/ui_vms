import { RouterProvider } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import ThemeProvider from './theme';

import { routes } from './route/routes';
import AuthProvider from './provider/sessionProvider';
import { Suspense } from 'react';
import LoadingSuspense from './components/loadingscreen/Loading';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';
import { CssBaseline } from '@mui/material';

function App() {
  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <Suspense fallback={<LoadingSuspense />}>
        <HelmetProvider>
          <ThemeProvider>
            <CssBaseline/>
            <AuthProvider>
              <RouterProvider router={routes} />
            </AuthProvider>
          </ThemeProvider>
        </HelmetProvider>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
