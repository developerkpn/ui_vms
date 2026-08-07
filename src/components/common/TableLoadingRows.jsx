import { Skeleton, TableCell, TableRow, Typography } from "@mui/material";

/**
 * Shared in-table loading + empty presentation for the request/approval tables.
 *
 * Every one of those tables used to say "still loading" its own way — a
 * centered "Loading requests..." line here, "Loading approval items..." there,
 * an empty-state Paper below the table on one page and an in-body row on the
 * other. They are the same table to a user switching between My Request and My
 * Approval, so they render the same thing now: skeleton rows shaped like the
 * columns that are coming, and one in-body row for "nothing to show".
 *
 * Presentation only. Which of the two a table renders — and when — stays with
 * the page that owns the fetch.
 */

/**
 * How many placeholder rows to draw. Matched to the 10-row page size the
 * request tables use: enough to read as a table, short enough not to push the
 * pager off screen on the frame the real rows land.
 */
export const TABLE_LOADING_ROW_COUNT = 5;

/**
 * Skeleton rows standing in for data still in flight.
 *
 * @param {object} props
 * @param {number} props.columns - Column count of the table; each row draws one
 *   skeleton cell per column so the layout does not jump when rows arrive.
 * @param {number} [props.rows] - Placeholder row count.
 */
export default function TableLoadingRows({ columns, rows = TABLE_LOADING_ROW_COUNT }) {
  const columnCount = Math.max(1, Number(columns) || 1);

  return Array.from({ length: Math.max(1, Number(rows) || 1) }, (_, rowIndex) => (
    <TableRow key={`table-loading-row-${rowIndex}`} aria-hidden="true">
      {Array.from({ length: columnCount }, (_, columnIndex) => (
        <TableCell key={`table-loading-cell-${rowIndex}-${columnIndex}`} sx={{ py: 1.75 }}>
          <Skeleton animation="wave" height={22} />
        </TableCell>
      ))}
    </TableRow>
  ));
}

/**
 * The "nothing here" row, rendered inside the table body so the empty state
 * keeps the table's frame instead of appearing beside it.
 *
 * @param {object} props
 * @param {number} props.columns - Column count, spanned by the single cell.
 * @param {string} props.title - Headline, e.g. "No request found".
 * @param {string} [props.description] - Optional second line.
 */
export function TableEmptyRow({ columns, title, description }) {
  return (
    <TableRow>
      <TableCell colSpan={Math.max(1, Number(columns) || 1)} align="center" sx={{ py: 5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
