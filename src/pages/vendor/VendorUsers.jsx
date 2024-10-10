import TablePaginate from 'src/components/table/TablePaginate';
import SearchFieldComp from 'src/components/common/SearchFieldComp';

import { useState, useEffect, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import { Link } from 'react-router-dom';
import TooltipButton from 'src/components/common/TooltipButton';
import { VisibilityOutlined } from '@mui/icons-material';

const columnHelper = createColumnHelper();

export default function VendorUsers() {
  const [que, setQue] = useState('');
  const [data, setData] = useState({
    data: [],
    count: 0,
  });
  const [paginate, setPaginate] = useState({
    pageSize: 10,
    pageIndex: 0,
  });
  const axiosPrivate = useAxiosPrivate();
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosPrivate.get(
          `/vendor/verified?limit=${paginate.pageSize}&offset=${paginate.pageIndex}&q=${que}`
        );
        setData(data);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [que, paginate.pageIndex]);

  useEffect(() => {
    console.log(que);
    setPaginate((prev) => ({ ...prev, pageIndex: 0 }));
  }, [que]);
  const columns = useMemo(
    () => [
      columnHelper.accessor('fullname', {
        header: 'Fullname',
        cell: (props) => props.getValue(),
      }),
      columnHelper.accessor('username', {
        header: 'Username',
        cell: (props) => props.getValue(),
      }),
      columnHelper.accessor('email', {
        header: 'Email',
        cell: (props) => props.getValue(),
      }),
      columnHelper.accessor('telf', {
        header: 'Phone',
        cell: (props) => props.getValue(),
      }),
      columnHelper.display({
        id: 'View',
        cell: (props) => {
          return (
            <Link to={`/dashboard/form/${props.row.original.token}`} target="_blank" rel="noopener noreferrer">
              <TooltipButton Icon={<VisibilityOutlined />} TooltipText={'View'} />
            </Link>
          );
        },
      }),
    ],
    []
  );
  return (
    <>
      <SearchFieldComp setQuery={setQue} />
      <TablePaginate columns={columns} data={data} paginate={paginate} setPaginate={setPaginate} />
    </>
  );
}
