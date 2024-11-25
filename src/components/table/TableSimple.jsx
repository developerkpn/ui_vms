import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { TableContainer, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useMemo } from 'react';
// import PaginationActionButton from "./PaginationActionButton";

export default function TableSimple({ rowsData, sx, columns, meta }) {
  const col = columns;
  const table = useReactTable({
    data: rowsData,
    columns: col,
    getCoreRowModel: getCoreRowModel(),
    meta: meta,
  });
  return (
    <>
      <TableContainer
        sx={{
          height: '20rem',
          ...sx,
        }}
      >
        <Table stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => {
              return (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableCell
                        key={header.id}
                        colSpan={header.colSpan}
                        sx={{ width: `${header.column.getSize()}px` }}
                      >
                        {header.isPlaceholder ? null : (
                          <div>
                            <div>{flexRender(header.column.columnDef.header, header.getContext())}</div>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              return (
                <TableRow key={row.id} style={table.options.meta?.getRowStyles(row)}>
                  {row.getVisibleCells().map((cell) => {
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
