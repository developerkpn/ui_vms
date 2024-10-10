import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
} from "@tanstack/react-table";
import {
    TableContainer,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TablePagination,
    TableFooter,
    Box,
} from "@mui/material";
import { useMemo } from "react";
import PaginationActionButton from "./PaginationActionButton";

const TablePaginate = ({ data, columns, paginate, setPaginate, sx }) => {
    const dataFeed = useMemo(() => data.data, [data.data]);

    const table = useReactTable({
        columns,
        data: dataFeed,
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPaginate,
        state: {
            paginate,
        },
    });

    return (
        <Box sx={{ ...sx }}>
            <TableContainer sx={{ ...sx }}>
                <Table stickyHeader>
                    <TableHead>
                        {table.getHeaderGroups().map(headerGroup => {
                            return (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        return (
                                            <TableCell key={header.id}>
                                                {flexRender(
                                                    header.column.columnDef
                                                        .header,
                                                    header.getContext()
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
                                <TableRow hover key={row.id}>
                                    {row.getVisibleCells().map(cell => {
                                        return (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <Table>
                <TableFooter>
                    <TableRow>
                        <TablePagination
                            rowsPerPageOptions={[5]}
                            count={data.count}
                            rowsPerPage={paginate.pageSize}
                            page={paginate.pageIndex}
                            onPageChange={(_, page) => {
                                table.setPageIndex(page);
                            }}
                            onRowsPerPageChange={e => {
                                const size = e.target.value
                                    ? Number(e.target.value)
                                    : 10;
                                table.setPageSize(size);
                            }}
                            ActionsComponent={PaginationActionButton}
                        />
                    </TableRow>
                </TableFooter>
            </Table>
        </Box>
    );
};

export default TablePaginate;
