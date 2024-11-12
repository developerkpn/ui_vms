import TableSimple from 'src/components/table/TableSimple';
import { createColumnHelper } from '@tanstack/react-table';
import { LinkFile } from 'src/components/common/UploadComponent';

import { useMemo } from 'react';

const columnHelper = createColumnHelper();

export default function TableInfoFileVendor({ data }) {
  const col = useMemo(
    () => [
      columnHelper.accessor('file_type', {
        header: 'File Type',
        cell: ({ getValue }) => {
          return getValue();
        },
      }),
      columnHelper.accessor('file_name', {
        header: 'File Name',
        cell: ({ row }) => {
          return <LinkFile file={row.original} />;
        },
      }),
    ],
    []
  );

  return (
    <div>
      <TableSimple rowsData={data} columns={col} />
    </div>
  );
}
