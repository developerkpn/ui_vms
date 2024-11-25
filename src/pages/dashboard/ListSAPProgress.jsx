import TableSimple from 'src/components/table/TableSimple';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import { createColumnHelper } from '@tanstack/react-table';
import moment from 'moment';
import { useEffect, useState, useMemo } from 'react';
import ProgressStat from 'src/components/common/ProgressStat';
import { Typography } from '@mui/material';

const ProgressStatBadge = ({ is_pushsap, error_code }) => {
  let severity;
  let text;
  let status;
  if (is_pushsap) {
    severity = 'success.main';
    text = 'white';
    status = 'SUCCESS';
  } else {
    if (error_code) {
      severity = 'error.main';
      text = 'white';
      status = 'ERROR - ' + error_code;
    } else {
      severity = 'warning.main';
      text = 'black';
      status = 'ON PROGRESS';
    }
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
};
const columnHelper = createColumnHelper();
export default function ListSAPProgress({ refreshBtn, setRefreshBtn }) {
  const [dataSAP, setData] = useState([]);
  const axiosPrivate = useAxiosPrivate();
  useEffect(() => {
    (async () => {
      if (refreshBtn) {
        try {
          const { data } = await axiosPrivate.get('/vendor/getprogsync');
          setData(data.data);
        } catch (error) {
          console.error(error);
        } finally {
          if (refreshBtn) {
            setRefreshBtn(false);
          }
        }
      }
    })();
    let intervalFunc = setInterval(
      async () => {
        if (refreshBtn) {
          try {
            const { data } = await axiosPrivate.get('/vendor/getprogsync');
            setData(data.data);
          } catch (error) {
            console.error(error);
          } finally {
            if (refreshBtn) {
              setRefreshBtn(false);
            }
          }
        }
      },
      1000 * 60 * 5
    );

    return () => clearInterval(intervalFunc);
  }, [refreshBtn]);
  const columns = useMemo(
    () => [
      columnHelper.accessor('ven_code', {
        header: 'Vendor Code',
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor('name_1', {
        header: 'Vendor Name',
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor('updated_at', {
        header: 'Last Updated',
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const data = row.original;
          return <ProgressStatBadge is_pushsap={data.is_pushsap} error_code={data.error_code} />;
        },
      }),
      columnHelper.accessor('error_msg', {
        header: 'Error Message',
        cell: ({ getValue }) => getValue(),
      }),
    ],
    []
  );
  return (
    <div>
      <TableSimple columns={columns} rowsData={dataSAP} />
    </div>
  );
}
