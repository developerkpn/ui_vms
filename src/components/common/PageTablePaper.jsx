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
 * Compact variant of the header styling, for wide tables that would otherwise
 * scroll sideways on a normal screen.
 *
 * The only real difference is that labels wrap. PAGE_TABLE_HEADER_SX keeps every
 * header on one line, which quietly sets each column's minimum to the width of
 * its title — "Material Description" and "Ticket Number" alone cost a few
 * hundred pixels. Letting two-word labels break over two lines gives that space
 * back to the data.
 */
export const PAGE_TABLE_HEADER_COMPACT_SX = {
  ...PAGE_TABLE_HEADER_SX,
  whiteSpace: "normal",
  lineHeight: 1.25,
  py: 1.5,
  px: 1.25,
};

/**
 * Tighter cell padding, spread onto a Table's sx. Pairs with the compact header.
 */
export const PAGE_TABLE_COMPACT_SX = {
  "& .MuiTableCell-root": { px: 1.25 },
};

/**
 * Two-line clamp for a free-text column, so one long description cannot stretch
 * the table. The full text still belongs in a title attribute on the cell.
 */
export const PAGE_TABLE_CLAMP_SX = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
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
