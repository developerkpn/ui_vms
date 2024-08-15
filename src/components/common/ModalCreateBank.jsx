import { Dialog, DialogTitle, Box, DialogActions, Button, Typography, Snackbar, Alert } from '@mui/material';
import { TextFieldComp } from './TextFieldComp';
import { useForm, FormProvider } from 'react-hook-form';
import AutoCompleteSelect from './AutoCompleteSelect';
import { useEffect, useRef, useState } from 'react';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import axios from 'axios';
import { useSession } from 'src/provider/sessionProvider';
import { LoadingButton } from '@mui/lab';

export default function ModalCreateBank({
  swiftcode,
  bankname,
  address1,
  address2,
  address3,
  country_code,
  limited,
  openModal,
  handleClose,
  setModalopen,
  typepost,
  params,
  setValue,
  fieldName,
}) {
  const { session } = useSession();
  const axiosPrivate = useAxiosPrivate();
  const defaultvalue = {
    swiftcode: '',
    bankname: '',
    address1: '',
    address2: '',
    address3: '',
    country: '',
  };
  const methods = useForm({ defaultValues: defaultvalue, shouldUnregister: false });
  const countries = useRef([{ value: '', label: '' }]);
  const [btnClicked, setBtnclicked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const dynaCountry = async () => {
      try {
        const country = await axiosPrivate.post(`/master/country`);
        const result = country.data.data;
        countries.current = result.data.map((item) => ({
          value: item.country_code,
          label: `${item.country_code} - ${item.country_name}`,
        }));
      } catch (err) {
        alert(err.stack);
      }
    };
    dynaCountry();
    methods.reset({
      swiftcode: swiftcode,
      bankname: bankname,
      address1: address1,
      address2: address2,
      address3: address3,
      country: country_code,
    });
  }, [openModal]);
  const submitBank = async (values) => {
    setBtnclicked(true);
    try {
      const submitForm = await axiosPrivate.post(`/master/addbank`, {
        ...values,
        type: typepost,
        created_by: session.user_id,
        source: 'form',
      });
      const newValue = {
        value: submitForm.data.id,
        label: `${submitForm.data.name} (${submitForm.data.swiftcode}) -  (new)`,
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
        <FormProvider {...methods} key={'formmodalcreatebank'}>
          <form key={2} onSubmit={methods.handleSubmit(submitBank)}>
            <Box sx={{ width: 800, height: '100%', padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
                <TextFieldComp
                  name="swiftcode"
                  label="Swift Code"
                  control={methods.control}
                  rules={{
                    required: 'Please insert this field',
                    maxLength: { value: 11, message: 'Length exceeded 10 characters' },
                  }}
                />
              </Box>
              <TextFieldComp
                name="bankname"
                label="Bank Name"
                control={methods.control}
                rules={{ required: 'Please insert this field' }}
              />
              {!limited && (
                <TextFieldComp
                  name="address1"
                  label="Address 1"
                  control={methods.control}
                  rules={{
                    required: 'Please insert this field',
                    maxLength: { value: 200, message: 'Exceeded 200 characters' },
                  }}
                />
              )}
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
                <AutoCompleteSelect
                  name="country"
                  label="Country"
                  control={methods.control}
                  options={countries.current}
                />
                {!limited && (
                  <>
                    <TextFieldComp
                      name="address2"
                      label="Address 2"
                      control={methods.control}
                      rules={{
                        required: 'Please insert this field',
                        maxLength: { value: 50, message: 'Exceeded 50 characters' },
                      }}
                    />
                    <TextFieldComp
                      name="address3"
                      label="Address 3"
                      control={methods.control}
                      rules={{
                        required: 'Please insert this field',
                        maxLength: { value: 50, message: 'Exceeded 50 characters' },
                      }}
                    />
                  </>
                )}
              </Box>
            </Box>

            <DialogActions>
              <Button sx={{ width: 120, m: 1 }} color="secondary" onClick={handleClose}>
                <Typography>Cancel</Typography>
              </Button>
              <LoadingButton sx={{ width: 120, m: 1 }} variant="contained" type="submit" loading={btnClicked}>
                <Typography>Submit</Typography>
              </LoadingButton>
            </DialogActions>
          </form>
        </FormProvider>
      </Dialog>
    </>
  );
}
