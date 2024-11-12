import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Delete as DeleteIcon, Undo, Download, Preview, UploadFile } from '@mui/icons-material';
import TableSimple from 'src/components/table/TableSimple';
import { createColumnHelper } from '@tanstack/react-table';
import {
  Alert as MuiAlert,
  Skeleton,
  Box,
  IconButton,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import { styled, lighten, darken, useTheme } from '@mui/material/styles';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import fileDownload from 'js-file-download';
import useFileStore from 'src/store/useFileStore';
import { useSnackBar } from 'src/provider/SnackbarProvider';
import { LoadingButton } from '@mui/lab';
import { v4 } from 'uuid';

const ProgressButton = styled(CircularProgress)(({ theme }) => ({
  color: theme.palette.grey[500],
}));

const columnHelper = createColumnHelper();

const BoxDelete = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  width: '100%',
  height: '100%',
}));

const DeleteStage = ({ onClickFun }) => {
  const { openSnackbar } = useSnackBar();
  const [isLoad, setLoad] = useState(false);
  return (
    <Tooltip title="Delete">
      <span>
        <IconButton
          sx={{ color: 'inherit' }}
          disabled={isLoad}
          onClick={async (e) => {
            setLoad(true);
            try {
              await onClickFun();
            } catch (error) {
              openSnackbar(error.response.data.message);
            } finally {
              setLoad(false);
            }
          }}
        >
          {isLoad ? <ProgressButton size={20} /> : <DeleteIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
};

const UndoStage = ({ onClickFun }) => {
  const [isLoad, setLoad] = useState(false);
  return (
    <Tooltip title="Undo Delete">
      <span>
        <IconButton
          sx={{ color: 'inherit' }}
          disabled={isLoad}
          onClick={async (e) => {
            setLoad(true);
            try {
              await onClickFun();
            } catch (error) {
              let errormsg = error.response.data.message;
              openSnackbar(errormsg);
            } finally {
              setLoad(false);
            }
          }}
        >
          {isLoad ? <ProgressButton size={20} /> : <Undo />}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default function VenFileTablev2({ initFiles, setValue, getValues, errors, ...props }) {
  const theme = useTheme();
  const axiosPrivate = useAxiosPrivate();
  const { openSnackbar } = useSnackBar();
  const uploadButtonRef = useRef();
  const [isLoad, setLoad] = useState(false);
  const [selectedFileType, setSelFileType] = useState('');
  const [disabledBtn, setDisabledBtn] = useState(false);
  const files = useFileStore((state) => state.files);
  const setFiles = useFileStore((state) => state.setFiles);
  const fileTypes = useFileStore((state) => state.fileTypes);
  const flagDelete = useFileStore((state) => state.flagDelete);
  const unFlagDelete = useFileStore((state) => state.unFlagDelete);
  const addFile = useFileStore((state) => state.addFile);
  const setDelStgFiles = useFileStore((state) => state.setDelStgFiles);
  const rmDelStgFiles = useFileStore((state) => state.rmDelStgFiles);
  const deleteFile = useFileStore((state) => state.deleteFile);
  const delStgFiles = useFileStore((state) => state.delStgFiles);
  const setFileTypes = useFileStore((state) => state.setFileTypes);
  // console.log(isallow);

  useEffect(() => {
    if (initFiles) {
      (async () => {
        setLoad(true);
        try {
          setFiles(initFiles);
        } catch (error) {
          console.error(error);
          openSnackbar(error.response.data.message ?? error.message);
        } finally {
          setLoad(false);
        }
      })();
    }
  }, [initFiles]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('desc_file', {
        header: 'File Type',
        cell: ({ getValue, row }) => {
          return getValue();
        },
      }),
      columnHelper.accessor('file_name', {
        header: 'File Name',
        cell: ({ getValue }) => {
          return getValue();
        },
      }),
      columnHelper.display({
        id: 'action',
        header: 'Action',
        cell: ({ row }) => {
          const curMethod = row.original.method;
          let functionAction;
          if (row.original.source !== 'local') {
            if (row.original.method === 'new') {
              functionAction = async () => {
                await deleteFile(row.original, axiosPrivate);
              };
            } else if (row.original.method === 'delete') {
              functionAction = async () => {
                try {
                  await unFlagDelete(row.original.id, axiosPrivate);
                  rmDelStgFiles(row.original);
                  setValue(`files.${row.original.file_type}`, row.original.file_name);
                } catch (error) {
                  console.error(error);
                  if (error.response) {
                    openSnackbar('error', error.response.data.message);
                  } else {
                    openSnackbar('error', error.message);
                  }
                }
              };
            } else {
              functionAction = () => {
                flagDelete(row.original.id);
                setDelStgFiles(row.original);
                setValue(`files.${row.original.file_type}`, '');
              };
            }
          } else {
            functionAction = async () => {
              try {
                await deleteFile(row.original);
              } catch (error) {
                console.error(error);
                if (error.response) {
                  openSnackbar('error', error.response.data.message);
                } else {
                  openSnackbar('error', error.message);
                }
              }
            };
          }
          if (curMethod === 'delete') {
            return <UndoStage onClickFun={functionAction} />;
          } else {
            return <DeleteStage onClickFun={functionAction} />;
          }
        },
      }),
    ],
    []
  );

  const handleChangeFileTypeUpload = (value) => {
    setSelFileType(value);
  };

  useEffect(() => {
    if (getValues(`files.${selectedFileType}`)) {
      setDisabledBtn(true);
    } else {
      setDisabledBtn(false);
    }
  }, [files, selectedFileType]);

  const handleUpload = (e) => {
    if (getValues(`files.${selectedFileType}`)) {
      openSnackbar('error', 'Type file already exist, please mark as staged delete first to upload new file');
      e.preventDefault();
    }
    const uid = v4();
    const fileUpload = {
      id: uid,
      file_id: uid,
      file_name: e.target.files[0].name,
      file_type: selectedFileType,
      desc_file: fileTypes.find((item) => item.key === selectedFileType).value,
      method: 'new',
      source: 'local',
      file: e.target.files[0],
    };
    addFile(fileUpload);
    setValue(`files.${selectedFileType}`, fileUpload.file_name);
    uploadButtonRef.current.value = '';
  };

  const metaFun = useMemo(() => {
    return {
      getRowStyles: (row) => {
        if (row.original.method === 'delete') {
          return {
            backgroundColor: theme.palette.error.main,
            color: theme.palette.error.contrastText,
          };
        } else if (row.original.method === 'new') {
          return {
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.secondary.contrastText,
          };
        }
      },
    };
  }, [files]);

  return (
    <>
      {isLoad ? (
        <Skeleton variant="rectangular" width={'100%'} height={200} />
      ) : (
        <>
          <Box sx={{ display: 'flex', my: 2, alignContent: 'center', gap: 2 }}>
            <LoadingButton
              component="label"
              startIcon={<UploadFile />}
              variant="outlined"
              sx={{ width: 300 }}
              disabled={disabledBtn}
            >
              Set File
              <input
                ref={uploadButtonRef}
                type="file"
                id="fileUpload"
                name="fileUpload"
                hidden
                onChange={(e) => handleUpload(e)}
              />
            </LoadingButton>
            <FormControl sx={{ width: '20rem' }}>
              <InputLabel htmlFor="fileType" id="fileType-label">
                <p>Type File</p>
              </InputLabel>
              <Select
                label="Type File *"
                id="fileType"
                labelId="fileType-label"
                value={selectedFileType}
                onChange={(e) => handleChangeFileTypeUpload(e.target.value)}
              >
                {fileTypes.map((item) => (
                  <MenuItem value={item.key} key={item.key}>
                    {item.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          {errors && (
            <Box>
              <p style={{ color: 'red' }}>{`Files replacement required : ${Object.values(errors)
                .map((item) => item.message)
                .join(', ')}`}</p>
            </Box>
          )}

          <TableSimple rowsData={files} columns={columns} meta={metaFun} />
        </>
      )}
    </>
  );
}
