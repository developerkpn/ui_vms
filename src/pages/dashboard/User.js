import TableLayout from 'src/components/common/TableLayout';
import { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import axios from 'axios';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';

const usersMock = [
  {
    id: '123121102i3',
    'Full Name': 'Rara Sekar',
    'User Name': 'RarSek',
    Email: 'rarasekar@gmail.com',
    Department: 'PROC',
    Role: 'USER',
  },
  {
    id: '9812031203',
    'Full Name': 'Isyana S',
    'User Name': 'Isya_s',
    Email: 'isyanas@gmail.com',
    Department: 'MDM',
    Role: 'USER',
  },
];

const header = ['Full Name', 'Username', 'Email', 'User Group', 'Role', 'Date Created', 'Date Expired'];

export default function User() {
  const axiosPrivate = useAxiosPrivate();
  const [colLen, setCollen] = useState(0);
  const [allUserDt, setAllUsr] = useState();

  const navigate = useNavigate();

  const buttonNewUser = () => {
    navigate('./create');
  };

  useEffect(() => {
    const controller = new AbortController();
    const getAllDataUser = async () => {
      const getUser = await axiosPrivate.get(`/user/`, {
        signal: controller.signal,
      });
      // console.log(getUser.data.data);
      setAllUsr(getUser.data.data);
      setCollen(Object.entries(getUser.data.data[0]).length);
    };
    getAllDataUser();
    return () => {
      controller.abort();
    };
  }, []);

  const buttonAction = (action, id) => {
    if (action === 'edit') {
      navigate(
        {
          pathname: './create',
          search: `?iduser=${id}`,
        },
        {
          state: {
            page: 'user',
          },
        }
      );
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button sx={{ width: 200, heigth: 50, margin: 2 }} variant="contained" onClick={buttonNewUser}>
          <Typography>Create New User</Typography>
        </Button>
      </Box>
      {allUserDt != undefined ? (
        <TableLayout
          data={allUserDt}
          buttons={['edit', 'deactive']}
          lengthRow={colLen}
          onAction={buttonAction}
          header={header}
        ></TableLayout>
      ) : (
        <></>
      )}
    </>
  );
}
