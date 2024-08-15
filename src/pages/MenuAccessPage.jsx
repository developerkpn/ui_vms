import { Grid, Typography, Container, Box, Button } from '@mui/material';
import TableMenuAccess from 'src/components/common/TableMenuAccess';
import { TextFieldComp } from 'src/components/common/TextFieldComp';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import { useSession } from 'src/provider/sessionProvider';
import LoadingButton from '@mui/lab/LoadingButton';

export default function MenuAccessPage() {
  const axiosPrivate = useAxiosPrivate();
  let dtAccess = [];
  const [btnClicked, setBtnclick] = useState(false);
  const [searchParams] = useSearchParams();
  const { session, setSession } = useSession();
  const defaultValues = {
    groupname: '',
  };
  const { handleSubmit, control, reset } = useForm({ defaultValues: defaultValues });
  const submitDt = async (data) => {
    setBtnclick(true);
    const insertedDt = {
      groupname: data.groupname,
      groupid: groupid ? groupid : '',
      accessmtx: dtAccess,
    };
    const getAuthorization = async () => {
      const getAuth = await axiosPrivate.post(`/user/authorization`, {
        group_id: session.groupid,
      });
      setSession({ ...session, ['permission']: getAuth.data });
    };
    try {
      const submission = await axiosPrivate.post(`/user/secmtx/submit`, insertedDt);
      getAuthorization();
      alert('Updated success');
      setBtnclick(false);
    } catch (error) {
      setBtnclick(false);
      alert(error);
    }
  };
  const accessDtUp = (newTb) => {
    dtAccess = newTb;
  };
  const [dtMenu, setdtMenu] = useState([]);
  const dataMenu = dtMenu;
  const groupid = searchParams.get('idgroup');
  useEffect(() => {
    const controller = new AbortController();
    const getSecMtx = async () => {
      const secMtx = await axiosPrivate.post(
        `/user/secmtx`,
        {
          groupid: groupid ? groupid : '',
        },
        { signal: controller.signal }
      );
      reset({ groupname: secMtx.data.name });
      setdtMenu(secMtx.data.data);
      return () => {
        controller.abort();
      };
    };
    getSecMtx();
  }, []);
  return (
    <Container>
      <form onSubmit={handleSubmit(submitDt)}>
        <Typography variant="h4">Menu Access Permission</Typography>
        <Grid container xs>
          <Grid item xs={6}>
            <TextFieldComp name="groupname" control={control} label={'Group Name'} />
          </Grid>
        </Grid>
        <TableMenuAccess data={dataMenu} onChange={accessDtUp} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LoadingButton variant="contained" type="submit" sx={{ padding: 2, margin: 2 }} loading={btnClicked}>
            <Typography>Submit</Typography>
          </LoadingButton>
        </Box>
      </form>
    </Container>
  );
}
