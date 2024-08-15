import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { useState, forwardRef, useEffect, useMemo, useCallback } from 'react';
import { Delete as DeleteIcon, Undo, Download, Preview } from '@mui/icons-material';
import { Alert as MuiAlert, Snackbar, Backdrop, CircularProgress, Skeleton, Tooltip } from '@mui/material';
import { styled, lighten, darken } from '@mui/material/styles';
import axios from 'axios';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import fileDownload from 'js-file-download';

const Alert = forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function VenFileTable({ initData, upTable, isallow, isLoad, delFile, ...props }) {
  const [file_ven, setFile_ven] = useState(initData);
  const [sbarOpen, setSbarOpen] = useState(false);
  const [loaderOpen, setLoaderopen] = useState(false);
  const [fetchStat, setFetchStat] = useState({});
  const axiosPrivate = useAxiosPrivate();
  // console.log(isallow);

  useEffect(() => {
    setFile_ven(
      initData
        .map((item) => ({ ...item, desc_file: props.t(item.desc_file) }))
        .sort((a, b) => {
          if (a.file_type < b.file_type) {
            return -1;
          }
          if (a.file_type > b.file_type) {
            return 1;
          }
          return 0;
        })
    );
  }, [initData, props.t]);

  // console.log(file_ven);
  const DataGridFile = styled(DataGrid)(() => ({
    '& .row-idle': {
      backgroundColor: '#fff',
    },
    '& .row-delete': {
      backgroundColor: '#fc8b72',
      '&:hover': {
        backgroundColor: lighten('#fc8b72', 0.2),
      },
      '&.Mui-selected': {
        backgroundColor: darken('#fc8b72', 0.2),
        '&:hover': {
          backgroundColor: lighten('#fc8b72', 0.2),
        },
      },
    },
  }));

  const onDeleteSBar = useCallback(() => {
    setSbarOpen(true);
  }, []);

  const onCloseBar = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setSbarOpen(false);
  }, []);

  const handleDeleteClick = useCallback(
    async ({ id, row }) => {
      let prevData = [];
      if (confirm(`Are you sure want to delete ${row.file_name}`)) {
        try {
          for (const item of file_ven) {
            if (item.id === id) {
              if (item.source == 'ven_file_atth') {
                const deletedFile = await fetch(`${process.env.REACT_APP_URL_LOC}/vendor/delfile`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ id: id }),
                });
                const response = await deletedFile.json();
                if (response.status == 200) {
                  setFetchStat({
                    stat: 'success',
                    message: `file ${response.data.file_name} deleted`,
                  });
                  onDeleteSBar();
                } else {
                  throw new Error(response.message);
                }
              } else {
                const deletedFile = await fetch(`${process.env.REACT_APP_URL_LOC}/vendor/file`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ id: id }),
                });
                const response = await deletedFile.json();
                if (response.status == 200) {
                  setFetchStat({
                    stat: 'success',
                    message: `temporary file ${response.data.file_name} deleted`,
                  });
                  onDeleteSBar();
                } else {
                  throw new Error(response.message);
                }
              }
              delFile(item);
            } else {
              prevData.push(item);
            }
          }
          setFile_ven(prevData);
          upTable(prevData);
        } catch (error) {
          console.error(error);
          setFetchStat({
            stat: 'error',
            message: 'error deleting item',
          });
          onDeleteSBar();
        }
      }

      // console.log(file_ven);
    },
    [file_ven]
  );

  const handleUndoClick = useCallback(
    ({ id, row }) =>
      () => {
        let pushData = [];
        file_ven.map((item) => {
          // console.log(id, item.id);
          if (item.id === id) {
            pushData.push({ ...item, method: '' });
          } else {
            pushData.push(item);
          }
        });
        // setFetchStat({ stat: 'info', message: `${row.file_name} delete stage canceled` });
        setFile_ven(pushData);
        upTable(pushData);
        // onDeleteSBar();
      },
    [file_ven]
  );

  const columns = useMemo(
    () => [
      {
        field: 'desc_file',
        type: 'string',
        headerName: props.t('Type'),
        width: 200,
      },
      {
        field: 'file_name',
        type: 'string',
        headerName: props.t('File Name'),
        width: 650,
      },
      {
        field: 'action',
        type: 'actions',
        headerName: props.t('Action'),
        width: 100,
        cellClassName: 'actions',
        renderCell: (item) => {
          const handleDownloadClick = async (item) => {
            const fileName = item.row.file_name;

            await axiosPrivate
              .get(`/master/file/${fileName}`, { responseType: 'blob' })
              .then((response) => {
                fileDownload(response.data, fileName);
                setFetchStat({
                  stat: 'success',
                  message: `file downloaded`,
                });
                onDeleteSBar();
              })
              .catch((err) => {
                console.log(err);
                setFetchStat({
                  stat: 'error',
                  message: `error download file`,
                });
                onDeleteSBar();
              });
          };
          const handlePreviewClick = (item) => {
            const fileName = item.row.file_name;
            window.open(`${process.env.REACT_APP_URL_BE}static/${fileName}`);
          };
          if (item.row.method == 'delete') {
            return [
              <GridActionsCellItem
                key={`undo-${item.id}`}
                icon={<Undo />}
                label={props.t('Undo')}
                onClick={handleUndoClick(item)}
              />,
            ];
          } else {
            if (isallow) {
              return [
                <Tooltip title={props.t('Delete')} placement="top" key={`delete-${item.id}`}>
                  <GridActionsCellItem
                    icon={<DeleteIcon />}
                    label={props.t('Delete')}
                    onClick={() => handleDeleteClick(item)}
                  />
                </Tooltip>,
                <Tooltip title={props.t('Download')} placement="top" key={`dwn-${item.id}`}>
                  <GridActionsCellItem
                    icon={<Download />}
                    label={props.t('Download')}
                    onClick={() => handleDownloadClick(item)}
                  />
                </Tooltip>,
                <Tooltip title={props.t('Preview')} placement="top" key={`prv-${item.id}`}>
                  <GridActionsCellItem
                    icon={<Preview />}
                    label={props.t('Preview')}
                    onClick={() => handlePreviewClick(item)}
                  />
                </Tooltip>,
              ];
            } else {
              return [
                <Tooltip title={props.t('Download')} placement="top" key={`dwn-${item.id}`}>
                  <GridActionsCellItem
                    icon={<Download />}
                    label={props.t('Download')}
                    onClick={() => handleDownloadClick(item)}
                  />
                </Tooltip>,
                <Tooltip title={props.t('Preview')} placement="top" key={`prv-${item.id}`}>
                  <GridActionsCellItem
                    icon={<Preview />}
                    label={props.t('Preview')}
                    onClick={() => handlePreviewClick(item)}
                  />
                </Tooltip>,
              ];
            }
          }
        },
      },
    ],
    [props.t, isallow, file_ven]
  );

  return (
    <>
      {isLoad ? (
        <Skeleton variant="rectangular" width={1000} height={200} />
      ) : (
        <DataGridFile
          autoHeight
          rows={file_ven}
          columns={columns}
          getRowClassName={(params) => {
            if (params.row.method == 'delete') {
              return 'row-delete';
            } else {
              return 'row-idle';
            }
          }}
        />
      )}
      {/* <DataGridFile
        autoHeight
        rows={file_ven}
        columns={columns}
        getRowClassName={(params) => {
          if (params.row.method == 'delete') {
            return 'row-delete';
          } else {
            return 'row-idle';
          }
        }}
      /> */}
      <Snackbar
        open={sbarOpen}
        autoHideDuration={3000}
        onClose={onCloseBar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={fetchStat.stat ? fetchStat.stat : 'info'}>
          {fetchStat.message ? fetchStat.message : 'test'}
        </Alert>
      </Snackbar>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loaderOpen}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}
