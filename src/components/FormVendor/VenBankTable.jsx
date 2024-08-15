import {
  DataGrid,
  GridActionsCellItem,
  GridRowEditStopReasons,
  GridRowModes,
  GridToolbarContainer,
  GridEditInputCell,
} from '@mui/x-data-grid';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { randomId } from '@mui/x-data-grid-generator';
import { useEffect, useRef, useState } from 'react';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  Undo,
} from '@mui/icons-material';
import { Button, Skeleton } from '@mui/material';
import { styled, lighten, darken } from '@mui/material/styles';
import AutoCompleteCustom from '../common/AutoCompleteCustom';
import AutoCompleteBank from '../common/AutoCompleteBank';

const StyledBox = styled('div')(({ theme }) => ({
  width: '100%',
  '& .MuiDataGrid-cell--editable': {
    backgroundColor: theme.palette.mode === 'dark' ? '#376331' : 'rgb(217 243 190)',
    '& .MuiInputBase-root': {
      height: '100%',
    },
  },
  '& .Mui-error': {
    backgroundColor: `rgb(126,10,15, ${theme.palette.mode === 'dark' ? 0 : 0.1})`,
    color: theme.palette.mode === 'dark' ? '#ff4343' : '#750f0f',
  },
}));

const StyledTooltip = styled(({ className, ...props }) => <Tooltip {...props} classes={{ popper: className }} />)(
  ({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
      backgroundColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
    },
  })
);

function NameEditInputCell(props) {
  const { error } = props;

  return (
    <StyledTooltip open={!!error} title={error}>
      <GridEditInputCell {...props} />
    </StyledTooltip>
  );
}

function renderEditName(params) {
  return <NameEditInputCell {...params} />;
}

function EditToolbar(props) {
  const { setVen_bank, setRowModesModel, idParent, isallow, isLocal, t } = props;
  const handleClick = () => {
    const id = randomId();
    setVen_bank((oldRows) => [
      ...oldRows,
      {
        id: id,
        country: isLocal ? { value: 'ID', label: 'ID' } : { value: '', label: '' },
        bank_id: { value: '', label: '' },
        bank_acc: '',
        bank_curr: { value: '', label: '' },
        acc_hold: '',
        isNew: true,
        method: 'insert',
        isDb: false,
        ven_id: idParent,
      },
    ]);
    setRowModesModel((oldModel) => ({ ...oldModel, [id]: { mode: GridRowModes.Edit, fieldToFocus: 'bank_id' } }));
  };
  return (
    isallow && (
      <GridToolbarContainer>
        <Button color="primary" startIcon={<AddIcon />} onClick={handleClick}>
          {t('Add')}
        </Button>
      </GridToolbarContainer>
    )
  );
}

export default function VenBankTable({
  onChildDataChange,
  initData,
  idParent,
  banks,
  currencies,
  countries,
  isallow,
  ticketState,
  isLoad,
  isLocal,
  formfield,
  apiTable,
  setCurrentEdit,
  ...props
}) {
  let covtData = [];
  const [ven_bank, setVen_bank] = useState([]);
  const [rowModesModel, setRowModesModel] = useState({});
  const countriesData = countries?.map((item) => ({ value: item.value, label: item.value }));
  const DataGridBank = styled(DataGrid, { shouldForwardProp: (prop) => prop !== 'sx' })(() => ({
    '& .row-idle': {
      backgroundColor: '#fff',
    },
    '& .row-delete': {
      backgroundColor: '#fc8b72',
      '&:hover': {
        backgroundColor: lighten('#fc8b72', 0.2),
      },
      '&.Mui-selected': {
        backgroundColor: darken('#fc8b72', 0.2),
        '&:hover': {
          backgroundColor: lighten('#fc8b72', 0.2),
        },
      },
    },
  }));

  useEffect(() => {
    if (Object.keys(initData).length != 0) {
      initData.map((item) => {
        // console.log(item);
        covtData.push({
          id: item.id,
          acc_hold: item.acc_hold,
          bank_acc: item.bank_acc,
          bank_id: {
            value: item.bank_id,
            label: `${item.bank_name} - ${item.bank_code}  ${item.source != null ? '(new)' : ''}`,
          },
          bank_curr: { value: item.bank_curr, label: item.bank_curr },
          country: { value: item.country, label: item.country },
          isDb: true,
          isNew: false,
          method: '',
        });
      });
      setVen_bank(covtData);
    }
  }, [initData]);

  useEffect(() => {
    const sendDataParent = (ven_bank) => {
      let items = [];
      ven_bank.map((item) => {
        if (item.method !== '') {
          let temp = {
            ...item,
            bank_id: item.bank_id?.value,
            bankv_id: item.id,
            bank_curr: item.bank_curr?.value,
            country: item.country?.value,
          };
          delete temp.isDb;
          delete temp.isNew;
          delete temp.id;
          items.push(temp);
        }
      });
      onChildDataChange(items);
    };
    sendDataParent(ven_bank);
  }, [ven_bank]);

  const handleRowEditStop = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut || params.reason === GridRowEditStopReasons.enterKeyDown) {
      event.defaultMuiPrevented = true;
    }
  };
  const handleEditClick = (row) => () => {
    setRowModesModel({ ...rowModesModel, [row.id]: { mode: GridRowModes.Edit } });
    setCurrentEdit({ ...rowModesModel, [row.id]: { mode: GridRowModes.Edit } });
  };
  const handleSaveClick = (row) => () => {
    setRowModesModel({ ...rowModesModel, [row.id]: { mode: GridRowModes.View } });
    setCurrentEdit({ ...rowModesModel, [row.id]: { mode: GridRowModes.View } });
  };
  const handleDeleteClick = (id) => () => {
    let prevData = [];
    ven_bank.map((item) => {
      if (item.id === id) {
        if (item.isDb == true) {
          prevData.push({ ...item, method: 'delete' });
        }
      } else {
        prevData.push(item);
      }
    });
    setVen_bank(prevData);
    // sendDataParent(prevData);
  };
  const handleCancelClick = (id) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: {
        mode: GridRowModes.View,
        ignoreModifications: true,
      },
    });
    setCurrentEdit({
      ...rowModesModel,
      [id]: {
        mode: GridRowModes.View,
        ignoreModifications: true,
      },
    });
    const editedRow = ven_bank.find((row) => row.id === id);
    if (editedRow.isNew) {
      setVen_bank(ven_bank.filter((row) => row.id != id));
    }
  };
  const handleUndoClick = (id) => () => {
    let pushData = [];
    ven_bank.map((item) => {
      // console.log(item);
      // console.log(id);
      if (item.id === id) {
        pushData.push({ ...item, method: '' });
      } else {
        pushData.push(item);
      }
    });
    setVen_bank(pushData);
  };
  const processRowUpdate = (newRow) => {
    const updatedRow = { ...newRow, isNew: false };
    let prevData = [];
    ven_bank.map((row) => {
      if (row.id === newRow.id) {
        if (row.isDb === true) {
          let updatedValue = [];
          Object.keys(row).map((keys) => {
            if (row[keys] !== newRow[keys]) {
              updatedValue.push({ key: keys, value: newRow[keys] });
            }
          });
          prevData.push({ ...updatedRow, method: 'update', updated: updatedValue });
        } else {
          prevData.push(updatedRow);
        }
      } else {
        prevData.push(row);
      }
    });
    setVen_bank(prevData);
    return updatedRow;
  };

  const handleRowModesModelChange = (newRowModesModel) => {
    setRowModesModel(newRowModesModel);
    // sendDataParent(ven_bank);
  };
  const columns = [
    {
      field: 'country',
      // type: 'singleSelect',
      headerName: props.t('Country'),
      // valueOptions: banksData,
      editable: isallow,
      valueFormatter: ({ value }) => value?.label,
      renderEditCell: (params) => {
        return <AutoCompleteCustom {...params} options={countriesData} is_local={isLocal} />;
      },
      width: 100,
    },
    {
      field: 'bank_id',
      // type: 'singleSelect',
      headerName: props.t('Bank Name'),
      // valueOptions: banksData,
      editable: isallow,
      valueFormatter: ({ value }) => value?.label,
      renderEditCell: (params) => {
        return <AutoCompleteBank {...params} />;
      },
      width: 350,
    },
    {
      field: 'bank_curr',
      // type: 'singleSelect',
      headerName: props.t('Currency'),
      // valueOptions: banksData,
      editable: isallow,
      valueFormatter: ({ value }) => value?.label,
      renderEditCell: (params) => <AutoCompleteCustom {...params} options={currencies} />,
      width: 100,
    },
    {
      field: 'bank_acc',
      type: 'string',
      preProcessEditCellProps: (params) => {
        let isError = false;
        if (params.props.value.match(/[a-zA-Z!@#$%^&*(),.?":{}|<>-]/g) !== null) {
          isError = props.t('Field only accept numbers');
        }
        return { ...params.props, error: isError };
      },
      headerName: props.t('Bank Account'),
      width: 200,
      editable: isallow,
      renderEditCell: renderEditName,
    },
    {
      field: 'acc_hold',
      type: 'string',
      headerName: props.t('Account Holder'),
      width: 250,
      editable: isallow,
      valueGetter: (params) => params.value?.toUpperCase(),
    },
    {
      field: 'action',
      type: 'actions',
      headerName: props.t('Action'),
      width: 100,
      cellClassName: 'actions',
      getActions: (row) => {
        let id = row.id;
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        if (isallow) {
          if (isInEditMode) {
            return [
              <GridActionsCellItem icon={<SaveIcon />} label="Save" onClick={handleSaveClick(row)} />,
              <GridActionsCellItem icon={<CancelIcon />} label="Cancel" onClick={handleCancelClick(id)} />,
            ];
          } else {
            if (row.row.method == 'delete') {
              return [
                <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={handleEditClick(row)} />,
                <GridActionsCellItem icon={<Undo />} label="Undo" onClick={handleUndoClick(id)} />,
              ];
            }
            return [
              <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={handleEditClick(row)} />,
              <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDeleteClick(id)} />,
            ];
          }
        } else {
          return [];
        }
      },
    },
  ];

  return (
    <>
      {isLoad ? (
        <Skeleton variant="rectangular" width={1000} height={200} />
      ) : (
        <DataGrid
          rows={ven_bank}
          columns={columns}
          editMode="row"
          rowModesModel={rowModesModel}
          onRowModesModelChange={handleRowModesModelChange}
          onRowEditStop={handleRowEditStop}
          processRowUpdate={processRowUpdate}
          slots={{
            toolbar: EditToolbar,
          }}
          slotProps={{
            toolbar: { setVen_bank, setRowModesModel, idParent, isallow, isLocal, ...props },
          }}
          getRowClassName={(params) => {
            if (params.row.method == 'delete') {
              return 'row-delete';
            } else {
              return 'row-idle';
            }
          }}
          autoHeight
          getEstimatedRowHeight={() => 100}
          getRowHeight={() => 'auto'}
          sx={{ fontSize: '11pt' }}
          apiRef={apiTable}
        />
      )}
    </>
  );
}
