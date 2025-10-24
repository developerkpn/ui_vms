import { Popper, Paper, Box, Button, Skeleton, Card, IconButton, Typography } from "@mui/material";
import { RefreshOutlined } from "@mui/icons-material";
import { TextFieldComp } from "../common/TextFieldComp";
import { useForm } from "react-hook-form";
import CardDataVendor from "./CardDataVendor";
import { CloseOutlined } from "@mui/icons-material";
import { useEffect, useCallback, useRef } from "react";
import { useMasterFetcher } from "src/hooks/MasterFetcher";
import { debounce } from "lodash";
import AutoSizer from "react-virtualized-auto-sizer";
import { VariableSizeList } from "react-window";

export default function ModalShowDataVendor({ open, setOpen, initiateQ, anchorEl }) {
  const rowHeights = useRef({});
  const listRef = useRef(null);
  const { control, reset, getValues, watch } = useForm({
    defaultValues: {
      q: "",
    },
  });
  const { loading, error, data, refresh_data } = useMasterFetcher({
    link: "/cg/dataven",
    param: { q: initiateQ },
  });

  const setRowsHeights = useCallback((index, size) => {
    listRef.current.resetAfterIndex(0);
    rowHeights.current = { ...rowHeights.current, [index]: size };
  }, []);

  useEffect(() => {
    // if (open) {
    //   setAuthorize(() => showData);
    // }
    if (open) {
      refresh_data({ q: initiateQ });
      reset({
        q: initiateQ,
      });
    }
  }, [initiateQ, open]);

  useEffect(() => {
    console.log(error);
    // if (open && error && error?.response.status == 401) {
    //   setAuthorize(() => showData);
    // }
  }, [error]);

  const refreshData = () => {
    refresh_data({ q: getValues("q") });
  };

  const debounceRefresh = debounce(() => {
    refresh_data({ q: getValues("q") });
  }, 800);

  useEffect(() => {
    if (open && getValues("q") != "") {
      debounceRefresh();
    }
  }, [watch("q")]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0);
    }
  }, [data]);

  const Row = ({ index, style }) => {
    return (
      <CardDataVendor
        index={index}
        style={style}
        dataven={data[index]}
        setRowsHeights={setRowsHeights}
      />
    );
  };
  function getRowHeight(index) {
    return rowHeights.current[index] + 10 || 100;
  }
  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      sx={theme => ({ zIndex: 5, position: "absolute" })}
      modifiers={[
        {
          options: {
            rootBoundary: "document",
          },
        },
      ]}
      placement="right-end"
    >
      <Paper
        sx={theme => ({
          display: "flex",
          flexDirection: "column",
          gap: 2,
          [theme.breakpoints.up("lg")]: {
            width: "40rem",
          },
          [theme.breakpoints.up("md")]: {
            width: "30rem",
          },
          height: "70vh",
          p: 2,
          backgroundColor: theme.palette.grey[200],
        })}
        elevation={10}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            sx={{ minWidth: "10px" }}
            onClick={e => {
              setOpen(false);
            }}
          >
            <CloseOutlined />
          </Button>
        </Box>
        <TextFieldComp control={control} name={"q"} />
        <Box
          sx={{
            height: "90%",
            overflowY: "auto",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              width: "100%",
              height: "100%",
              flexShrink: 0,
            }}
          >
            {loading && (
              <>
                <Skeleton variant="rectangular" sx={{ width: "100%", height: "10rem" }} />
                <Skeleton variant="rectangular" sx={{ width: "100%", height: "10rem" }} />
                <Skeleton variant="rectangular" sx={{ width: "100%", height: "10rem" }} />
              </>
            )}
            {error && (
              <Card
                sx={theme => ({
                  width: "100%",
                  height: "15rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.palette.error.light,
                })}
              >
                <Typography sx={theme => ({ color: theme.palette.error.contrastText })}>
                  Error Occured
                </Typography>
                <IconButton
                  sx={theme => ({ color: theme.palette.error.contrastText })}
                  onClick={() => refreshData()}
                >
                  <RefreshOutlined />
                </IconButton>
              </Card>
            )}
            {data && data?.length == 0 && !loading && (
              <Card
                sx={theme => ({
                  width: "100%",
                  height: "15rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.palette.grey[300],
                })}
              >
                <h4>Empty Data</h4>
              </Card>
            )}
            {data && data?.length > 0 && (
              <AutoSizer style={{ height: "100%", width: "100%" }}>
                {({ height, width }) => (
                  <VariableSizeList
                    height={height}
                    width={width}
                    itemCount={data.length}
                    itemSize={getRowHeight}
                    ref={listRef}
                  >
                    {Row}
                  </VariableSizeList>
                )}
              </AutoSizer>
            )}
          </Box>
        </Box>
      </Paper>
    </Popper>
  );
}
