import { Box, CircularProgress } from "@mui/material";

/**
 * Suspense fallback for the dashboard's content area.
 *
 * Unlike the app-level fallback this fills only the outlet, so the sidebar and
 * the app bar stay on screen and keep their state while a page chunk loads.
 */
export default function LoadingContent() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: "60vh",
      }}
    >
      <CircularProgress />
    </Box>
  );
}
