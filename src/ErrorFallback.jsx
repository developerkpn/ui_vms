import React, { useEffect } from "react";

export function ErrorFallback({ error }) {
    // Handle failed lazy loading of a JS/CSS chunk.
    useEffect(() => {
        const chunkFailedMessage =
            /^.*Failed\s+to\s+fetch\s+dynamically\s+imported\s+module.*$/;
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
