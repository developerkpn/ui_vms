import { Checkbox } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useState, useEffect } from 'react';

export default function TableMenuAccess({ data, onChange }) {
  const [tableData, setTableData] = useState([
    {
      id: '',
      name: '',
      fcreate: false,
      fread: false,
      fupdate: false,
      fdelete: false,
    },
  ]);
  const changetbUp = (newTable) => {
    onChange(newTable);
  };
  useEffect(() => {
    const toArray = data.map((item) => {
      return {
        ...item,
        id: item.id,
      };
    });
    setTableData(toArray);
  }, [data]);
  const handleChangeCbox = (id, action) => (e) => {
    const newTb = tableData.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          [action]: !item[action],
        };
      } else {
        return { ...item };
      }
    });
    setTableData(newTb);
  };

  useEffect(() => {
    let newTb = [];
    tableData.map((access) => {
      let notskip = true;
      Object.keys(access).map((keys) => {
        if (['fcreate', 'fupdate', 'fread', 'fdelete'].includes(keys) && access[keys] && notskip) {
          notskip = false;
          newTb.push(access);
        }
      });
    });
    changetbUp(newTb);
  }, [tableData]);

  const columns = [
    {
      field: 'page',
      headerName: 'Menu Name',
      type: 'string',
      flex: 0.3,
    },
    {
      field: 'fcreate',
      headerName: 'Create',
      renderCell: ({ id, row }) => {
        return <Checkbox checked={row.fcreate} onClick={handleChangeCbox(id, 'fcreate')} />;
      },
      flex: 0.1,
    },
    {
      field: 'fread',
      headerName: 'Read',
      renderCell: ({ id, row }) => {
        return <Checkbox checked={row.fread} onClick={handleChangeCbox(id, 'fread')} />;
      },
      flex: 0.1,
    },
    {
      field: 'fupdate',
      headerName: 'Update',
      renderCell: ({ id, row }) => {
        return <Checkbox checked={row.fupdate} onClick={handleChangeCbox(id, 'fupdate')} />;
      },
      flex: 0.1,
    },
    {
      field: 'fdelete',
      headerName: 'Delete',
      renderCell: ({ id, row }) => {
        return <Checkbox checked={row.fdelete} onClick={handleChangeCbox(id, 'fdelete')} />;
      },
      flex: 0.1,
    },
  ];
  // const handleCbox = (row, action) => {};

  return (
    <>
      <DataGrid rows={tableData} columns={columns} sx={{ height: 500 }} />
    </>
  );
}
