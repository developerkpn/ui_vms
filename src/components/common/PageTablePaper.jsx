import { Box, Paper, TableContainer } from "@mui/material";

/**
 * Shared table header styling constants.
 * Import and spread into TableCell sx on table head cells.
 */
export const PAGE_TABLE_HEADER_SX = {
  color: "text.secondary",
  fontSize: "0.78rem",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  py: 2.25,
  borderBottom: "1px solid",
  borderColor: "divider",
};

/**
 * Consistent bordered-paper wrapper for table content.
 *
 * Props:
 *  - minWidth?: minimum width for the wrapper (default 1060)
 *  - children:  table content (Table, TableSorting, etc.)
 */
export default function PageTablePaper({ minWidth = 1060, children }) {
  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <Paper
        elevation={0}
        sx={{
          minWidth,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "12px",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <TableContainer>{children}</TableContainer>
      </Paper>
    </Box>
  );
}
