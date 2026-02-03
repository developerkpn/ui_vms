import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { DataGrid, GridToolbar, GridToolbarContainer } from "@mui/x-data-grid";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Edit, Visibility, Delete, Refresh, Update, NotificationsActive,} from "@mui/icons-material";
import { Button, IconButton, Box, Paper, Typography, Popper, Grow, Backdrop, CircularProgress, Skeleton, FormControl, Select, MenuItem, Tooltip, Checkbox} from "@mui/material";
import usePermissionStore from "src/store/userPermissionStore";
import { useNavigate, Link } from "react-router-dom";
import useSessionStore from "src/store/useSessionStore";
import TooltipButton from "src/components/common/TooltipButton";
import SearchFieldComp from "src/components/common/SearchFieldComp";

const overrides = {
  "& .MuiDataGrid-main": {},
  maxHeigth: "100%",
};

export default function ListPage() {
    const permission = usePermissionStore(state => state.permission);
    const [data_verif, setDataVerif] = useState();
    const [refreshBtn, setRefreshbtn] = useState(true);
    const axiosPrivate = useAxiosPrivate();
    const user_id = useSessionStore(state => state.user_id);
    const [q, setQ] = useState("");
  
    const showDataVerif = async controller => {
      const date = new Date();
      date.setDate(date.getDate() - 4);

      const body = {
        date: date.toISOString().split("T")[0]
      };

      const response = await axiosPrivate.post(`/coupa/vendor/list`, 
        body,
        { signal: controller.signal,}
      );
      console.log(response);
      const result = response.data.data;
      const load = result.map(item => ({
            id: item.id,
            coupa_id: item.coupa_id,
            vendor_name: item.vendor_name,
            name: item.name,
            vendor_code: item.vendor_code,
            status: item.status,
            updated_at: item.updated_at,
          }));
      setDataVerif(load);
    };
  
    const dataVerif = async controller => {
      try {
        await showDataVerif(controller);
      } catch (error) {
        console.error(error);
      } 
    };

    const filteredData = useMemo(() => {
      if (!data_verif) return [];
      if (!q) return data_verif;
      
      const searchLower = q.toLowerCase();
      return data_verif.filter(item => 
        item.vendor_code?.toLowerCase().includes(searchLower) ||
        item.vendor_name?.toLowerCase().includes(searchLower) ||
        item.name?.toLowerCase().includes(searchLower)
      );
    }, [data_verif, q]);
  
    useEffect(() => {
      const controller = new AbortController();
      dataVerif(controller);
      return () => {
        controller.abort();
      };
    }, [user_id]);
  
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
        <SearchFieldComp setQuery={setQ} placeholder={"Search Vendor Code, Vendor Name or Name..."} />
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
                rows={ filteredData }
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

      </Box>
    );
}
