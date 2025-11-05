import { DataGrid, GridToolbar, GridToolbarContainer } from "@mui/x-data-grid";
import {
  Button,
  IconButton,
  Box,
  Paper,
  Typography,
  Popper,
  Grow,
  Backdrop,
  CircularProgress,
  Skeleton,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
  Checkbox,
} from "@mui/material";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Edit,
  Link,
  Visibility,
  Delete,
  Refresh,
  Update,
  NotificationsActive,
} from "@mui/icons-material";
import ModalCreateTicket from "src/components/common/ModalCreateTicket";
import usePermissionStore from "src/store/userPermissionStore";
import { useNavigate } from "react-router-dom";
import ProgressStat from "src/components/common/ProgressStat";
import moment from "moment";
import ListSAPProgress from "./ListSAPProgress";
import useSessionStore from "src/store/useSessionStore";
import SearchFieldComp from "src/components/common/SearchFieldComp";
import DialogFormConfirmation from "src/components/common/DialogFormConfirmation";
import ModalShowDataVendor from "src/components/FormVendor/ModalShowDataVendor";
import TooltipButton from "src/components/common/TooltipButton";
import { InfoOutlined } from "@mui/icons-material";
import { useSnackBar } from "src/provider/SnackbarProvider";

const overrides = {
  "& .MuiDataGrid-main": {},
  maxHeigth: "100%",
};

function RefreshTable(props) {
  const refreshBtn = () => {
    props.setRefreshbtn(true);
  };
  return (
    <Tooltip title={<Typography>Refresh</Typography>}>
      <span>
        <Button onClick={refreshBtn} sx={props.sx} variant={"contained"} disabled={props.isLoading}>
          {props.isLoading ? <CircularProgress /> : <Refresh />}
        </Button>
      </span>
    </Tooltip>
  );
}

const TitleConfirDelete = ({ row }) => {
  return <h4>Delete Confirmation {row.ticket_num}</h4>;
};

const TitleReminderEmail = ({ row }) => {
  return <h4>Email Reminder {row.ticket_num}</h4>;
};

export default function ListTicket() {
  const permission = usePermissionStore(state => state.permission);
  const [q, setQ] = useState("");
  const perm = useMemo(
    () => ({
      Table: permission["Ticket Request"],
      INIT: permission["Initial Form"],
      CREA: permission["Creation Form"],
      FINA: permission["Final Form"],
    }),
    [permission]
  );
  const [ticket, setTicket] = useState();
  const [userOnlyTicket, setUOTicket] = useState([]);
  const [openModalInfo, setOpenModalInfo] = useState(false);
  const [modalInfoAnc, setModalInfoAnc] = useState(null);
  const [openModal, setOpenmodal] = useState(false);
  const [btnTicket, setBtn] = useState(false);
  const [grow, setGrow] = useState(false);
  const [anchorEl, setAnchorel] = useState(null);
  const [loader, setLoader] = useState(false);
  const [filterAct, setFilteract] = useState(true);
  const [deleted, setDelete] = useState(false);
  const [ticket_state, setTicketstate] = useState([]);
  const [refreshBtn, setRefreshbtn] = useState(true);
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const emp_role_id = useSessionStore(state => state.emp_role_id);
  const dept_id = useSessionStore(state => state.dept_id);
  const bu_id = useSessionStore(state => state.bu_id);
  const user_id = useSessionStore(state => state.user_id);
  const [modalConf, setModalConf] = useState(false);
  const [modalReminder, setModalReminder] = useState(false);
  const [deleteAction, setDeleteAction] = useState();
  const [selectedRow, setSelectedRow] = useState();
  const [showAll, setShowAll] = useState(false);
  const { openSnackbar } = useSnackBar();

  const showTicket = async controller => {
    const URLQuery = new URLSearchParams();
    URLQuery.append("is_active", filterAct);
    if (q) {
      URLQuery.append("q", q);
    }
    const response = await axiosPrivate.get(`/ticket?${URLQuery.toString()}`, {
      signal: controller.signal,
    });
    const result = response.data.data;
    const load = result.map(item => ({
      id: item.token,
      is_active: item.is_active,
      ticket_num: item.ticket_id,
      updated_at: moment(item.updated_at).format("DD/MM/YYYY T HH:mm:ss"),
      updated_by: item.updated_by,
      date_ticket: moment(item.created_at).format("DD/MM/YYYY T HH:mm:ss"),
      assignee: item.email,
      current_position: item.current_position,
      cur_pos: item.cur_pos,
      status_ticket: item.status,
      vendor_name: item.name_1,
      vendor_code: item.ven_code,
      ticket_state: item.ticket_state,
      is_expired: item.is_expired,
      approval_pos: item.approval_pos,
      bu_id: item.bu_id,
      dept_id_ticket: item.dept_id_ticket,
      emp_role_id: item.cur_pos,
      proc_id: item.proc_id,
    }));
    console.log(user_id);
    const uotick = load.filter(item => item.proc_id == user_id);
    setUOTicket(uotick);
    setTicket(load);
  };

  const tickets = async controller => {
    try {
      await showTicket(controller);
    } catch (error) {
      console.error(error);
    } finally {
      if (refreshBtn) {
        setRefreshbtn(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (refreshBtn && user_id) {
      tickets(controller);
    }
    return () => {
      controller.abort();
    };
  }, [filterAct, deleted, refreshBtn, user_id]);

  useEffect(() => {
    setRefreshbtn(true);
  }, [q]);

  const handleOnClose = () => {
    setOpenmodal(false);
  };

  const handleOnBtnClose = () => () => {
    setBtn(false);
  };

  const buttonRefreshAct = () => {
    setRefreshbtn(true);
  };

  const copyToClipboard = useCallback(async textToCopy => {
    // Navigator clipboard api needs a secure context (https)
    // Use the 'out of viewport hidden text area' trick
    const textArea = document.createElement("textarea");
    textArea.value = textToCopy.toString();

    // Move textarea out of the viewport so it's not visible
    textArea.style.position = "absolute";
    textArea.style.left = "-999999px";
    textArea.tabIndex = "-1";

    document.body.appendChild(textArea);
    textArea.select();
    textArea.focus();

    try {
      const hey = document.execCommand("copy");
    } catch (error) {
      console.error(error);
    } finally {
      textArea.remove();
    }
  }, []);

  const deleteActionFunc = async row => {
    const deleteTicket = await axiosPrivate.delete(`/ticket/${row.id}`);
    setDelete(!deleted);
    setRefreshbtn(true);
    alert(`Ticket ${deleteTicket.data.data} is deleted`);
    setModalConf(false);
  };

  const reminderApproval = async row => {
    try {
      const { data } = await axiosPrivate.post("/ticket/reminderappr", {
        ticket_id: row.id,
      });
      setModalReminder(false);
      openSnackbar("success", data.message);
    } catch (error) {
      let message = error?.response?.data?.message;
      if (!message) {
        message = error?.message;
      }
      openSnackbar("error", message);
    }
  };

  const handleButtonAction = useCallback(
    (type, row) => async e => {
      try {
        if (type === "Link") {
          if (navigator.clipboard === undefined) {
            await copyToClipboard(`${location.protocol}/${location.host}/frm/newform/${row.id}`);
          } else {
            navigator.clipboard.writeText(
              `${location.protocol}/${location.host}/frm/newform/${row.id}`
            );
          }
          setAnchorel(e.target);
          setBtn(true);
          setGrow(true);
          setTimeout(() => {
            setBtn(false);
          }, 1000);
        } else if (type === "Delete") {
          setModalConf(true);
          setSelectedRow(row);
        } else if (type === "Extend") {
          if (confirm("Are you sure want to extend ? (+1 day)")) {
            const extendTicket = await axiosPrivate.post(`/ticket/extexp`, {
              ticket_id: row.id,
            });
            alert(`Ticket ${extendTicket.data.ticket_num} expiry date extended`);
            setRefreshbtn(true);
          }
        } else if (type === "RESEND") {
          if (confirm("Are you sure want to resend request to CEO ?")) {
            try {
              const resendTicket = await axiosPrivate.post(`/ticket/resendceo`, {
                ticket_id: row.id,
              });
              alert(`Ticket resent`);
            } catch (error) {
              alert(error.response?.data?.message);
            } finally {
              setRefreshbtn(true);
            }
          }
        } else if (type == "Reminder") {
          setModalReminder(true);
          setSelectedRow(row);
        } else {
          // <Navigate to={`/form/${row.id}`} />;
          navigate(`../form/${row.id}`, { relative: "path" });
          setLoader(true);
        }
      } catch (error) {
        console.error(error);
      }
    },
    [ticket]
  );

  const popUpFeedback = e => {
    setAnchorel(e.target);
    setBtn(true);
    setGrow(true);
    setTimeout(() => {
      setBtn(false);
    }, 1000);
  };

  const columnTable = useMemo(
    () => [
      {
        field: "ticket_num",
        type: "string",
        headerName: "Ticket Number",
        width: 150,
      },
      {
        field: "updated_at",
        type: "string",
        headerName: "Updated Date",
        width: 180,
      },
      {
        field: "updated_by",
        type: "string",
        headerName: "Updated By",
        width: 150,
      },
      {
        field: "date_ticket",
        type: "string",
        headerName: "Created Date",
        width: 180,
      },
      {
        field: "assignee",
        type: "string",
        headerName: "Assignee",
        width: 250,
      },
      {
        field: "vendor_name",
        type: "string",
        headerName: "Vendor Name",
        width: 250,
      },
      {
        field: "vendor_code",
        type: "string",
        headerName: "Vendor Code",
        width: 150,
      },
      {
        field: "current_position",
        type: "string",
        headerName: "Position",
        width: 300,
      },
      {
        field: "status_ticket",
        type: "string",
        headerName: "Status",
        width: 150,
        renderCell: item => {
          let status = item.row.status_ticket;
          let severity;
          let text;
          if (status === "ON PROCESS") {
            severity = "warning.main";
            text = "black";
          } else if (status === "REJECT") {
            severity = "error.main";
            text = "white";
          } else if (status === "DONE") {
            severity = "success.main";
            text = "white";
          }
          return (
            <>
              <ProgressStat color={severity}>
                <Typography color={text} variant="body">
                  {status}
                </Typography>
              </ProgressStat>
            </>
          );
        },
      },
      {
        field: "action",
        type: "actions",
        width: 150,
        renderCell: item => {
          let Buttons = [];
          if (item.row.is_active == true) {
            if (item.row.cur_pos == "VENDOR") {
              Buttons.push(
                <Tooltip key={item.id} title="Link">
                  <IconButton
                    onClick={handleButtonAction("Link", item.row)}
                    onClose={handleOnBtnClose}
                  >
                    <Link />
                  </IconButton>
                </Tooltip>
              );
              if (item.row.is_expired) {
                Buttons.push(
                  <Tooltip key={item.id} title="Extend Expiry">
                    <IconButton onClick={handleButtonAction("Extend", item.row)}>
                      <Update />
                    </IconButton>
                  </Tooltip>
                );
              }
            }
            if (
              ((item.row.approval_pos == "0" || item.row.emp_role_id == "STAFF") &&
                item.row.proc_id == user_id) ||
              emp_role_id == "ADMIN"
            ) {
              Buttons.push(
                <Tooltip key={item.id} title="Delete Ticket">
                  <IconButton onClick={handleButtonAction("Delete", item.row)}>
                    <Delete />
                  </IconButton>
                </Tooltip>
              );
            }
            if (
              item.row.approval_pos != "0" &&
              item.row.emp_role_id != "STAFF" &&
              item.row.cur_pos != "VENDOR" &&
              item.row.emp_role_id != "MDM"
            ) {
              Buttons.push(
                <Tooltip key={item.id} title="Reminder Email">
                  <IconButton onClick={handleButtonAction("Reminder", item.row)}>
                    <NotificationsActive />
                  </IconButton>
                </Tooltip>
              );
            }
            if (
              (item.row.cur_pos == emp_role_id &&
                item.row.bu_id == bu_id &&
                item.row.dept_id_ticket == dept_id &&
                item.row.proc_id == user_id) ||
              emp_role_id == "ADMIN"
            ) {
              Buttons.push(
                <Tooltip key={item.id} title="Edit">
                  <IconButton onClick={handleButtonAction("Edit", item.row)}>
                    <Edit />
                  </IconButton>
                </Tooltip>
              );
            } else {
              Buttons.push(
                <Tooltip key={item.id} title="View">
                  <IconButton
                    onClick={handleButtonAction("View", item.row)}
                    onClose={handleOnBtnClose}
                  >
                    <Visibility />
                  </IconButton>
                </Tooltip>
              );
            }
          } else {
            Buttons.push(
              <Tooltip key={item.id} title="View">
                <IconButton
                  onClick={handleButtonAction("View", item.row)}
                  onClose={handleOnBtnClose}
                >
                  <Visibility />
                </IconButton>
              </Tooltip>
            );
          }
          return Buttons;
        },
      },
    ],
    [perm, emp_role_id, dept_id, bu_id, user_id]
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
      <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        <Box sx={{ display: "flex", gap: 2, width: "100%", alignItems: "center" }}>
          <FormControl>
            <Select
              sx={{ width: "10em" }}
              id={"filterAct"}
              value={filterAct}
              onChange={e => {
                setFilteract(e.target.value);
                setRefreshbtn(true);
              }}
            >
              <MenuItem value={true}>Active</MenuItem>
              <MenuItem value={false}>Inactive</MenuItem>
              <MenuItem value={"SAP"}>O/S SAP Push</MenuItem>
            </Select>
          </FormControl>
          <SearchFieldComp setQuery={setQ} placeholder={"Search Vendor Code or Ticket Number..."} />
          <RefreshTable
            setRefreshbtn={buttonRefreshAct}
            isLoading={refreshBtn}
            sx={{ mb: 3, height: "3.5rem" }}
          />
          <Box
            sx={theme => ({
              display: "flex",
              gap: 2,
              alignItems: "center",
              backgroundColor: theme.palette.grey[300],
              px: 2,
              py: 1,
              borderRadius: "4px",
            })}
          >
            <Checkbox
              id="showall"
              checked={showAll}
              onChange={() => {
                setShowAll(prev => !prev);
              }}
            />
            <p>Show All</p>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          {perm.Table?.create && (
            <Button
              variant="contained"
              sx={{ width: 180, height: 50, my: 2 }}
              onClick={() => {
                setOpenmodal(true);
              }}
            >
              Create New Vendor
            </Button>
          )}
          {bu_id == "CG" && (
            <>
              <TooltipButton
                placement={"top"}
                TooltipText={"Vendor Search Info"}
                Icon={<InfoOutlined />}
                OnClick={e => {
                  setOpenModalInfo(prev => !prev);
                  setModalInfoAnc(e.currentTarget);
                }}
                sx={{ height: "40px" }}
              />
              <ModalShowDataVendor
                open={openModalInfo}
                setOpen={setOpenModalInfo}
                anchorEl={modalInfoAnc}
                initiateQ={""}
              />
            </>
          )}
        </Box>
      </Box>
      {ticket !== undefined && typeof filterAct == "boolean" && (
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
              rows={showAll ? ticket : userOnlyTicket}
              columns={columnTable}
              disableColumnFilter
              disableColumnSelector
              disableDensitySelector
              hideFooterPagination
            />
          </Box>
        </Box>
      )}
      {ticket === undefined && (
        <Box>
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
          <Skeleton animation="wave" height={100} />
        </Box>
      )}
      {filterAct == "SAP" && (
        <ListSAPProgress refreshBtn={refreshBtn} setRefreshBtn={setRefreshbtn} />
      )}

      <ModalCreateTicket
        open={openModal}
        onClose={handleOnClose}
        popUp={popUpFeedback}
        onClick={copyToClipboard}
        refresh={buttonRefreshAct}
      />
      <Popper open={btnTicket} anchorEl={anchorEl} transition sx={{ zIndex: 3000 }}>
        {({ TransitionProps }) => {
          return (
            <Grow {...TransitionProps} in={btnTicket} timeout={350}>
              <Paper sx={{ border: 1, p: 1, bgcolor: "background.paper" }}>
                Link Form Copied !
              </Paper>
            </Grow>
          );
        }}
      </Popper>
      <Backdrop sx={{ color: "#fff", zIndex: theme => theme.zIndex.drawer - 2 }} open={loader}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <DialogFormConfirmation
        open={modalConf}
        children={<></>}
        onYes={deleteActionFunc}
        onNo={() => {
          setModalConf(false);
        }}
        values={selectedRow}
        Title={<TitleConfirDelete row={selectedRow} />}
      />

      <DialogFormConfirmation
        open={modalReminder}
        children={
          <Box sx={{ p: 3 }}>
            <p>Are you sure want to give reminder to {selectedRow?.current_position ?? ""}</p>
          </Box>
        }
        onYes={reminderApproval}
        onNo={() => {
          setModalReminder(false);
        }}
        values={selectedRow}
        Title={<TitleReminderEmail row={selectedRow} />}
      />
    </Box>
  );
}
