import { Container, Typography, Grid, Box, Button } from '@mui/material';
import SelectComp from 'src/components/common/SelectComp';
import { TextFieldComp } from 'src/components/common/TextFieldComp';
import { PasswordWithEyes } from 'src/components/common/PasswordWithEyes';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import dayjs from 'dayjs';
import DatePickerComp from 'src/components/common/DatePickerComp';
import { useSearchParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { LoadingButton } from '@mui/lab';
import { useSession } from 'src/provider/sessionProvider';

export default function FormUserPage() {
  const [btnClicked, setBtnclicked] = useState(false);
  const location = useLocation();
  const axiosPrivate = useAxiosPrivate();
  const [searchParams] = useSearchParams();
  const [userId, setUserid] = useState('');
  const { session, getPermission } = useSession();
  const allowUpdate = getPermission('User').update;
  const navigate = useNavigate();
  const {
    handleSubmit,
    control,
    reset,
    getFieldState,
    formState: { isDirty },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      manager: '',
      fullname: '',
      username: '',
      usergroup: '',
      email: '',
      password: '',
      role: '',
      datecreated: dayjs().format('MM/DD/YYYY'),
      expireddate: dayjs().format('MM/DD/YYYY'),
    },
    resetOptions: {
      keepDirtyValues: true, // user-interacted input will be retained
      keepErrors: true, // input errors will be retained with value update
    },
  });

  const getUserData = async (iduser) => {
    const userDt = await axiosPrivate.get(`/user/show/?iduser=${iduser}`);
    const data = userDt.data.data;
    if (data != undefined) {
      setUserid(data.user_id);
      if (data.role === 'MGR') {
        setisMgr(true);
      }
      reset({
        manager: data.mgr_id,
        fullname: data.fullname,
        username: data.username,
        usergroup: data.usergroup,
        email: data.email,
        role: data.role,
        datecreated: dayjs(data.datecreated).format('MM/DD/YYYY'),
        expireddate: dayjs(data.expireddate).format('MM/DD/YYYY'),
      });
    }
  };

  const [userGroup, setuserGroup] = useState([{ value: '', label: '' }]);
  const [roles, setRoles] = useState([{ value: '', label: '' }]);
  const [manager, setManager] = useState([{ value: '', label: '' }]);
  const onRoleChange = (data) => {
    if (data !== 'MGR') {
      setisMgr(false);
    } else {
      setisMgr(true);
    }
  };
  const [isMgr, setisMgr] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const getUsergrp = async () => {
      try {
        const getUsrgrp = await axiosPrivate.get(`/user/lssecmtx`, { signal: controller.signal });
        const dataUsrgrp = getUsrgrp.data.data.map((data) => {
          return { value: data.user_group_id, label: data.user_group_name };
        });
        setuserGroup(dataUsrgrp);
      } catch (error) {
        alert(error);
      }
    };
    getUsergrp();
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const getRole = async () => {
      try {
        const getRole = await axiosPrivate.get(`/user/roles`, {
          signal: controller.signal,
        });
        const dataRole = getRole.data.data.map((data) => {
          return { value: data.id_role, label: data.role };
        });
        setRoles(dataRole);
      } catch (error) {
        alert(error);
      }
    };
    getRole();
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const getMgr = async () => {
      try {
        const getManager = await axiosPrivate.get(`/user/mgrs`);
        const dataMgr = getManager.data.data.map((data) => {
          return { value: data.mgr_id, label: data.fullname };
        });
        setManager(dataMgr);
      } catch (error) {
        alert(error);
      }
    };
    getMgr();
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let userid = searchParams.get('iduser');
    if (!getPermission('User').update && searchParams.get('iduser') !== session.user_id) {
      userid = session.user_id;
    }
    getUserData(userid);
  }, [location.state]);

  const submitUser = async (data) => {
    setBtnclicked(true);
    const mgr_id = isMgr ? '' : data.manager;
    let subUserDt = {
      user_id: userId,
      mgr_id: mgr_id,
      fullname: data.fullname,
      username: data.username,
      usergroup: data.usergroup,
      email: data.email,
      role: data.role,
      createddate: dayjs(data.datecreated).format('MM/DD/YYYY'),
      expireddate: dayjs(data.expireddate).format('MM/DD/YYYY'),
    };
    if (getFieldState('password').isDirty) {
      subUserDt.password = data.password;
    }
    // console.log(subUserDt);
    try {
      const submitDatauser = await axiosPrivate.post(`/user/submit`, subUserDt);
      setBtnclicked(false);
      alert(submitDatauser.data.message);
      if (getPermission('User').update) {
        navigate('../users');
      } else {
        navigate('../ticket');
      }
    } catch (error) {
      setBtnclicked(false);
      alert(error);
    }
  };

  if (!getPermission('User').update && searchParams.get('iduser') !== session.user_id) {
    return <Navigate to={`../../dashboard/account/edit?iduser=${session.user_id}`} />;
  }
  return (
    <Container>
      <form onSubmit={handleSubmit(submitUser)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
          <Typography variant="h4" sx={{ textAlign: 'center', pb: 5 }}>
            User Information
          </Typography>
          {allowUpdate && location.state?.page !== 'userinfo' && (
            <Grid container spacing={2}>
              <Grid item xs>
                <DatePickerComp label="Date Created" name="datecreated" control={control} rules={{ required: true }} />
              </Grid>
              <Grid item xs>
                <DatePickerComp label="Expired Date" name="expireddate" control={control} rules={{ required: true }} />
              </Grid>
            </Grid>
          )}
          <Grid container spacing={2}>
            <Grid item xs>
              <TextFieldComp name="username" control={control} label="Username" rules={{ required: true }} />
            </Grid>
            <Grid item xs>
              <PasswordWithEyes
                name="password"
                control={control}
                label="Password"
                rules={{ required: userId != '' ? false : true }}
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs>
              <TextFieldComp name="fullname" control={control} label="Full Name" rules={{ required: true }} />
            </Grid>
            <Grid item xs>
              <TextFieldComp name="email" control={control} label="Email" rules={{ required: true }} />
            </Grid>
          </Grid>
          {allowUpdate && location.state?.page !== 'userinfo' && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <SelectComp
                  name="usergroup"
                  control={control}
                  label="User Group"
                  options={userGroup}
                  rules={{ required: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <SelectComp
                  name="role"
                  control={control}
                  label="Role"
                  options={roles}
                  rules={{ required: true }}
                  onChangeovr={onRoleChange}
                />
              </Grid>
              <Grid item xs={6}>
                <SelectComp name="manager" control={control} label="Manager" options={manager} disabled={isMgr} />
              </Grid>
            </Grid>
          )}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 10 }}>
          <LoadingButton type="submit" sx={{ width: 100, height: 50 }} variant="contained" loading={btnClicked}>
            <Typography>Save</Typography>
          </LoadingButton>
        </Box>
      </form>
    </Container>
  );
}
