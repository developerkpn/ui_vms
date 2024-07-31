import { DataGrid } from '@mui/x-data-grid';
import SearchBar from '@mkyy/mui-search-bar';
import { useEffect, useState, useRef } from 'react';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import axios from 'axios';
import AutoCompleteSelect from 'src/components/common/AutoCompleteSelect';
import LoadingButton from '@mui/lab/LoadingButton';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  Typography,
  Snackbar,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { TextFieldComp } from 'src/components/common/TextFieldComp';
import { useForm } from 'react-hook-form';

export default function ListMasterBank() {
  const { control, handleSubmit, clearErrors, reset } = useForm();
  const axiosPrivate = useAxiosPrivate();
  const column = [
    {
      field: 'country',
      type: 'string',
      headerName: 'Country',
      flex: 0.1,
      sortable: false,
    },
    {
      field: 'bank_key',
      type: 'string',
      headerName: 'Bank Key',
      flex: 0.1,
      sortable: false,
    },
    {
      field: 'bank_code',
      type: 'string',
      headerName: 'Swift Code',
      flex: 0.1,
      sortable: false,
    },
    {
      field: 'bank_name',
      type: 'string',
      headerName: 'Bank Name',
      flex: 0.1,
      sortable: false,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      renderCell: (item) => {
        let Buttons = [];
        Buttons.push(
          <Tooltip title="Edit">
            <IconButton onClick={handleButtonAction('Edit', item.row)}>
              <Edit />
            </IconButton>
          </Tooltip>
        );
        Buttons.push(
          <Tooltip title="Delete">
            <IconButton onClick={handleButtonAction('Delete', item.row)}>
              <Delete />
            </IconButton>
          </Tooltip>
        );
        return Buttons;
      },
    },
  ];

  const overrides = {
    '& .MuiDataGrid-main': {
      width: 0,
      minWidth: '95%',
    },
  };

  const [params, setParams] = useState({
    page: 0,
    maxPage: 10,
    que: '',
  });

  const [rows, setRows] = useState({
    isLoading: false,
    rows: [{ id: '', swift_code: '', bank_key: '', bank_code: '', bank_name: '', country: '' }],
  });
  const [typepost, setType] = useState('');

  const [formStat, setFormstat] = useState({
    stat: false,
    type: 'info',
    message: '',
  });

  const [modalOpen, setModalopen] = useState(false);
  const [btnClicked, setBtnclick] = useState(false);
  const id = useRef();

  const countries = useRef({ value: '', label: '' });

  const handleCloseModal = () => {
    setModalopen(false);
    clearErrors();
  };

  const handleSnackClose = () => {
    setFormstat({ stat: false, type: 'info', message: '' });
  };

  const handleButtonAction = (type, row) => async (e) => {
    if (type === 'Edit') {
      setType('update');
      reset({
        swiftcode: row.bank_code,
        bankkey: row.bank_key,
        bankname: row.bank_name,
        address1: row.address_1,
        address2: row.address_2,
        address3: row.address_3,
        country: { value: row.country, label: `${row.country} - ${row.country_name}` },
      });
      id.current = row.id;
      setModalopen(true);
    } else if (type === 'Delete') {
      if (confirm('Are you sure want to delete ' + row.bank_name + '?')) {
        try {
          const deleteBank = await axiosPrivate.post(`/master/deletebank`, {
            id: row.id,
          });
          setFormstat({ stat: true, type: 'success', message: `${deleteBank.data.name} is deleted` });
          setParams({ page: 0, maxPage: params.maxPage, que: params.que });
        } catch (error) {
          setFormstat({ stat: true, type: 'error', message: error.message });
        }
      }
    }
  };

  const [totallen, setTotal] = useState(0);
  const requestSearch = (searchedVal) => {
    const getBankdt = async () => {
      const getBankdata = await axiosPrivate.post(`/master/ssrbank`, {
        page: 0,
        maxPage: params.maxPage,
        que: searchedVal.toLowerCase(),
      });
      setRows({ isLoading: false, rows: getBankdata.data.data });
      setTotal((prev) => (getBankdata.data.allrow !== undefined ? getBankdata.data.allrow : prev));
    };
    getBankdt();
    setParams({ page: 0, maxPage: params.maxPage, que: searchedVal.toLowerCase() });
  };

  const cancelSearch = () => {
    requestSearch('');
  };

  const submitBank = async (values) => {
    setBtnclick(true);
    try {
      const submitForm = await axiosPrivate.post(`/master/addbank`, {
        ...values,
        country: values.country.value,
        type: typepost,
        id: id.current,
      });
      setFormstat({
        stat: true,
        type: 'success',
        message: `${submitForm.data.name} is successfully ${typepost === 'insert' ? 'added' : 'updated'}`,
      });
      setModalopen(false);
      setBtnclick(false);
    } catch (error) {
      setFormstat({
        stat: true,
        type: 'error',
        message: error.message,
      });
      setModalopen(false);
      setBtnclick(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setRows({ ...rows, isLoading: true });
    const getBankdt = async () => {
      try {
        const getBankdata = await axiosPrivate.post(`/master/ssrbank`, params, {
          signal: controller.signal,
        });
        setRows({ isLoading: false, rows: getBankdata.data.data });
        setTotal((prev) => (getBankdata.data.allrow !== undefined ? getBankdata.data.allrow : prev));
      } catch (err) {
        console.error(err);
      }
    };
    getBankdt();
    return () => {
      controller.abort();
    };
  }, [params, btnClicked]);

  useEffect(() => {
    const controller = new AbortController();
    const dynaCountry = async () => {
      try {
        const country = await axios.post(
          `${process.env.REACT_APP_URL_LOC}/master/country`,
          {},
          { signal: controller.signal }
        );
        const result = country.data.data;
        countries.current = result.data.map((item) => ({
          value: item.country_code,
          label: `${item.country_code} - ${item.country_name}`,
        }));
      } catch (err) {
        console.error(err);
      }
    };
    dynaCountry();
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          sx={{ width: 180, height: 50, my: 2 }}
          onClick={() => {
            setType('insert');
            setModalopen(true);
            reset({
              swiftcode: '',
              bankkey: '',
              bankname: '',
              address1: '',
              address2: '',
              address3: '',
              country: '',
            });
          }}
        >
          + Add new bank
        </Button>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', margin: 1 }}>
        <SearchBar
          value={params.que}
          onChange={requestSearch}
          onCancelResearch={cancelSearch}
          onSearch={() => requestSearch(params.que)}
        />
      </Box>
      <DataGrid
        sx={overrides}
        rows={rows.rows}
        columns={column}
        rowCount={parseInt(totallen)}
        isLoading={rows.isLoading}
        disableColumnFilter
        disableColumnSelector
        disableDensitySelector
        pageSizeOptions={[10]}
        paginationModel={{ page: params.page, pageSize: params.maxPage }}
        paginationMode="server"
        onPaginationModelChange={(par) => {
          setParams({ ...params, page: par.page, maxPage: par.pageSize });
        }}
      />
      <Dialog maxWidth="xl" open={modalOpen} onClose={handleCloseModal}>
        <DialogTitle>Add new bank</DialogTitle>
        <form onSubmit={handleSubmit(submitBank)}>
          <Box sx={{ width: 800, height: '100%', padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
              <TextFieldComp
                name="swiftcode"
                label="Swift Code"
                control={control}
                rules={{
                  required: 'Please insert this field',
                  maxLength: { value: 10, message: 'Length exceeded 10 characters' },
                }}
                toUpperCase={true}
              />
              <TextFieldComp
                name="bankkey"
                label="Bank Key"
                control={control}
                rules={{
                  required: 'Please insert this field',
                  maxLength: { value: 10, message: 'Length exceeded 10 characters' },
                }}
                toUpperCase={true}
              />
            </Box>
            <TextFieldComp
              name="bankname"
              label="Bank Name"
              control={control}
              rules={{ required: 'Please insert this field' }}
              toUpperCase={true}
            />
            <TextFieldComp
              name="address1"
              label="Address 1"
              control={control}
              rules={{
                required: 'Please insert this field',
                maxLength: { value: 200, message: 'Exceeded 200 characters' },
              }}
              toUpperCase={true}
            />
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
              <AutoCompleteSelect name="country" label="Country" control={control} options={countries.current} />
              <TextFieldComp
                name="address2"
                label="Address 2"
                control={control}
                rules={{
                  maxLength: { value: 50, message: 'Exceeded 50 characters' },
                }}
                toUpperCase={true}
              />
              <TextFieldComp
                name="address3"
                label="Address 3"
                control={control}
                rules={{
                  maxLength: { value: 50, message: 'Exceeded 50 characters' },
                }}
                toUpperCase={true}
              />
            </Box>
          </Box>

          <DialogActions>
            <Button sx={{ width: 120, m: 1 }} color="secondary" onClick={handleCloseModal}>
              <Typography>Cancel</Typography>
            </Button>
            <LoadingButton sx={{ width: 120, m: 1 }} variant="contained" type="submit" loading={btnClicked}>
              <Typography>Submit</Typography>
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
      <Snackbar
        open={formStat.stat}
        onClose={handleSnackClose}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={formStat.type} onClose={handleSnackClose} variant="filled">
          {formStat.message}
        </Alert>
      </Snackbar>
    </>
  );
}
