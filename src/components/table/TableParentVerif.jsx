import { flexRender, getCoreRowModel, useReactTable, getExpandedRowModel } from '@tanstack/react-table';
import { TableContainer, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Box, Grid } from '@mui/material';
import {
  KeyboardArrowRight,
  KeyboardArrowDown,
  Edit,
  Outbox,
  CheckCircleOutline,
  CancelOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import TableChildVerif from './TableChildVerif';
import { useEffect, useMemo, useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Fragment } from 'react';
import { useTheme } from '@mui/material/styles';
import TooltipButton from '../common/TooltipButton';
import DialogFormConfirmation from '../common/DialogFormConfirmation';
import { TextFieldComp } from '../common/TextFieldComp';
import { useForm } from 'react-hook-form';
import { useSnackBar } from 'src/provider/SnackbarProvider';
import { useNavigate, Link } from 'react-router-dom';
import RefreshButton from '../common/RefreshButton';

const ThumbnailVendor = ({ data_ven }) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={1}>
        <Grid item xs={3}>
          <p>Vendor Name</p>
        </Grid>
        <Grid item xs={1}>
          <p>:</p>
        </Grid>
        <Grid item xs={8}>
          <p>{data_ven.name_1}</p>
        </Grid>
      </Grid>
      <Grid container>
        <Grid item xs={3}>
          <p>Email PIC</p>
        </Grid>
        <Grid item xs={1}>
          <p>:</p>
        </Grid>
        <Grid item xs={8}>
          <p>{data_ven.email_pic}</p>
        </Grid>
      </Grid>
    </Box>
  );
};

const ApproveDialog = ({ data_ven }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', p: 3 }}>
      <h2>Approve Verification Vendor ?</h2>
      <ThumbnailVendor data_ven={data_ven} />
    </Box>
  );
};
const RejectDialog = ({ control, data_ven }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', p: 3 }}>
      <h2>Reject Verification Vendor ?</h2>
      <ThumbnailVendor data_ven={data_ven} />
      <TextFieldComp
        name="remarks"
        label="Rejection Remarks"
        control={control}
        sx={{ width: '50rem' }}
        rules={{ required: 'Please insert this field' }}
      />
    </Box>
  );
};

export default function TableParentVerif() {
  const theme = useTheme();
  const { openSnackbar } = useSnackBar();
  const axiosPrivate = useAxiosPrivate();
  const [data_verif, setDataVerif] = useState([]);
  const navigate = useNavigate();
  const [refresh, _setRefresh] = useState(false);
  const [successModal, setScsModal] = useState(false);
  const [openDialog, setOpenDialog] = useState({ state: false, action: '' });
  const [selected, setSelected] = useState({});
  const { trigger, control, getValues } = useForm({
    defaultValues: {
      remarks: '',
    },
  });

  const setRefresh = (value) => {
    _setRefresh(value);
  };

  const onNo = () => {
    setOpenDialog((prev) => ({ ...prev, state: false }));
  };

  const buttonAction = async (action, data) => {
    if (action === 'view') {
      navigate({
        pathname: `/dashboard/form/${data.token}`,
      });
    } else if (action === 'approve') {
      setSelected(data);
      setOpenDialog({ state: true, action: 'approve' });
    } else if (action === 'reject') {
      setSelected(data);
      setOpenDialog({ state: true, action: 'reject' });
    }
  };

  const handleApprove = async (values) => {
    try {
      console.log(values);
      const { data } = await axiosPrivate.post('/vendor/verif', {
        verified: 1,
        ven_id: values.ven_id,
      });
      openSnackbar('success', data.message);
      setOpenDialog((prev) => ({ ...prev, state: false }));
      setRefresh(true);
    } catch (error) {
      console.error(error);
      openSnackbar('error', error.response.data.message);
      throw error;
    }
  };

  const handleReject = async (values) => {
    const is_valid = await trigger();
    if (is_valid) {
      try {
        const { data } = await axiosPrivate.post('/vendor/verif', {
          verified: 1,
          ven_id: values.ven_id,
          reject_notes: getValues('remarks'),
        });
        openSnackBar('success', data.message);
        setOpenDialog((prev) => ({ ...prev, state: false }));
        setRefresh(true);
      } catch (error) {
        console.error(error);
        openSnackBar('error', error.response.data.message);
      }
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'expand',
        enableSorting: false,
        size: 1,
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <>
              <IconButton {...{ onClick: row.getToggleExpandedHandler() }}>
                {row.getIsExpanded() ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
              </IconButton>
            </>
          ) : (
            ''
          );
        },
      },
      {
        header: 'Vendor Code',
        accessorKey: 'ven_code',
        size: 5,
        cell: (props) => props.getValue(),
      },
      {
        header: 'Name',
        accessorKey: 'name_1',
        size: 10,
        cell: (props) => props.getValue(),
      },
      {
        header: 'Email PIC',
        accessorKey: 'email_pic',
        size: 10,
        cell: (props) => props.getValue() ?? '',
      },
      {
        header: 'No Telf PIC',
        accessorKey: 'no_telf_pic',
        size: 10,
        cell: (props) => props.getValue(),
      },
      {
        header: 'Email Requestor',
        accessorKey: 'email_requestor',
        size: 10,
        cell: (props) => props.getValue() ?? '',
      },
      {
        id: 'action_but',
        enableSorting: false,
        size: 10,
        cell: (props) => {
          let buttons = [];
          buttons.push(
            <TooltipButton
              Icon={<CheckCircleOutline />}
              TooltipText={'Approve'}
              OnClick={(e) => buttonAction('approve', props.row.original)}
            />
          );
          buttons.push(
            <TooltipButton
              Icon={<CancelOutlined />}
              TooltipText={'Reject'}
              OnClick={(e) => buttonAction('reject', props.row.original)}
            />
          );
          buttons.push(
            <Link to={`/dashboard/form/${props.row.original.token}`} target="_blank" rel="noopener noreferrer">
              <TooltipButton Icon={<VisibilityOutlined />} TooltipText={'View'} />
            </Link>
          );
          return <Box sx={{ display: 'flex' }}>{buttons}</Box>;
        },
      },
    ],
    []
  );

  const table = useReactTable({
    columns,
    data: data_verif,
    getRowId: (row) => row.ven_id,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosPrivate.get('/vendor/verif');
        setDataVerif(data.data);
      } catch (error) {
        console.error(error);
        toast.error(error.response.data.message);
      } finally {
        if (refresh) {
          setRefresh(false);
        }
      }
    })();
  }, [refresh]);

  return (
    <>
      <DialogFormConfirmation
        open={openDialog.state}
        onNo={onNo}
        onYes={openDialog.action === 'approve' ? handleApprove : handleReject}
        title={openDialog.action === 'approve' ? 'Approve Verification' : 'Reject Verification'}
        values={selected}
      >
        {openDialog.action === 'approve' ? (
          <ApproveDialog data_ven={selected} />
        ) : (
          <RejectDialog data_ven={selected} control={control} />
        )}
      </DialogFormConfirmation>
      <Box>
        <RefreshButton isLoading={refresh} setRefreshbtn={setRefresh} />
      </Box>
      <TableContainer sx={{ height: '100%' }}>
        <Table stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => {
              return (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableCell key={header.id} colSpan={header.colSpan} sx={{ width: `${header.column.getSize()}%` }}>
                        {header.isPlaceholder ? null : (
                          <div
                            style={{
                              display: 'flex',
                              alignContent: 'center',
                            }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              return (
                <Fragment key={row.id}>
                  <TableRow hover>
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      );
                    })}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow key={'rowchild' + row.id}>
                      <TableCell key={'rowcell' + row.id} colSpan={row.getVisibleCells().length}>
                        <>
                          <TableChildVerif dataChild={row.original.bank} />
                        </>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
