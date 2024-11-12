import TableSimple from 'src/components/table/TableSimple';
import { createColumnHelper } from '@tanstack/react-table';
import { LinkFile } from 'src/components/common/UploadComponent';

import { useMemo } from 'react';

const columnHelper = createColumnHelper();

export default function TableInfoBankVendor({ data, sx }) {
  const col = useMemo(
    () => [
      columnHelper.accessor('country', {
        header: 'Bank Country',
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor('bank_name', {
        header: 'Bank Name',
        cell: ({ row }) => `${row.original.bank_name} (${row.original.bank_code})`,
        size: 300,
      }),
      columnHelper.accessor('bank_curr', {
        header: 'Bank Currency',
        cell: ({ getValue }) => getValue(),
        size: 50,
      }),
      columnHelper.accessor('acc_hold', {
        header: 'Account Holder',
        cell: ({ getValue }) => getValue(),
        size: 300,
      }),
      columnHelper.accessor('account_statement_letter', {
        header: 'Account Statement Letter',
        cell: ({ getValue }) => {
          return <LinkFile file={{ file_name: getValue() }} />;
        },
        size: 100,
      }),
      columnHelper.accessor('passbook', {
        header: 'Passbook',
        cell: ({ getValue }) => {
          return <LinkFile file={{ file_name: getValue() }} />;
        },
        size: 100,
      }),
    ],
    []
  );

  return <TableSimple rowsData={data} columns={col} sx={sx} />;
}
