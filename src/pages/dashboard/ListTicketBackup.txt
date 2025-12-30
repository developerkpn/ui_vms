import { DataGrid, GridToolbar, GridToolbarContainer } from '@mui/x-data-grid';
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
} from '@mui/material';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Edit, Link, Visibility, Delete, Refresh, Update } from '@mui/icons-material';
import ModalCreateTicket from 'src/components/common/ModalCreateTicket';
import usePermissionStore from 'src/store/userPermissionStore';
import { useNavigate } from 'react-router-dom';
import ProgressStat from 'src/components/common/ProgressStat';
import moment from 'moment';
import ListSAPProgress from './ListSAPProgress';

const overrides = {
  '& .MuiDataGrid-main': {},
  maxHeigth: '100%',
};

function RefreshTable(props) {
  const refreshBtn = () => {
    props.setRefreshbtn(true);
  };
  return (
    <Tooltip title={<Typography>Refresh</Typography>}>
      <span>
        <Button onClick={refreshBtn} sx={props.sx} variant={'contained'} disabled={props.isLoading}>
          {props.isLoading ? <CircularProgress /> : <Refresh />}
        </Button>
      </span>
    </Tooltip>
  );
}

export default function ListTicket() {
  const permission = usePermissionStore((state) => state.permission);
  const [perm, setPerm] = useState({
    Table: permission['Ticket Request'],
    INIT: permission['Initial Form'],
    CREA: permission['Creation Form'],
    FINA: permission['Final Form'],
  });
  const [ticket, setTicket] = useState();
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

  const showTicket = async (ticketState, controller) => {
    const response = await axiosPrivate.get(
      `/ticket/?is_active=${filterAct}&ticket_state=${
        ticket_state.length === 0 ? ticketState.join(',') : ticket_state.join(',')
      }`,
      {
        signal: controller.signal,
      }
    );
    const result = response.data.data;
    const load = result.data.map((item) => ({
      id: item.token,
      is_active: item.is_active,
      ticket_num: item.ticket_id,
      updated_at: moment(item.updated_at).format('DD/MM/YYYY T HH:mm:ss'),
      updated_by: item.updated_by,
      date_ticket: moment(item.created_at).format('DD/MM/YYYY T HH:mm:ss'),
      assignee: item.email,
      cur_pos: item.cur_pos,
      status_ticket: item.status_ticket,
      vendor_name: item.name_1,
      vendor_code: item.ven_code,
      ticket_state: item.ticket_state,
      is_expired: item.is_expired,
    }));
    setTicket(load);
  };

  const tickets = async (controller) => {
    let permissiontemp = {};
    permissiontemp['INIT'] = permission['Initial Form'];
    permissiontemp['CREA'] = permission['Creation Form'];
    permissiontemp['FINA'] = permission['Final Form'];
    try {
      let ticketState = [];
      // axios.defaults.headers.common.Authorization =
      //   'Bearer ' + (Cookies.get('accessToken') === undefined ? '' : Cookies.get('accessToken'));
      if (permissiontemp.INIT?.read) {
        ticketState.push("'INIT'");
      }
      if (permissiontemp.CREA?.read) {
        ticketState.push("'CREA'");
      }
      if (permissiontemp.FINA?.read) {
        ticketState.push("'FINA'");
      }
      setTicketstate(ticketState);
      if (typeof filterAct == 'boolean') {
        await showTicket(ticketState, controller);
      }
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
    if (refreshBtn && Object.keys(permission).length !== 0) {
      tickets(controller);
    }
    return () => {
      controller.abort();
    };
  }, [filterAct, deleted, refreshBtn, permission]);

  useEffect(() => {
    let permissiontemp = {};
    permissiontemp['Table'] = permission['Ticket Request'];
    permissiontemp['INIT'] = permission['Initial Form'];
    permissiontemp['CREA'] = permission['Creation Form'];
    permissiontemp['FINA'] = permission['Final Form'];
    setPerm(permissiontemp);
  }, [permission]);

  const handleOnClose = () => {
    setOpenmodal(false);
  };

  const handleOnBtnClose = () => () => {
    setBtn(false);
  };

  const buttonRefreshAct = () => {
    setRefreshbtn(true);
  };

  const copyToClipboard = useCallback(async (textToCopy) => {
    // Navigator clipboard api needs a secure context (https)
    // Use the 'out of viewport hidden text area' trick
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy.toString();

    // Move textarea out of the viewport so it's not visible
    textArea.style.position = 'absolute';
    textArea.style.left = '-999999px';
    textArea.tabIndex = '-1';

    document.body.appendChild(textArea);
    textArea.select();
    textArea.focus();

    try {
      const hey = document.execCommand('copy');
    } catch (error) {
      console.error(error);
    } finally {
      textArea.remove();
    }
  }, []);

  const handleButtonAction = useCallback(
    (type, row) => async (e) => {
      try {
        if (type === 'Link') {
          if (navigator.clipboard === undefined) {
            await copyToClipboard(`${location.protocol}/${location.host}/frm/newform/${row.id}`);
          } else {
            navigator.clipboard.writeText(`${location.protocol}/${location.host}/frm/newform/${row.id}`);
          }
          setAnchorel(e.target);
          setBtn(true);
          setGrow(true);
          setTimeout(() => {
            setBtn(false);
          }, 1000);
        } else if (type === 'Delete') {
          const deleteTicket = await axiosPrivate.delete(`/ticket/${row.id}`);
          setDelete(!deleted);
          setRefreshbtn(true);
          alert(`Ticket ${deleteTicket.data.data} is deleted`);
        } else if (type === 'Extend') {
          if (confirm('Are you sure want to extend ? (+1 day)')) {
            const extendTicket = await axiosPrivate.post(`/ticket/extexp`, {
              ticket_id: row.id,
            });
            alert(`Ticket ${extendTicket.data.ticket_num} expiry date extended`);
            setRefreshbtn(true);
          }
        } else if (type === 'RESEND') {
          if (confirm('Are you sure want to resend request to CEO ?')) {
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
        } else {
          // <Navigate to={`/form/${row.id}`} />;
          navigate(`../form/${row.id}`, { relative: 'path' });
          setLoader(true);
        }
      } catch (error) {
        console.error(error);
      }
    },
    [ticket]
  );

  const popUpFeedback = (e) => {
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
        field: 'ticket_num',
        type: 'string',
        headerName: 'Ticket Number',
        width: 150,
      },
      {
        field: 'updated_at',
        type: 'string',
        headerName: 'Updated Date',
        width: 180,
      },
      {
        field: 'updated_by',
        type: 'string',
        headerName: 'Updated By',
        width: 150,
      },
      {
        field: 'date_ticket',
        type: 'string',
        headerName: 'Created Date',
        width: 180,
      },
      {
        field: 'assignee',
        type: 'string',
        headerName: 'Assignee',
        width: 250,
      },
      {
        field: 'vendor_name',
        type: 'string',
        headerName: 'Vendor Name',
        width: 250,
      },
      {
        field: 'vendor_code',
        type: 'string',
        headerName: 'Vendor Code',
        width: 150,
      },
      {
        field: 'cur_pos',
        type: 'string',
        headerName: 'Position',
        width: 150,
      },
      {
        field: 'status_ticket',
        type: 'string',
        headerName: 'Status',
        width: 150,
        renderCell: (item) => {
          let status = item.row.status_ticket;
          let severity;
          let text;
          if (status === 'ON PROCESS') {
            severity = 'warning.main';
            text = 'black';
          } else if (status === 'REJECT') {
            severity = 'error.main';
            text = 'white';
          } else if (status === 'ACCEPTED') {
            severity = 'success.main';
            text = 'white';
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
        field: 'action',
        type: 'actions',
        width: 150,
        renderCell: (item) => {
          let Buttons = [];
          if (item.row.is_active == true) {
            if (item.row.ticket_state == 'INIT') {
              if (perm.INIT.create) {
                Buttons.push(
                  <Tooltip key={item.id} title="Link">
                    <IconButton onClick={handleButtonAction('Link', item.row)} onClose={handleOnBtnClose}>
                      <Link />
                    </IconButton>
                  </Tooltip>
                );
                if (item.row.is_expired) {
                  Buttons.push(
                    <Tooltip key={item.id} title="Extend Expiry">
                      <IconButton onClick={handleButtonAction('Extend', item.row)}>
                        <Update />
                      </IconButton>
                    </Tooltip>
                  );
                }
              } else if (perm.INIT.read) {
                Buttons.push(
                  <Tooltip key={item.id} title="View">
                    <IconButton onClick={handleButtonAction('View', item.row)} onClose={handleOnBtnClose}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                );
              }
              if (perm.INIT.delete) {
                Buttons.push(
                  <Tooltip key={item.id + '_delete'} title="Delete">
                    <IconButton onClick={handleButtonAction('Delete', item.row)} onClose={handleOnBtnClose}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                );
              }
            }
            if (item.row.ticket_state == 'CREA') {
              if (perm.CREA.update) {
                Buttons.push(
                  <Tooltip key={item.id} title="Edit">
                    <IconButton onClick={handleButtonAction('Edit', item.row)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                );
              } else if (perm.CREA.read) {
                Buttons.push(
                  <Tooltip key={item.id} title="View">
                    <IconButton onClick={handleButtonAction('View', item.row)} onClose={handleOnBtnClose}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                );
              }
            }
            if (item.row.ticket_state == 'FINA') {
              if (perm.FINA.update && item.row.cur_pos !== 'CEO') {
                Buttons.push(
                  <Tooltip key={item.id} title="Edit">
                    <IconButton onClick={handleButtonAction('Edit', item.row)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                );
              } else if (perm.FINA.read) {
                Buttons.push(
                  <Tooltip key={item.id} title="View">
                    <IconButton onClick={handleButtonAction('View', item.row)} onClose={handleOnBtnClose}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                );
                // if (item.row.cur_pos === 'CEO') {
                //   Buttons.push(
                //     <Tooltip key={item.id} title="Resend CEO">
                //       <IconButton onClick={handleButtonAction('RESEND', item.row)} onClose={handleOnBtnClose}>
                //         <MailOutline />
                //       </IconButton>
                //     </Tooltip>
                //   );
                // }
              }
            }
          } else {
            Buttons.push(
              <Tooltip key={item.id} title="View">
                <IconButton onClick={handleButtonAction('View', item.row)} onClose={handleOnBtnClose}>
                  <Visibility />
                </IconButton>
              </Tooltip>
            );
          }
          return Buttons;
        },
      },
    ],
    [perm]
  );

  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <FormControl>
            <Select
              sx={{ width: '10em' }}
              id={'filterAct'}
              value={filterAct}
              onChange={(e) => {
                setFilteract(e.target.value);
                setRefreshbtn(true);
              }}
            >
              <MenuItem value={true}>Active</MenuItem>
              <MenuItem value={false}>Inactive</MenuItem>
              <MenuItem value={'SAP'}>O/S SAP Push</MenuItem>
            </Select>
          </FormControl>
          <RefreshTable setRefreshbtn={buttonRefreshAct} isLoading={refreshBtn} sx={{ mb: 3, height: '3.5rem' }} />
        </Box>
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
      </Box>
      {ticket !== undefined && typeof filterAct == 'boolean' && (
        <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ width: '100%', height: '88%' }}>
            <DataGrid
              sx={overrides}
              rows={ticket}
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
      {filterAct == 'SAP' && <ListSAPProgress refreshBtn={refreshBtn} setRefreshBtn={setRefreshbtn} />}

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
              <Paper sx={{ border: 1, p: 1, bgcolor: 'background.paper' }}>Link Form Copied !</Paper>
            </Grow>
          );
        }}
      </Popper>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer - 2 }} open={loader}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
}
