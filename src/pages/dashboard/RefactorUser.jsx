import TableLayout from 'src/components/common/TableLayout';
import { useState, useEffect } from 'react';
import { Box, Button, Typography, Tooltip, IconButton } from '@mui/material';
import { DoDisturb, Edit, SystemUpdate } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { DataGrid, GridToolbarContainer, GridToolbarQuickFilter } from '@mui/x-data-grid';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';

const header = ['Full Name', 'Username', 'Email', 'User Group', 'Role', 'Date Created', 'Date Expired'];

const Toolbar = () => {
  return (
    <GridToolbarContainer>
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );
};

export default function User() {
  const axiosPrivate = useAxiosPrivate();
  const [colLen, setCollen] = useState(0);
  const [allUserDt, setAllUsr] = useState();
  const [load, setLoad] = useState(false);

  const navigate = useNavigate();

  const buttonNewUser = () => {
    navigate('./create');
  };

  useEffect(() => {
    const controller = new AbortController();
    const getAllDataUser = async () => {
      const getUser = await axiosPrivate.get(`/user/`, { signal: controller.signal });
      // console.log(getUser.data.data);
      setAllUsr(getUser.data.data);
      setCollen(Object.entries(getUser.data.data[0]).length);
      setLoad(false);
    };
    getAllDataUser();
    return () => {
      controller.abort();
    };
  }, [load]);

  const buttonAction = async (action, data) => {
    setLoad(true);
    if (action === 'edit') {
      navigate(
        {
          pathname: './create',
          search: `?iduser=${data.id}`,
        },
        {
          state: {
            page: 'user',
          },
        }
      );
    } else if (action === 'deactivate') {
      if (confirm('are you sure want to deactivate ?')) {
        try {
          const updateUser = await axiosPrivate.post('/user/updatestat', {
            id: data.id,
            role: data.role,
            is_active: false,
          });
          alert(`${updateUser.data.message}`);
          setLoad(false);
        } catch (error) {
          alert(`${error.response.data.message}`);
          setLoad(false);
        }
      }
    } else if (action === 'activate') {
      if (confirm('are you sure want to activate ?')) {
        try {
          const updateUser = await axiosPrivate.post('/user/updatestat', {
            id: data.id,
            role: data.role,
            is_active: true,
          });
          alert(`${updateUser.data.message}`);
          setLoad(false);
        } catch (error) {
          alert(`${error.response.data.message}`);
          setLoad(false);
        }
      }
    }
  };

  const column = [
    {
      field: 'fullname',
      headerName: 'Full Name',
      flex: 0.1,
    },
    {
      field: 'username',
      headerName: 'Username',
      flex: 0.1,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 0.1,
    },
    {
      field: 'user_group_name',
      headerName: 'User Group',
      flex: 0.05,
    },
    {
      field: 'role',
      headerName: 'Role',
      flex: 0.05,
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      flex: 0.05,
    },
    {
      field: 'expired_date',
      headerName: 'Expired Date',
      flex: 0.05,
    },
    {
      headerName: 'Action',
      flex: 0.1,
      renderCell: (item) => {
        let is_active = item.row.is_active;
        let buttons = [];
        buttons.push(
          <Tooltip title={<Typography>Edit</Typography>}>
            <IconButton
              sx={{ backgroundColor: 'primary.light', mx: 1 }}
              onClick={() => buttonAction('edit', { id: item.row.id })}
            >
              <Edit></Edit>
            </IconButton>
          </Tooltip>
        );
        if (is_active) {
          buttons.push(
            <Tooltip title={<Typography>Deactivate</Typography>}>
              <IconButton
                sx={{ backgroundColor: '#f2573f', mx: 1 }}
                onClick={() => buttonAction('deactivate', { id: item.row.id, role: item.row.role })}
              >
                <DoDisturb></DoDisturb>
              </IconButton>
            </Tooltip>
          );
        } else {
          buttons.push(
            <Tooltip title={<Typography>Activate</Typography>}>
              <IconButton
                sx={{ backgroundColor: '#4ef542', mx: 1 }}
                onClick={() => buttonAction('activate', { id: item.row.id, role: item.row.role })}
              >
                <SystemUpdate></SystemUpdate>
              </IconButton>
            </Tooltip>
          );
        }
        return buttons;
      },
    },
  ];

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button sx={{ width: 200, heigth: 50, margin: 2 }} variant="contained" onClick={buttonNewUser}>
          <Typography>Create New User</Typography>
        </Button>
      </Box>
      {allUserDt != undefined ? (
        <DataGrid
          rows={allUserDt}
          columns={column}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 5,
              },
            },
          }}
          slots={{ toolbar: Toolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
        />
      ) : (
        <></>
      )}
    </>
  );
}
