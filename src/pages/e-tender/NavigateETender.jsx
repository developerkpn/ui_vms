import { useEffect } from "react";
import { Button, Box } from "@mui/material";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { useSnackBar } from "src/provider/SnackbarProvider";

export default function NavigateETender({ type }) {
  const axiosPrivate = useAxiosPrivate();
  const { openSnackbar } = useSnackBar();
  async function directTo() {
    try {
      const { data } = await axiosPrivate.post(`/etender/genacstoken`, {
        type: type,
      });
      // console.log(data);
      console.log(`${import.meta.env.VITE_ETENDER}/sso/login?token=${data.token}`);
      window.open(`${import.meta.env.VITE_ETENDER}/sso/login?token=${data.token}`);
    } catch (error) {
      console.error(error);
      openSnackbar("error", "Something went wrong");
    }
  }

  useEffect(() => {
    if (!type) return;
    directTo();
  }, [type]);
  return type ? (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h3>Directed To E-Tender</h3>
      <Button
        onClick={() => {
          directTo();
        }}
      >
        Not Directed ?
      </Button>
    </Box>
  ) : (
    <></>
  );
}
