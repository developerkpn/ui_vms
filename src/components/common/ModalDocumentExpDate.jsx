import { Dialog, DialogTitle, Box, IconButton, DialogActions, Button, Paper } from "@mui/material";
import moment from "moment";
import DatePickerComp from "./DatePickerCompMoment";
import { PreviewOutlined } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { validate } from "uuid";
import useSessionStore from "src/store/useSessionStore";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { useSnackBar } from "src/provider/SnackbarProvider";
import { useMemo, useState, useEffect } from "react";
import { LoadingButton } from "@mui/lab";

export default function ModalDocumentExpDate({
  setFileStaged,
  sendDataParent,
  inTypes,
  idParent,
  open,
  setOpen,
  tempFile,
  setTempfile,
  t,
}) {
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPrevLoad] = useState(false);
  const { openSnackbar } = useSnackBar();
  const axiosPrivate = useAxiosPrivate();
  const user_id = useSessionStore(state => state.user_id);
  const onModalClose = () => {
    setOpen(false);
    setTempfile(null);
  };

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      expiry_date: moment().add(1, "day"),
    },
  });

  const ui_file_data = useMemo(() => {
    if (Array.isArray(tempFile)) {
      return tempFile[0];
    }
    return tempFile;
  }, [tempFile]);

  useEffect(() => {
    console.log(tempFile);
    if (tempFile && !Array.isArray(tempFile)) {
      const splittedDt = tempFile?.date.split("-");
      reset({ expiry_date: moment(`${splittedDt[2]}-${splittedDt[1]}-${splittedDt[0]}`) });
    }
  }, [tempFile]);

  const title = useMemo(() => {
    if (Array.isArray(tempFile)) {
      return `Set Expiry Date ${inTypes.value}`;
    } else {
      return `Edit Expiry Date ${tempFile?.file_type}`;
    }
  }, [tempFile]);

  const onUploadFile = async value => {
    if (Array.isArray(tempFile)) {
      let fd = new FormData();
      fd.append("file_atth", tempFile[0]);
      fd.append("method", "insert");
      fd.append("file_type", inTypes.key);
      fd.append("created_by", user_id);
      fd.append("desc_file", inTypes.value);
      fd.append("ven_id", idParent);
      fd.append("expired_date", value.expiry_date.format("YYYY-MM-DD"));
      try {
        setLoading(true);
        const { data } = await axiosPrivate.post("/vendor/uploadTemp", fd);
        const uploaded = data.data;
        const dataUploaded = {
          ...uploaded,
          id: uploaded.file_id,
          desc_file: t(uploaded.desc_file),
        };

        setFileStaged(prev => {
          sendDataParent([...prev, dataUploaded]);
          return [...prev, dataUploaded];
        });
        openSnackbar("success", "File Uploaded");
        setOpen(false);
        setTempfile(null);
      } catch (error) {
        console.error(error);
        openSnackbar("error", error.response.data.message);
      } finally {
        setLoading(false);
      }
    } else {
      let payload = {
        file_id: tempFile.id,
        date: value.expiry_date.format("YYYY-MM-DD"),
        source: tempFile.source,
      };
      try {
        setLoading(true);
        const { data } = await axiosPrivate.post("/vendor/editexpdate", payload);
        setFileStaged(prev => {
          const newFiles = prev.map(item => {
            if (item.id == tempFile.id) {
              return {
                ...item,
                expired_date: value.expiry_date.format("DD-MM-YYYY"),
              };
            } else {
              return item;
            }
          });
          sendDataParent(newFiles);
          return newFiles;
        });
        openSnackbar("success", `${data.data.file_name} expiry date has successfully edited`);
        setOpen(false);
      } catch (error) {
        console.error(error);
        openSnackbar("error", error.response.data.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const previewFile = async fileObj => {
    let tmppath = null;
    if (Array.isArray(tempFile)) {
      tmppath = URL.createObjectURL(fileObj);
    } else {
      try {
        setPrevLoad(true);
        const { data } = await axiosPrivate.get(`/vendor/singlefile/${tempFile.name}`, {
          responseType: "blob",
        });
        const file = new Blob([data], { type: "application/pdf" });
        tmppath = URL.createObjectURL(file);
      } catch (error) {
        console.error(error);
        openSnackbar("error", "Error");
        return;
      } finally {
        setPrevLoad(false);
      }
    }
    window.open(tmppath);
  };

  return (
    <Dialog open={open} onClose={() => onModalClose} size="xl">
      <DialogTitle>{title}</DialogTitle>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          p: 3,
        }}
      >
        <Paper variant="outlined">
          <Box
            sx={{
              px: 2,
              py: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p>{ui_file_data && ui_file_data.name}</p>
            <LoadingButton
              sx={{
                minWidth: "30px",
                height: "30px",
              }}
              loading={previewLoading}
              color="inherit"
              onClick={() => previewFile(tempFile[0])}
            >
              <PreviewOutlined />
            </LoadingButton>
          </Box>
        </Paper>
        <DatePickerComp
          name="expiry_date"
          label="Expiry Date"
          control={control}
          rules={{
            required: "Expiry Date is required",
            validate: value => {
              let toDateFmt = moment(value.format("YYYY-MM-DD"));
              let now = moment();
              return toDateFmt.isAfter(now) ? true : "Back date and current date is not allowed";
            },
          }}
          inputFormat="DD/MM/YYYY"
          minDate={moment()}
          additional={{
            popper: {
              placement: "top",
            },
          }}
        />
      </Box>
      <DialogActions>
        <Button color="error" onClick={() => onModalClose()}>
          Cancel
        </Button>
        <LoadingButton onClick={handleSubmit(onUploadFile)} loading={loading}>
          Upload
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
