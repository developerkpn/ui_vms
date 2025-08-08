import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { TableContainer, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { useMemo, useRef, useCallback, useState, useEffect } from "react";

export default function TableVirtualized({
  rowsData,
  sx,
  columns,
  meta,
  rowHeight = 52, // Default row height in pixels
  containerHeight = 400, // Default container height
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const tableContainerRef = useRef(null);
  const col = columns;

  const table = useReactTable({
    data: rowsData,
    columns: col,
    getCoreRowModel: getCoreRowModel(),
    meta: meta,
  });

  const rows = table.getRowModel().rows;

  // Calculate visible rows based on scroll position
  const visibleRows = useMemo(() => {
    const startIndex = Math.floor(scrollTop / rowHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / rowHeight) + 5, // +5 for buffer
      rows.length
    );

    return {
      startIndex: Math.max(0, startIndex),
      endIndex,
      visibleRows: rows.slice(Math.max(0, startIndex), endIndex),
    };
  }, [scrollTop, rowHeight, containerHeight, rows]);

  const handleScroll = useCallback(e => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Total height of all rows
  const totalHeight = rows.length * rowHeight;

  return (
    <TableContainer
      ref={tableContainerRef}
      onScroll={handleScroll}
      sx={{
        height: `${containerHeight}px`,
        width: "100%",
        maxWidth: "100vw",
        overflow: "auto",
        ...sx,
      }}
    >
      <Table
        stickyHeader
        sx={{
          minWidth: "100%",
          "& .MuiTableCell-root": {
            border: "1px solid #e0e0e0",
          },
        }}
      >
        {/* Static Header */}
        <TableHead>
          {table.getHeaderGroups().map((headerGroup, groupIndex) => {
            return (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableCell
                    key={header.id}
                    colSpan={header.colSpan}
                    sx={{
                      width: header.column.getSize() ? `${header.column.getSize()}px` : "auto",
                      position: "sticky",
                      top: headerGroup.depth * rowHeight + 0,
                      backgroundColor: "#b2daf5ff",
                      zIndex: 100,
                      fontWeight: "bold",
                      borderBottom: "2px solid #d0d0d0",
                      color: "#333",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <div>{flexRender(header.column.columnDef.header, header.getContext())}</div>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableHead>

        {/* Virtualized Body */}
        <TableBody>
          {/* Spacer for rows before visible area */}
          {visibleRows.startIndex > 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                sx={{
                  height: `${visibleRows.startIndex * rowHeight}px`,
                  padding: 0,
                  border: "none",
                }}
              />
            </TableRow>
          )}

          {/* Visible rows */}
          {visibleRows.visibleRows.map((row, index) => (
            <TableRow
              key={row.id}
              sx={{
                height: `${rowHeight}px`,
                backgroundColor: index % 2 === 0 ? "#fff" : "#fafafa",
                "&:hover": {
                  backgroundColor: "#f0f8ff",
                },
                ...table.options.meta?.getRowStyles?.(row),
              }}
            >
              {row.getVisibleCells().map(cell => (
                <TableCell
                  key={cell.id}
                  sx={{
                    height: `${rowHeight}px`,
                    ...table.options.meta?.getCellStyles?.(cell),
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}

          {/* Spacer for rows after visible area */}
          {visibleRows.endIndex < rows.length && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                sx={{
                  height: `${(rows.length - visibleRows.endIndex) * rowHeight}px`,
                  padding: 0,
                  border: "none",
                }}
              />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
