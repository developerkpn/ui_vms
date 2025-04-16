import {
  Dialog,
  DialogTitle,
  Box,
  DialogActions,
  Button,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import { TextFieldComp } from "./TextFieldComp";
import { useForm, FormProvider } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import useSessionStore from "src/store/useSessionStore";
import { LoadingButton } from "@mui/lab";

export default function ModalCreateBankCG({
  swiftcode,
  bankname,
  openModal,
  handleClose,
  setModalopen,
  typepost,
  params,
  setValue,
  fieldName,
}) {
  const user_id = useSessionStore(state => state.user_id);
  const axiosPrivate = useAxiosPrivate();
  const defaultvalue = {
    swiftcode: "",
    bankname: "",
  };
  const methods = useForm({
    defaultValues: defaultvalue,
    shouldUnregister: false,
  });
  const [btnClicked, setBtnclicked] = useState(false);

  useEffect(() => {
    methods.reset({
      swiftcode: swiftcode,
      bankname: bankname,
    });
  }, [openModal]);
  const submitBank = async values => {
    setBtnclicked(true);
    try {
      const submitForm = await axiosPrivate.post(`/master/addbank`, {
        ...values,
        type: typepost,
        created_by: user_id,
        source: "form",
        bu: "CG",
      });
      const newValue = {
        value: submitForm.data.swiftcode,
        label: `${submitForm.data.name} (${submitForm.data.swiftcode}) (new)`,
      };
      setValue(fieldName, newValue);
      const { id, row, field } = params;
      setModalopen(false);
      setBtnclicked(false);
    } catch (error) {
      alert(error.message);
      setModalopen(false);
      setBtnclicked(false);
    }
  };

  return (
    <>
      <Dialog maxWidth="xl" open={openModal} onClose={handleClose}>
        <DialogTitle>Add new bank</DialogTitle>
        <FormProvider {...methods} key={"formmodalcreatebank"}>
          <form key={2} onSubmit={methods.handleSubmit(submitBank)}>
            <Box
              sx={{
                width: 800,
                height: "100%",
                padding: 3,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "row", gap: 2 }}>
                <TextFieldComp
                  name="swiftcode"
                  label="Swift Code"
                  control={methods.control}
                  rules={{
                    required: "Please insert this field",
                    maxLength: {
                      value: 11,
                      message: "Length exceeded 10 characters",
                    },
                  }}
                />
                <TextFieldComp
                  name="bankname"
                  label="Bank Name"
                  control={methods.control}
                  rules={{ required: "Please insert this field" }}
                />
              </Box>
            </Box>

            <DialogActions>
              <Button sx={{ width: 120, m: 1 }} color="secondary" onClick={handleClose}>
                <Typography>Cancel</Typography>
              </Button>
              <LoadingButton
                sx={{ width: 120, m: 1 }}
                variant="contained"
                type="submit"
                loading={btnClicked}
              >
                <Typography>Submit</Typography>
              </LoadingButton>
            </DialogActions>
          </form>
        </FormProvider>
      </Dialog>
    </>
  );
}
