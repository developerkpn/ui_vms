import React, { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';

export function ErrorRouter() {
  // Handle failed lazy loading of a JS/CSS chunk.
  const error = useRouteError();
  useEffect(() => {
    const chunkFailedMessage = /^.*Failed\s+to\s+fetch\s+dynamically\s+imported\s+module.*$/;
    if (error?.message && chunkFailedMessage.test(error.message)) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div>
      <p>Something went wrong.</p>
      <pre>{error?.message}</pre>
    </div>
  );
}
