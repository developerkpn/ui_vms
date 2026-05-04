import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { TableContainer, Table, TableBody, TableCell, TableHead, TableRow, Box, CircularProgress, Typography } from "@mui/material";
import { useMemo } from "react";
import { ArrowUpwardOutlined, ArrowDownwardOutlined } from "@mui/icons-material";
// import PaginationActionButton from "./PaginationActionButton";

export default function TableSorting({ 
  rowsData, 
  sx, 
  columns, 
  meta, 
  sorting, 
  setSorting,
  loading,
  emptyMessage
}) {
  const col = columns;
  const table = useReactTable({
    data: rowsData,
    columns: col,
    getCoreRowModel: getCoreRowModel(),
    meta: meta,
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const rows = table.getRowModel().rows;

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      {loading && rows.length > 0 && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(255, 255, 255, 0.4)",
            zIndex: 10,
            borderRadius: 1,
          }}
        >
          <CircularProgress color="primary" size={40} />
        </Box>
      )}

      <TableContainer
        sx={{
          height: { xs: "25rem", md: "30rem" },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          bgcolor: "background.paper",
          ...sx,
        }}
      >
        <Table stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableCell
                    key={header.id}
                    colSpan={header.colSpan}
                    sx={{ 
                      width: `${header.column.getSize()}px`, 
                      cursor: "pointer",
                      bgcolor: "grey.50",
                      color: "text.secondary",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      py: 2,
                      "&:hover": { bgcolor: "grey.100" }
                    }}
                    onClick={e => {
                      const sort = header.column.getToggleSortingHandler();
                      sort(e);
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <>
                        {flexRender(header.column.columnDef.header, header.getContext())}{" "}
                        {{
                          asc: <ArrowUpwardOutlined sx={{ fontSize: 16 }} />,
                          desc: <ArrowDownwardOutlined sx={{ fontSize: 16 }} />,
                        }[header.column.getIsSorted()] ?? null}
                      </>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 10, height: "15rem" }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <CircularProgress color="primary" size={40} />
                    <Typography variant="body2" color="text.secondary">
                      Memuat data...
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : rows.length > 0 ? (
              rows.map(row => (
                <TableRow key={row.id} style={table.options.meta?.getRowStyles?.(row)}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} style={table.options.meta?.getRowStyles?.(row)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              !loading && emptyMessage && (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 10 }}>
                    <Box sx={{ color: "text.secondary", fontSize: "0.875rem", fontWeight: 500 }}>
                      {emptyMessage}
                    </Box>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
