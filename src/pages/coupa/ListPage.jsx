import { Visibility } from "@mui/icons-material";
import { Box, Button, Grid, Skeleton, Backdrop, CircularProgress, Select, MenuItem } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SearchFieldComp from "src/components/common/SearchFieldComp";
import TooltipButton from "src/components/common/TooltipButton";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import useSessionStore from "src/store/useSessionStore";
import BasicDatePicker from "./common/DatePicker";

const overrides = {
  "& .MuiDataGrid-main": {},
  maxHeigth: "100%",
};

export default function ListPage() {
  const [data_verif, setDataVerif] = useState();
  const axiosPrivate = useAxiosPrivate();
  const [selectDate, setSelectedDate] = useState("");
  const user_id = useSessionStore(state => state.user_id);
  const [loading_state, setLoadingState] = useState(false);
  // const [filterAct, setFilteract] = useState(true);
  const [q, setQ] = useState("");

  const showDataVerif = async controller => {
   setLoadingState(true);
   try {
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() - 4);
      const defaultDate = fallbackDate.toISOString().split("T")[0];

      const body = {
        date: selectDate || defaultDate,
      };

      const response = await axiosPrivate.post(`/coupa/vendor/list`, body, {
        signal: controller.signal,
      });

      setDataVerif(response.data.data);
      
   } catch (error) {
      console.error(error);
   } finally{
      setLoadingState(false);
   }
  };
  const filteredData = useMemo(() => {
    if (!data_verif) return [];
    if (!q) return data_verif;

    const searchLower = q.toLowerCase();
    return data_verif.filter(
      item =>
        item.vendor_code?.toLowerCase().includes(searchLower) ||
        item.vendor_name?.toLowerCase().includes(searchLower) ||
        item.name?.toLowerCase().includes(searchLower)
    );
  }, [data_verif, q]);

  useEffect(() => {
    const controller = new AbortController();
    showDataVerif(controller);

    return () => controller.abort();
  }, [user_id, selectDate]);

  const columnTable = useMemo(
    () => [
      {
        field: "coupa_id",
        type: "string",
        headerName: "Coupa ID",
        width: 250,
      },
      {
        field: "vendor_code",
        type: "string",
        headerName: "Vendor Code",
        width: 250,
      },
      {
        field: "vendor_name",
        type: "string",
        headerName: "Vendor Name",
        width: 250,
      },
      {
        field: "name",
        type: "string",
        headerName: "Name",
        width: 250,
      },
      {
        field: "status",
        type: "string",
        headerName: "Status",
        width: 250,
      },
      {
        field: "updated_at",
        type: "string",
        headerName: "Updated",
        width: 250,
      },
      {
        field: "action",
        type: "actions",
        width: 100,
        renderCell: item => {
          let Buttons = [];
          Buttons.push(
            <Link
              to={`/dashboard/form-coupa/${item.row.coupa_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <TooltipButton Icon={<Visibility />} TooltipText={"View"} />
            </Link>
          );
          return Buttons;
        },
      },
    ],
    [data_verif]
  );

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Grid container spacing={2} alignItems="center">
        {/* Search */}
        <Grid item xs={12} md={9}>
          {/* <Select
            sx={{ width: '10em', marginTop: "1em", marginRight: '1em' }}
            id={'filterAct'}
            value={filterAct}
            onChange={(e) => {
              setFilteract(e.target.value);
              setRefresh(true);
            }}
          >
            <MenuItem value={true}>New Vendor</MenuItem>
            <MenuItem value={false}>History Vendor</MenuItem>
          </Select> */}
          <SearchFieldComp
            setQuery={setQ}
            placeholder="Search Vendor Code, Vendor Name or Name..."
          />
        </Grid>

        {/* Date + Reset */}
        <Grid item xs={12} md={3} alignItems="center">
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
            }}
          >
            <BasicDatePicker
              label="Start Date"
              value = {selectDate == "" ? null : selectDate}
              onChange={val => setSelectedDate(val ? val.format("YYYY-MM-DD") : "")}
            />
            <Button
              variant="outlined"
              size="large"
              onClick={() => setSelectedDate("")}
              disabled={!selectDate}
            >
              Reset
            </Button>
          </Box>
        </Grid>
      </Grid>

      {data_verif !== undefined && (
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ width: "100%", height: "88%" }}>
            <DataGrid
              sx={overrides}
              rows={filteredData}
              columns={columnTable}
              disableColumnFilter
              disableColumnSelector
              disableDensitySelector
              hideFooterPagination
            />
          </Box>
        </Box>
      )}
      {data_verif === undefined && (
        <Box>
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
        </Box>
      )}
      <Backdrop
        sx={{ color: "#fff", zIndex: theme => theme.zIndex.drawer + 1 }}
        open={
          loading_state
        }
      >
        <CircularProgress color="inherit" disableShrink />
      </Backdrop>
    </Box>
  );
}
