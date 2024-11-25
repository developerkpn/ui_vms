import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import TableSimple from 'src/components/table/TableSimple';
import SearchFieldComp from 'src/components/common/SearchFieldComp';
import { createColumnHelper } from '@tanstack/react-table';
import { Edit } from '@mui/icons-material';
import moment from 'moment';
import { useMemo, useState, useEffect } from 'react';
import { Box } from '@mui/material';
import TooltipButton from 'src/components/common/TooltipButton';
import RefreshButton from 'src/components/common/RefreshButton';
import { useNavigate } from 'react-router-dom';

const columnHelper = createColumnHelper();

export default function OSTicketReqEdit() {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const [rowData, setRowData] = useState([]);
  const [que, setQue] = useState('');
  const [refresh, setRefresh] = useState(true);

  useEffect(() => {
    if (refresh) {
      (async () => {
        try {
          const { data } = await axiosPrivate.get(`/ticeddet/getostic?q=${que}`);
          setRowData(data.data);
        } catch (error) {
          console.error(error);
        } finally {
          setRefresh(false);
        }
      })();
    }
  }, [que, refresh]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('ticket_num', {
        header: 'Ticket Number',
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor('updated_at', {
        header: 'Last Updated',
        cell: ({ getValue }) => moment(getValue()).format('YYYY-MM-DD T HH:mm:ss'),
      }),
      columnHelper.accessor('created_by', {
        header: 'Assigner',
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor('role_name', {
        header: 'Current Position',
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.display({
        header: 'Action',
        id: 'action',
        cell: ({ row }) => {
          return (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TooltipButton
                Icon={<Edit />}
                TooltipText={'Process'}
                OnClick={(e) => {
                  console.log(row.original.id);
                  navigate(`/dashboard/editreq/form?id=${row.original.id}`);
                }}
              />
            </Box>
          );
        },
      }),
    ],
    []
  );
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <SearchFieldComp setQuery={setQue} placeholder={'Search Ticket Number ...'} />
        <RefreshButton setRefreshbtn={setRefresh} isLoading={refresh} sx={{ height: '3rem' }} />
      </Box>
      <TableSimple columns={columns} rowsData={rowData} />
    </Box>
  );
}
