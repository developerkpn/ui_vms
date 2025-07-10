import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { TableContainer, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { useMemo } from "react";
import { ArrowUpwardOutlined, ArrowDownwardOutlined } from "@mui/icons-material";
// import PaginationActionButton from "./PaginationActionButton";

export default function TableSorting({ rowsData, sx, columns, meta, sorting, setSorting }) {
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
  return (
    <>
      <TableContainer
        sx={{
          height: "20rem",
          ...sx,
        }}
      >
        <Table stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map(headerGroup => {
              return (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    return (
                      <TableCell
                        key={header.id}
                        colSpan={header.colSpan}
                        sx={{ width: `${header.column.getSize()}px`, cursor: "pointer" }}
                        onClick={e => {
                          const sort = header.column.getToggleSortingHandler();
                          sort(e);
                          console.log(header.column.getIsSorted());
                        }}
                      >
                        {header.isPlaceholder ? null : (
                          <>
                            {flexRender(header.column.columnDef.header, header.getContext())}{" "}
                            {{
                              asc: <ArrowUpwardOutlined />,
                              desc: <ArrowDownwardOutlined />,
                            }[header.column.getIsSorted()] ?? null}
                          </>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map(row => {
              return (
                <TableRow key={row.id} style={table.options.meta?.getRowStyles(row)}>
                  {row.getVisibleCells().map(cell => {
                    return (
                      <TableCell key={cell.id} style={table.options.meta?.getRowStyles(row)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
