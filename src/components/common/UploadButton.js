import {
  Box,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Stack,
  Snackbar,
  Alert as MuiAlert,
  Tooltip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useState, forwardRef, useEffect } from 'react';
import VenFileTable from '../FormVendor/VenFileTable';
import { useSession } from 'src/provider/sessionProvider';
import { LoadingButton } from '@mui/lab';
import { Help } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const Alert = forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const UploadButton = forwardRef(function UploadButton(
  {
    inputTypes,
    onChildDataChange,
    iniData,
    idParent,
    allow,
    loadData,
    deleteFile,
    requiredFiles,
    fileCheck,
    langCode,
    t,
    ...props
  },
  ref
) {
  const { session } = useSession();
  const [typeFile, setTypeFile] = useState(0);
  const [openTooltip, setOpenTooltip] = useState(false);
  const [statUpload, setStatUpload] = useState({ stat: false, type: '', message: '' });
  const [fileStaged, setFileStaged] = useState([]);
  const inTypes = [{ key: 'pleaseSelect', value: 'Please Select Item' }, ...inputTypes];
  const [btnClicked, setBtnclick] = useState(false);
  const [titleTooltip, setTooltip] = useState({ index: 0, value: '' });
  const theme = useTheme();

  const sendDataParent = (file_ven) => {
    let items = [];
    file_ven.map((item) => {
      let temp = { ...item, desc_file: item.desc_file };
      delete temp.id;
      items.push(temp);
    });
    onChildDataChange(items);
  };

  useEffect(() => {
    if (Object.keys(iniData).length != 0) {
      const covtData = [];
      iniData.map((item) => {
        covtData.push({ ...item, method: '', id: item.file_id, desc_file: item.desc_file });
      });
      setFileStaged([...covtData]);
      sendDataParent([...covtData]);
    }
  }, [iniData]);

  useEffect(() => {
    console.log('t changed');
    if (fileStaged.length > 0) {
      const covtData = fileStaged.map((item) => ({ ...item, desc_file: item.desc_file }));
      console.log(covtData);
      setFileStaged(covtData);
      sendDataParent(covtData);
    }
    setTooltip((prev) => ({
      index: prev.index,
      value: inTypes[prev.index].help,
    }));
  }, [iniData, t, inputTypes, langCode]);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setStatUpload({ ...statUpload, stat: false });
  };

  const handleUpFromTb = (newItem) => {
    // console.log(newItem);
    setFileStaged(newItem);
    sendDataParent(newItem);
  };

  const openFileGuide = () => {
    window.open(
      props.ticketState === 'INIT'
        ? `${process.env.REACT_APP_URL_BE}static/ATTACHMENT_GUIDE_VENDOR_WEB_(VENDOR).pdf`
        : `${process.env.REACT_APP_URL_BE}static/ATTACHMENT_GUIDE_VENDOR_WEB_(USER).pdf`
    );
  };

  const handleValidate = (event) => {
    if (typeFile == 0) {
      setStatUpload({ stat: true, type: 'error', message: 'Type File not Chosen' });
      event.preventDefault();
      return;
    }
  };
  const handleUpload = async (event) => {
    setBtnclick(true);
    try {
      const selectedFile = [...event.target.files];
      let form = new FormData();
      selectedFile.forEach((item, idx) => {
        form.append('file_atth', item, item.name);
      });
      form.append('method', 'insert');
      form.append('file_type', inTypes[typeFile].key);
      form.append('created_by', session.user_id);
      form.append('desc_file', inTypes[typeFile].value);
      form.append('ven_id', idParent);
      const response = await fetch(`${process.env.REACT_APP_URL_LOC}/vendor/uploadTemp`, {
        method: 'POST',
        body: form,
      });
      let items = await response.json();
      // console.log(items);
      if (items.status == 200) {
        const dataUploaded = items.data.map((item) => ({ ...item, id: item.file_id, desc_file: t(item.desc_file) }));
        // console.log(dataUploaded);
        setFileStaged([...fileStaged, ...dataUploaded]);
        sendDataParent([...fileStaged, ...dataUploaded]);
        // console.log(fileStaged);
        setStatUpload({ stat: true, type: 'success', message: 'File Upload Success' });
        setBtnclick(false);
      } else {
        setStatUpload({ stat: true, type: 'error', message: items.message });
        setBtnclick(false);
      }
      document.getElementById('fileUpload').value = null;
    } catch (err) {
      setBtnclick(false);
      setStatUpload({ stat: true, type: 'error', message: err.message });
      console.error(err);
    }
  };

  const handleChangeType = (e) => {
    if (inTypes[e.target.value].help && inTypes[e.target.value].help !== '') {
      setTooltip({ index: e.target.value, value: inTypes[e.target.value].help });
      setOpenTooltip(true);
    } else {
      setOpenTooltip(false);
    }
    setTypeFile(e.target.value);
  };
  return (
    <>
      <Stack spacing={2}>
        <Box style={{ display: 'flex', gap: 3, alignContent: 'center' }}>
          <p style={{ margin: '0 0 0 0', color: 'red' }}>Maximal File Size : 10 Mb</p>
        </Box>
        <Box sx={{ display: 'flex', gap: 3, alignContent: 'center', pb: 2 }}>
          <p>{t('Attachment File Guide')} :</p>
          <Tooltip title={<h4>Attachment File Guide</h4>}>
            <IconButton color="primary" onClick={openFileGuide}>
              <Help fontSize="large" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ height: 50, display: 'flex', alignItems: 'center', gap: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
            <FormControl sx={{ width: '20rem' }}>
              <InputLabel htmlFor="fileType" id="fileType-label">
                <Typography>Type File</Typography>
              </InputLabel>
              <Select
                label="Type File *"
                id="fileType"
                labelId="fileType-label"
                onChange={handleChangeType}
                value={typeFile}
                disabled={!allow}
              >
                {inTypes.map((item, idx) => (
                  <MenuItem value={idx} key={item.key}>
                    {item.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip
              title={<p style={{ fontSize: '10pt' }}>{`${titleTooltip.value}`}</p>}
              open={openTooltip}
              placement="right"
            >
              <span>
                <LoadingButton
                  component="label"
                  startIcon={<UploadFileIcon />}
                  variant="outlined"
                  sx={{ height: 50, width: 300 }}
                  onClick={handleValidate}
                  disabled={!allow || (fileCheck && fileCheck[inTypes[typeFile].key] !== undefined)}
                  loading={btnClicked}
                  ref={ref}
                >
                  Upload
                  <input type="file" id="fileUpload" name="fileUpload" multiple hidden onChange={handleUpload} />
                </LoadingButton>
              </span>
            </Tooltip>
          </div>
        </Box>
        <Snackbar
          open={statUpload.stat}
          onClose={handleClose}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert severity={statUpload.type} onClose={handleClose}>
            {statUpload.message}
          </Alert>
        </Snackbar>
        <VenFileTable
          initData={fileStaged}
          upTable={handleUpFromTb}
          isallow={allow}
          isLoad={loadData}
          delFile={deleteFile}
          t={t}
        />
        {requiredFiles.length > 0 && (
          <>
            <p style={{ color: 'red' }}>
              Files are required : {requiredFiles.map((item) => t(item.message)).join(', ')}
            </p>
          </>
        )}
      </Stack>
    </>
  );
});

export default UploadButton;
