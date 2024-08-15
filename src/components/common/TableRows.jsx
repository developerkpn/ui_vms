import { KeyboardArrowDown, KeyboardArrowUp, Check, DoDisturb, Edit } from '@mui/icons-material';
import { TableRow, TableCell, IconButton, Collapse, Typography, TextField, Tooltip } from '@mui/material';
import { useState } from 'react';

export default function Row({ row, length, button, setAction }) {
  const [open, setOpen] = useState(false);
  const clickDetails = () => {
    setOpen(!open);
  };
  const changeOnAction = (action, id) => {
    setAction(action, id);
  };
  let x = 0;
  return (
    <>
      <TableRow>
        {'details' in row && (
          <TableCell>
            <IconButton onClick={clickDetails}>{open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}</IconButton>
          </TableCell>
        )}
        {Object.keys(row).map((key) => {
          if (key != 'details' && key != 'id') {
            return (
              <TableCell key={`${x++}-cell`} align="left">
                {row[key]}
              </TableCell>
            );
          }
        })}
        <TableCell>
          {button.length != 0 &&
            button.map((action) => {
              switch (action) {
                case 'accept':
                  return (
                    <Tooltip key={`${action}-${x++}`} title={<Typography>{action}</Typography>}>
                      <IconButton
                        sx={{ backgroundColor: '#4ef542', mx: 1 }}
                        onClick={() => changeOnAction(action, row.id)}
                      >
                        <Check></Check>
                      </IconButton>
                    </Tooltip>
                  );
                case 'reject':
                  return (
                    <Tooltip key={`${action}-${x++}`} title={<Typography>{action}</Typography>}>
                      <IconButton
                        sx={{ backgroundColor: '#f2573f', mx: 1 }}
                        onClick={() => changeOnAction(action, row.id)}
                      >
                        <DoDisturb></DoDisturb>
                      </IconButton>
                    </Tooltip>
                  );
                case 'edit':
                  return (
                    <Tooltip key={`${action}-${x++}`} title={<Typography>{action}</Typography>}>
                      <IconButton
                        sx={{ backgroundColor: 'primary.light', mx: 1 }}
                        onClick={() => changeOnAction(action, row.id)}
                      >
                        <Edit></Edit>
                      </IconButton>
                    </Tooltip>
                  );
                case 'deactive':
                  return (
                    <Tooltip key={`${action}-${x++}`} title={<Typography>{action}</Typography>}>
                      <IconButton
                        sx={{ backgroundColor: '#f2573f', mx: 1 }}
                        onClick={() => changeOnAction(action, row.id)}
                      >
                        <DoDisturb></DoDisturb>
                      </IconButton>
                    </Tooltip>
                  );
              }
            })}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={length} sx={{ padding: 0, margin: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Typography variant="h6" sx={{ mx: 2, my: 2 }}>
              Details
            </Typography>
            <TextField inputProps={{ readOnly: true }} multiline value={row.details} fullWidth sx={{ px: 4 }} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
