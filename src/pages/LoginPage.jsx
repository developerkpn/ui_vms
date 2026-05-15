import { Paper, Box, Button, Link, Backdrop } from "@mui/material";

import useMediaQuery from "@mui/material/useMediaQuery";
import { useForm } from "react-hook-form";
import { TextFieldComp } from "src/components/common/TextFieldComp";
import { Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import useSessionStore from "src/store/useSessionStore";
import useAccessTokStore from "src/store/useAccessTokStore";
import useCheckResetPWD from "src/store/useCheckResetPWD";
import usePermissionStore from "src/store/userPermissionStore";
import useMenuStore from "src/store/useMenuStore";
import CircularProgress from "@mui/material/CircularProgress";
import SvgIcon from "@mui/material/SvgIcon";
import { PasswordWithEyes } from "src/components/common/PasswordWithEyes";
import imgbg from "../images/gama-tower.jpg";
import KpnNav from "../images/kpn-logo.svg?react";
import { LoadingButton } from "@mui/lab";
import { getLoginErrorMessage } from "src/helper/loginErrorMessage.mjs";
// import Cookies from 'js-cookie';

const defaultValue = {
  Username: "",
  Password: "",
  FormToken: "",
};
export default function LoginPage() {
  const matches = useMediaQuery("(max-width:380px)");
  const setSessionStore = useSessionStore(state => state.setSessionStore);
  const setAccessToken = useAccessTokStore(state => state.setAccessToken);
  const setIsResetPWD = useCheckResetPWD(state => state.setIsResetPWD);
  const setPermission = usePermissionStore(state => state.setPermission);
  const setMenu = useMenuStore(state => state.setMenu);
  const [btnClicked, setBtnclicked] = useState();
  const { handleSubmit, control } = useForm({ defaultValues: defaultValue });
  const [openLoad, setOpenload] = useState(false);
  const [dirForm, setDirform] = useState({ state: "login", html: "User with form link ?" });
  const navigate = useNavigate();
  const onSubmit = async data => {
    setBtnclicked(true);
    setOpenload(true);
    if (dirForm.state === "form") {
      navigate(`/frm/newform/${data.FormToken}`);
    } else {
      try {
        const apiBaseUrl = import.meta.env.VITE_URL_LOC;
        const logindata = await axios.post(`${apiBaseUrl}/user/login`, {
          username: data.Username,
          password: data.Password,
        });
        const response = logindata.data;
        // setSession(response);
        setSessionStore({
          fullname: response.fullname,
          username: response.username,
          user_id: response.user_id,
          emp_role_id: response.emp_role_id,
          dept_id: response.dept_id,
          bu_id: response.bu_id,
          email: response.email,
          role: response.role,
          groupid: response.groupid,
        });
        setMenu(response.menu);
        setPermission(response.permission);
        setAccessToken(response.accessToken);
        setIsResetPWD(response.is_reset_pwd);
        alert("Successfull login");
        setTimeout(() => {
          if (response.dept_id == "MDM_MAT" || response.dept_id == "MATERIAL") {
            navigate("/dashboard/materials/lookup");
          } else if (response.dept_id !== "VENDOR") {
            navigate("/dashboard/ticket");
          } else {
            navigate("/dashboard");
          }
        }, 1000);
        setBtnclicked(false);
      } catch (err) {
        setOpenload(false);
        setBtnclicked(false);
        console.log(err);
        alert(getLoginErrorMessage(err, import.meta.env.VITE_URL_LOC));
      }
    }
  };

  // useEffect(() => {
  //   if (Cookies.get('accessToken')) {
  //     if (Cookies.get('role') !== 'VENDOR') {
  //       navigate('/dashboard/ticket');
  //     } else {
  //       navigate('/dashboard');
  //     }
  //   }
  // }, [navigate]);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          backgroundImage: `url(${imgbg})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Paper
            sx={{
              display: "flex",
              width: matches ? "18.75rem" : "37.5rem",
              height: matches ? "37.5rem" : "18.75rem",
              p: 3,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
            elevation={3}
          >
            {/* <Box>
              <SvgIcon>
                <Logo />
              </SvgIcon>
            </Box> */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <SvgIcon
                component={KpnNav}
                sx={{ width: "2rem", height: "2rem", mt: "0.1rem" }}
                viewBox="0 0 5000 5000"
                color="white"
              />
              <Typography variant="h4" sx={{ mb: matches ? "5rem" : "2rem", pb: "0.5rem" }}>
                Vendor Management System KPN
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 1 }}>
              {dirForm.state === "login" && (
                <TextFieldComp
                  name={"Username"}
                  control={control}
                  label={"Username"}
                  rules={{ required: true }}
                />
              )}
              {dirForm.state === "login" && (
                <PasswordWithEyes
                  name={"Password"}
                  control={control}
                  label={"Password"}
                  rules={{ required: true }}
                  sx={{ m: 1 }}
                />
              )}
            </Box>
            {dirForm.state === "form" && (
              <TextFieldComp
                name={"FormToken"}
                control={control}
                label={"Token Form"}
                rules={{ required: true }}
              />
            )}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                height: matches ? "3.125rem" : "6.25rem",
                width: matches ? "18.75rem" : "37.5rem",
              }}
            >
              <Link
                onClick={() => {
                  navigate("/resetpass");
                }}
              >
                Forgot Password ?
              </Link>
              {dirForm.state === "login" && (
                <LoadingButton
                  type="submit"
                  sx={{ height: "3.125rem", m: 1, width: "6.25rem" }}
                  loading={btnClicked}
                >
                  Login
                </LoadingButton>
              )}
              {dirForm.state === "form" && (
                <Button type="submit" sx={{ height: "3.125rem", m: 1, width: "6.25rem" }}>
                  Open
                </Button>
              )}
            </Box>
          </Paper>
        </form>
      </Box>
      <Backdrop sx={{ color: "#fff", zIndex: theme => theme.zIndex.drawer + 1 }} open={openLoad}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}
