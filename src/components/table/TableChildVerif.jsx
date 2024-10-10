import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { TableContainer, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { LinkFile } from '../common/UploadComponent';

export default function TableChildVerif({ dataChild }) {
  const theme = useTheme();
  const columns = useMemo(() => {
    let init_lnreq = [
      {
        header: 'Bank',
        accessorKey: 'bank_name',
        cell: (props) => props.getValue(),
      },
      {
        header: 'Bank Account',
        accessorKey: 'bank_acc',
        cell: (props) => props.getValue(),
      },
      {
        header: 'Account Holder',
        accessorKey: 'acc_hold',
        cell: (props) => props.getValue(),
      },
      {
        header: 'Surat Pernyataan Rekening',
        accessorKey: 'a001',
        cell: (props) => {
          return <LinkFile file={{ file_name: props.getValue() }} />;
        },
      },
      {
        header: 'Buku Rekening',
        accessorKey: 'a002',
        cell: (props) => {
          return <LinkFile file={{ file_name: props.getValue() }} />;
        },
      },
    ];
    return init_lnreq;
  }, []);
  const table = useReactTable({
    columns,
    data: dataChild,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.bankv_id,
  });
  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => {
              return (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableCell key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : (
                          <div>{flexRender(header.column.columnDef.header, header.getContext())}</div>
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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
