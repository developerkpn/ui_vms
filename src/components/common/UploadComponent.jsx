import { Box, IconButton, Link, Stack, CircularProgress, Tooltip, Snackbar, Alert } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { UploadFile, Cancel } from '@mui/icons-material';
import { Controller } from 'react-hook-form';
import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';

const LinkFile = ({ file }) => {
  const handleOnClick = async (file) => {
    window.open(`${import.meta.env.VITE_URL_BE}static/${file.file_name}`);
  };

  return (
    <Link
      sx={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      onClick={(e) => {
        handleOnClick(file);
      }}
    >
      {file.file_name}
    </Link>
  );
};

const UploadComponent = ({
  control,
  name,
  clearField,
  setValue,
  fileType,
  id,
  rules,
  t,
  is_allow,
  tooltip,
  ...props
}) => {
  const [isLoading, setLoading] = useState(false);
  const axiosPrivate = useAxiosPrivate();
  const [formStat, setFormStat] = useState({
    stat: false,
    type: 'info',
    message: '',
  });

  const handleFormStatClose = () => {
    setFormStat({
      stat: false,
      type: 'info',
      message: '',
    });
  };
  const handleDeleteFile = async (file) => {
    if (confirm(`Are you sure want to delete ${file.file_name} ?`)) {
      setLoading(true);
      try {
        const { data } = await axiosPrivate.delete(`/vendor/delfile`, {
          data: {
            id: file.file_id,
          },
        });
        console.log(name);
        clearField(name, { defaultValue: null });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpload = async (e, onChange) => {
    const selectedFile = e.target.files[0];
    let form = new FormData();

    form.append('file_atth', selectedFile, selectedFile.name);
    form.append('file_type', fileType);
    form.append('ven_id', props.ven_id);
    form.append('bank_id', id);
    try {
      setLoading(true);
      const { data } = await axiosPrivate.post(`/vendor/uploadbankfile`, form);
      setFormStat({
        stat: true,
        type: 'success',
        message: 'File uploaded',
      });
      onChange({ file_name: data.file_name, file_id: data.file_id });
    } catch (err) {
      setFormStat({
        stat: true,
        type: 'error',
        message: err.response.data.message ?? err.message,
      });
      console.error(err);
    } finally {
      document.getElementById(name).value = null;
      setLoading(false);
    }
  };

  return (
    <>
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field: { onChange, value, ref }, fieldState: { error } }) => {
          let uploadComponent;
          if (value) {
            uploadComponent = (
              <Box
                sx={{ display: 'flex', flexShrink: 0, gap: 1, alignItems: 'center', width: '100%', maxWidth: '150px' }}
              >
                <LinkFile file={value} />
                {is_allow && (
                  <IconButton
                    disabled={isLoading}
                    onClick={(e) => {
                      handleDeleteFile(value);
                    }}
                  >
                    {isLoading ? <CircularProgress /> : <Cancel />}
                  </IconButton>
                )}
              </Box>
            );
          } else {
            uploadComponent = (
              <Tooltip title={t(tooltip)} placement="top">
                <Stack>
                  <LoadingButton
                    component="label"
                    startIcon={<UploadFile />}
                    variant="outlined"
                    loading={isLoading}
                    ref={ref}
                    color={error ? 'error' : 'primary'}
                  >
                    Upload
                    <input
                      type="file"
                      id={name}
                      name={name}
                      hidden
                      onChange={(e) => {
                        handleUpload(e, onChange);
                      }}
                    />
                  </LoadingButton>
                  {error && <p style={{ color: 'red' }}>{t(error?.message)}</p>}
                </Stack>
              </Tooltip>
            );
          }
          return uploadComponent;
        }}
      />
      <Snackbar
        open={formStat.stat}
        onClose={handleFormStatClose}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={formStat.type} onClose={handleFormStatClose} variant="filled">
          {formStat.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default UploadComponent;
