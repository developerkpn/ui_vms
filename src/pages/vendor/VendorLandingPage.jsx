import { useForm } from 'react-hook-form';
import { Box, Button, Tab, Tabs, Dialog } from '@mui/material';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import { useSession } from 'src/provider/sessionProvider';
import { useCallback, useEffect, useState } from 'react';
import DetailTab from './DetailTab';
import DetailBank from './DetailBank';
import useToggleTab from 'src/hooks/useToggleTab';
import { useNavigate } from 'react-router-dom';
import { useSnackBar } from 'src/provider/SnackbarProvider';
import useTimeout from 'src/hooks/useTimeout';
import OutstandingRequestEdit from './OutstandingRequestEdit';
import { LoadingButton } from '@mui/lab';

export default function VendorLandingPage() {
  const axiosPrivate = useAxiosPrivate();
  const { openSnackbar } = useSnackBar();
  const [isloading, setLoading] = useState(false);
  const { setHookTimeout } = useTimeout();
  const navigate = useNavigate();
  const { session } = useSession();
  const [openDialog, setOpenDialog] = useState(false);
  const [verTab, setVer] = useState({
    detail: '0',
    bank: '0',
  });
  const { tabState, handleChange, listTab } = useToggleTab({
    init: 'detail',
    listtab: [
      { value: 'detail', label: 'Detail' },
      { value: 'bank', label: 'Bank Info' },
    ],
  });

  const modalButtonAction = useCallback(
    async (action) => {
      switch (action) {
        case 'detail':
          setLoading(true);
          try {
            const { data } = await axiosPrivate.post(`/ticeddet/neweditdet`, {
              ven_id: session.user_id,
            });
            openSnackbar('success', data.message);
            setHookTimeout(() => navigate(`/dashboard/editreq/form?id=${data.data.id_ticket}`), 500);
          } catch (error) {
            console.error(error);
            openSnackbar('error', error.response?.data.message);
          } finally {
            setLoading(false);
          }
          break;
        case 'bank':
          openSnackbar('success', 'Requested Bank');
          break;
      }
    },
    [session]
  );

  const { control, getValues, reset, watch } = useForm({
    defaultValues: {
      ven_code: '',
      title: '',
      local_ovs: '',
      name_1: '',
      street_1: '',
      street_2: '',
      street_3: '',
      street_4: '',
      country: '',
      postal: '',
      city: '',
      telf1: '',
      fax: '',
      email: '',
      npwp: '',
      pay_mthd: '',
      pay_term: '',
      banks: [],
      files: [],
    },
  });

  useEffect(() => {
    (async () => {
      const { data } = await axiosPrivate.get(`/vendor/simple?ven_id=${session.user_id}`);
      reset({
        ...data.detail,
        files: data.files,
        banks: data.banks,
      });
      setVer({
        detail: data.version.vendor,
        bank: data.version.bank,
      });
    })();
  }, []);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: '0 0 0 0' }}>{watch('ven_code')}</h2>
        <Button
          variant="contained"
          onClick={(e) => {
            setOpenDialog(true);
          }}
        >
          Request Change
        </Button>
      </Box>
      <OutstandingRequestEdit />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItem: 'center' }}>
        <Tabs value={tabState} onChange={handleChange}>
          {listTab.map((item) => (
            <Tab value={item.value} label={item.label} />
          ))}
        </Tabs>
        <p>{`last version :   ${verTab[tabState]}`}</p>
      </Box>
      <Box sx={{ heigth: '100%', overflowX: 'scroll', flexGrow: 1 }}>
        {tabState === 'detail' && <DetailTab control={control} getValues={getValues} />}
        {tabState === 'bank' && <DetailBank control={control} getValues={getValues} />}
      </Box>
      <Dialog
        open={openDialog}
        onClose={(e) => {
          setOpenDialog(false);
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', p: 3, gap: 1 }}>
          <h2 style={{ padding: '0 0 0 0' }}>Create Form Request Change</h2>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <LoadingButton
              variant="contained"
              onClick={(e) => {
                modalButtonAction('detail');
              }}
              loading={isloading}
            >
              Change Detail
            </LoadingButton>
            <LoadingButton
              variant="contained"
              onClick={(e) => {
                modalButtonAction('bank');
              }}
              loading={isloading}
            >
              Change Bank Info
            </LoadingButton>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
