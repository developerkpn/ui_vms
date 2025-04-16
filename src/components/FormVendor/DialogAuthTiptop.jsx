import { Dialog, DialogTitle, Box, DialogActions, Button, Alert } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useForm } from "react-hook-form";
import { useContext, createContext, useCallback, useState, useEffect } from "react";
import useSessionStore from "src/store/useSessionStore";
import { PasswordWithEyes } from "../common/PasswordWithEyes";
import { useSnackBar } from "src/provider/SnackbarProvider";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";

const AuthorizeTiptop = createContext(null);

export default function AuthorizeTipTopProvider({ children }) {
  const { openSnackbar } = useSnackBar();
  const axiosPrivate = useAxiosPrivate();
  const username = useSessionStore(state => state.username);
  const { control, handleSubmit } = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const [nextFunction, setNextFunction] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const setAuthorize = useCallback(nextfun => {
    console.log(nextfun);
    setOpenModal(true);
    setNextFunction(nextfun);
  }, []);

  const onAuth = async value => {
    try {
      setLoading(true);
      const { data } = await axiosPrivate.post("/cg/refreshtok", {
        username: username,
        password: value.password,
      });
      setOpenModal(false);
      nextFunction();
    } catch (error) {
      console.error(error);
      openSnackbar("error", error.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthorizeTiptop.Provider value={{ setAuthorize }}>
      <>
        <Dialog open={openModal} maxWidth="m">
          <DialogTitle>Authorize TIPTOP Credentials</DialogTitle>

          <Box
            sx={{
              width: "40rem",
              height: "15rem",
              display: "flex",
              flexDirection: "column",
              gap: 5,
              p: 2,
              mb: 3,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "3rem",
                paddingLeft: "1rem",
              }}
            >
              <div>
                <div>
                  <Alert variant="filled" severity="warning" sx={{ width: "96%" }}>
                    <strong>
                      Currently you're not authorized in Tiptop, please insert registered Tiptop
                      Password according to username displayed
                    </strong>{" "}
                  </Alert>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    margin: "1rem 0 0 0",
                  }}
                >
                  <strong>Username :</strong>{" "}
                  <em>
                    <strong>{username}</strong>
                  </em>
                </div>
              </div>
            </div>
            <PasswordWithEyes
              control={control}
              label="TIPTOP Password"
              name="password"
              rules={{ required: "Please insert this field" }}
            />
          </Box>
          <DialogActions>
            <LoadingButton
              type="submit"
              color="primary"
              variant="contained"
              loading={loading}
              onClick={handleSubmit(onAuth)}
            >
              Submit
            </LoadingButton>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                setOpenModal(false);
                setNextFunction(null);
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
        {children}
      </>
    </AuthorizeTiptop.Provider>
  );
}

export const useAuthTipTop = () => useContext(AuthorizeTiptop);
