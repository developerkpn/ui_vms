import { Container, Typography, Grid, Box, Button } from "@mui/material";
import SelectComp from "src/components/common/SelectComp";
import { TextFieldComp } from "src/components/common/TextFieldComp";
import { PasswordWithEyes } from "src/components/common/PasswordWithEyes";
import { useForm } from "react-hook-form";
import { useEffect, useState, useMemo } from "react";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import dayjs from "dayjs";
import DatePickerComp from "src/components/common/DatePickerComp";
import { useSearchParams, useNavigate, Navigate, useLocation } from "react-router-dom";
import { LoadingButton } from "@mui/lab";
// import { useSession } from 'src/provider/sessionProvider';
import useSessionStore from "src/store/useSessionStore";
import { useMasterFetcher } from "src/hooks/MasterFetcher";
import AutoCompleteSelect from "src/components/common/AutoCompleteSelectRefac";
import usePermissionStore from "src/store/userPermissionStore";

export default function FormUserPage() {
  const [btnClicked, setBtnclicked] = useState(false);
  const location = useLocation();
  const axiosPrivate = useAxiosPrivate();
  const [searchParams] = useSearchParams();
  const [userId, setUserid] = useState("");
  const user_id = useSessionStore(state => state.user_id);
  const permission = usePermissionStore(state => state.permission);
  const allowUpdate = useMemo(() => permission["User"]?.update ?? false, [permission]);
  const navigate = useNavigate();
  const {
    handleSubmit,
    control,
    reset,
    getFieldState,
    getValues,
    formState: { isDirty },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      manager: "",
      fullname: "",
      username: "",
      usergroup: "",
      email: "",
      password: "",
      role: "",
      gender: "",
      bu_id: null,
      bu_id_1: null,
      bu_id_2: null,
      dept_id: null,
      emp_role_id: null,
      datecreated: dayjs(),
      expireddate: dayjs(),
    },
    resetOptions: {
      keepDirtyValues: true, // user-interacted input will be retained
      keepErrors: true, // input errors will be retained with value update
    },
  });

  const getUserData = async iduser => {
    try {
      const userDt = await axiosPrivate.get(`/user/show/?iduser=${iduser}`);
      const data = userDt.data.data;
      if (data) {
        setUserid(data.user_id);
        if (data.role === "MGR") {
          setisMgr(true);
        }
        reset({
          manager: data.mgr_id,
          fullname: data.fullname,
          username: data.username,
          usergroup: data.usergroup,
          email: data.email,
          role: data.role,
          gender: data.gender,
          bu_id: data.bu_id,
          bu_id_1: data.bu_id_1,
          bu_id_2: data.bu_id_2,
          dept_id: data.dept_id,
          emp_role_id: data.emp_role_id,
          datecreated: dayjs(data.datecreated),
          expireddate: dayjs(data.expireddate),
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const [userGroup, setuserGroup] = useState([{ value: "", label: "" }]);
  const [roles, setRoles] = useState([{ value: "", label: "" }]);
  const [manager, setManager] = useState([{ value: "", label: "" }]);
  const onRoleChange = data => {
    if (data !== "MGR") {
      setisMgr(false);
    } else {
      setisMgr(true);
    }
  };
  const [isMgr, setisMgr] = useState(false);

  const { data: dataBU } = useMasterFetcher({ link: "/master/bu" });
  const { data: dataDept } = useMasterFetcher({ link: "/master/dept" });
  const { data: dataEmpRole } = useMasterFetcher({ link: "/master/emprole" });
  const [optionBU, setOptionBU] = useState([]);
  const [optionDept, setOptionDept] = useState([]);
  const [optionEmpRole, setOptionEmpRole] = useState([]);

  useEffect(() => {
    if (dataBU.length > 0) {
      let buOpt = [{ value: "", label: "--Empty--" }];
      dataBU.map(value => {
        buOpt.push({
          value: value.bu_code,
          label: value.bu_name,
        });
      });
      setOptionBU(buOpt);
    }
  }, [dataBU]);

  useEffect(() => {
    if (dataDept.length > 0) {
      let deptOpt = [{ value: "", label: "--Empty--" }];
      dataDept.map(value => {
        deptOpt.push({
          value: value.dept_code,
          label: value.dept_name,
        });
      });
      setOptionDept(deptOpt);
    }
  }, [dataDept]);

  useEffect(() => {
    if (dataEmpRole.length > 0) {
      let empRole = [{ value: "", label: "--Empty--" }];
      dataEmpRole.map(value => {
        empRole.push({
          value: value.role_code,
          label: value.role_name,
        });
      });
      setOptionEmpRole(empRole);
    }
  }, [dataEmpRole]);

  useEffect(() => {
    const controller = new AbortController();
    const getUsergrp = async () => {
      try {
        const getUsrgrp = await axiosPrivate.get(`/user/lssecmtx`, { signal: controller.signal });
        const dataUsrgrp = getUsrgrp.data.data.map(data => {
          return { value: data.user_group_id, label: data.user_group_name };
        });
        setuserGroup(dataUsrgrp);
      } catch (error) {
        console.error(error);
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
        const dataRole = getRole.data.data.map(data => {
          return { value: data.id_role, label: data.role };
        });
        setRoles(dataRole);
      } catch (error) {
        console.error(error);
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
        const dataMgr = getManager.data.data.map(data => {
          return { value: data.mgr_id, label: data.fullname };
        });
        setManager(dataMgr);
      } catch (error) {
        console.error(error);
      }
    };
    getMgr();
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let userid = searchParams.get("iduser");
    if (permission && !permission["User"]?.update && searchParams.get("iduser") !== user_id) {
      userid = user_id;
    }
    console.log(userid);
    getUserData(userid);
  }, [location.state, permission]);

  const submitUser = async data => {
    setBtnclicked(true);
    const mgr_id = isMgr ? "" : data.manager;
    let subUserDt = {
      user_id: userId,
      mgr_id: mgr_id,
      fullname: data.fullname,
      username: data.username,
      usergroup: data.usergroup,
      email: data.email,
      role: data.role,
      bu_id: data.bu_id,
      bu_id_1: data.bu_id_1,
      bu_id_2: data.bu_id_2,
      dept_id: data.dept_id,
      emp_role_id: data.emp_role_id,
      gender: data.gender,
      createddate: data.datecreated.format("YYYY-MM-DD"),
      expireddate: data.expireddate ? data.expireddate.format("YYYY-MM-DD") : null,
    };
    if (getFieldState("password").isDirty) {
      subUserDt.password = data.password;
    }
    // console.log(subUserDt);
    try {
      const submitDatauser = await axiosPrivate.post(`/user/submit`, subUserDt);
      setBtnclicked(false);
      alert(submitDatauser.data.message);
      if (permission && permission["User"]?.update) {
        navigate("../users");
      } else {
        navigate("../");
      }
    } catch (error) {
      setBtnclicked(false);
      alert(error);
    }
  };

  if (permission && !permission["User"]?.update && searchParams.get("iduser") !== user_id) {
    return <Navigate to={`../../dashboard/account/edit?iduser=${user_id}`} />;
  }
  return (
    <Container>
      <form onSubmit={handleSubmit(submitUser)}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
          <Typography variant="h4" sx={{ textAlign: "center", pb: 5 }}>
            User Information
          </Typography>
          {allowUpdate && location.state?.page !== "userinfo" && (
            <Grid container spacing={2}>
              <Grid item xs>
                <DatePickerComp
                  label="Date Created"
                  name="datecreated"
                  control={control}
                  rules={{ required: true }}
                  inputFormat="DD-MM-YYYY"
                />
              </Grid>
              <Grid item xs>
                <DatePickerComp
                  label="Expired Date"
                  name="expireddate"
                  control={control}
                  rules={{ required: true }}
                  inputFormat="DD-MM-YYYY"
                />
              </Grid>
            </Grid>
          )}
          <Grid container spacing={2}>
            <Grid item xs>
              <TextFieldComp
                name="username"
                control={control}
                label="Username"
                rules={{ required: true }}
              />
            </Grid>
            <Grid item xs>
              <PasswordWithEyes
                name="password"
                control={control}
                label="Password"
                rules={{ required: userId != "" ? false : true }}
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs>
              <TextFieldComp
                name="fullname"
                control={control}
                label="Full Name"
                rules={{ required: true }}
              />
            </Grid>
            <Grid item xs>
              <TextFieldComp
                name="email"
                control={control}
                label="Email"
                rules={{ required: true }}
              />
            </Grid>
            {allowUpdate && location.state?.page !== "userinfo" && (
              <Grid item xs={2}>
                <SelectComp
                  name="gender"
                  options={[
                    { value: "M", label: "Male" },
                    { value: "F", label: "Female" },
                  ]}
                  control={control}
                  label="Gender"
                />
              </Grid>
            )}
          </Grid>
          {allowUpdate && location.state?.page !== "userinfo" && (
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
                <SelectComp
                  name="manager"
                  control={control}
                  label="Manager"
                  options={manager}
                  disabled={isMgr}
                />
              </Grid>
            </Grid>
          )}
          {allowUpdate && location.state?.page !== "userinfo" && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <AutoCompleteSelect
                  name="bu_id"
                  control={control}
                  options={optionBU}
                  label="Business Unit"
                  // rules={{ required: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <AutoCompleteSelect
                  name="bu_id_1"
                  control={control}
                  options={optionBU}
                  label="Business Unit 1"
                />
              </Grid>
              <Grid item xs={6}>
                <AutoCompleteSelect
                  name="bu_id_2"
                  control={control}
                  options={optionBU}
                  label="Business Unit 2"
                />
              </Grid>
              <Grid item xs={6}>
                <AutoCompleteSelect
                  name="dept_id"
                  control={control}
                  options={optionDept}
                  label="Department"
                />
              </Grid>
              <Grid item xs={6}>
                <AutoCompleteSelect
                  name="emp_role_id"
                  control={control}
                  options={optionEmpRole}
                  label="Employee Role"
                  rules={{ required: true }}
                />
              </Grid>
            </Grid>
          )}
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 10 }}>
          <LoadingButton
            type="submit"
            sx={{ width: 100, height: 50 }}
            variant="contained"
            loading={btnClicked}
          >
            <Typography>Save</Typography>
          </LoadingButton>
        </Box>
      </form>
    </Container>
  );
}
