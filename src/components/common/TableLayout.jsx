import {
  Table,
  TableCell,
  TableRow,
  TableHead,
  TableBody,
  TableFooter,
  Box,
  TablePagination,
  TableContainer,
  makeStyles,
  Typography,
} from '@mui/material';
import TableRows from './TableRows';
import { useState, useEffect } from 'react';
import SearchBar from '@mkyy/mui-search-bar';

export default function TableLayout({ data, header, buttons, lengthRow, onAction }) {
  const changeOnAction = (item, id) => {
    onAction(item, id);
  };
  const [rows, setRow] = useState(data);
  const [searched, setSearched] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [empty, setEmpty] = useState(0);
  const handleChangePage = (e, newpage) => {
    setPage((page) => {
      setEmpty(
        newpage > 0
          ? Math.max(0, rowsPerPage - rows.slice(newpage * rowsPerPage, newpage * rowsPerPage + rowsPerPage).length)
          : 0
      );
      return newpage;
    });
  };

  useEffect(() => {
    setEmpty(Math.max(0, rowsPerPage - rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length));
  }, []);

  useEffect(() => {
    setRow(data);
    setEmpty(Math.max(0, rowsPerPage - data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length));
  }, [data]);
  const requestSearch = (searchedVal) => {
    const filteredRows = data.filter((row) => {
      let check = false;
      Object.values(row).map((item) => {
        // console.log(item);
        if (item === null) {
          return;
        }
        if (item.toString().toLowerCase().includes(searchedVal.toString().toLowerCase())) {
          check = true;
          return;
        }
      });
      return check;
    });
    setRow(filteredRows);
  };

  const cancelSearch = () => {
    setSearched('');
    requestSearch(searched);
  };

  let idx = 0;
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', margin: 1 }}>
        <SearchBar
          value={searched}
          onChange={requestSearch}
          onCancelResearch={cancelSearch}
          onSearch={(search) => setSearched(search)}
        />
      </Box>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {data.length != 0 && 'details' in data[0] && <TableCell key="details">details</TableCell>}
              {header.map((head) => (
                <TableCell key={head}>{head}</TableCell>
              ))}
              {buttons.length != 0 && <TableCell key="buttons"></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length != 0 &&
              (rowsPerPage > 0 ? rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) : rows).map(
                (item) => (
                  <TableRows
                    key={`${idx++}`}
                    row={item}
                    length={lengthRow}
                    button={buttons}
                    setAction={changeOnAction}
                  />
                )
              )}
            {empty > 0 && data.length != 0 && (
              <TableRow style={{ height: 74.5 * empty }}>
                <TableCell colSpan={lengthRow} />
              </TableRow>
            )}
            {data.length == 0 && (
              <TableRow style={{ height: 74.5 * empty }}>
                <TableCell colSpan={lengthRow}>
                  <Typography variant="h5" sx={{ textAlign: 'center' }}>
                    Empty Data
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Table>
        <TableHead></TableHead>
        <TableBody></TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
              colSpan={lengthRow}
              count={rows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              SelectProps={{
                inputProps: {
                  'aria-label': 'rows per page',
                },
                native: true,
              }}
              onPageChange={handleChangePage}
            />
          </TableRow>
        </TableFooter>
      </Table>
    </>
  );
}
