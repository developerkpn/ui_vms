import { Box, Fade, IconButton, Popper, Tooltip, TextField } from '@mui/material';
import { useState, useEffect, useRef, forwardRef } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import axios from 'axios';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
const LogCard = forwardRef(({ remark, date, is_field, who }, ref) => {
  return (
    <Box sx={{ width: '100%', backgroundColor: '#f2ede4', borderRadius: '12px' }} ref={ref}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          margin: '0 1rem 0 1rem',
          padding: '1rem 0 0 0',
        }}
      >
        <div>{who}</div> {date}
      </div>
      <Box sx={{ overflowWrap: 'break-word', p: 3 }}>
        <TextField value={remark} fullWidth disabled multiline />
      </Box>
    </Box>
  );
});

const RejectLog = ({ ticket_id, ticket_state }) => {
  const axiosPrivate = useAxiosPrivate();
  const [open, setOpen] = useState(false);
  const [dataLog, setDataLog] = useState([]);
  const MainLogRef = useRef(null);
  const [selected, setSelected] = useState({
    id: '',
    remarks: '',
    create_at: '',
  });

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { data } = await axiosPrivate.get(
          `/ticket/rejectlog?ticket_id=${ticket_id}&ticket_state=${ticket_state}`,
          {
            withCredentials: true,
            signal: controller.signal,
          }
        );
        if (data.length > 0) {
          setDataLog(data);
          setSelected(data[0]);
        }
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [ticket_id, ticket_state]);

  return (
    <>
      <Box sx={{ width: '100%', backgroundColor: '#158fff', borderRadius: '12px', p: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ padding: '0 0 0 1rem', margin: '0 0 1rem 0', color: 'white' }}>Reject Log</h4>
          <Tooltip placement="top" title={<h3>See reject history</h3>}>
            <IconButton
              sx={{ width: '2rem', height: '2rem' }}
              onClick={(e) => {
                setOpen(!open);
              }}
            >
              {open ? <ExpandLess sx={{ color: 'white' }} /> : <ExpandMore sx={{ color: 'white' }} />}
            </IconButton>
          </Tooltip>
        </div>
        <LogCard
          ref={MainLogRef}
          remark={selected.remarks}
          key={selected.id}
          date={selected.create_at}
          who={selected.create_by}
          is_field
        />
      </Box>
      <Popper open={open} anchorEl={MainLogRef.current} placement="top" sx={{ width: '50%' }} transition>
        {({ TransitionProps }) => (
          <Fade {...TransitionProps}>
            <Box sx={{ height: '14rem', overflowX: 'scroll', backgroundColor: 'white' }}>
              {dataLog.length > 0 &&
                dataLog.map((item) => (
                  <div style={{ margin: '0.5rem 0 0.5rem 0' }}>
                    <LogCard key={item.id} remark={item.remarks} date={item.create_at} who={item.create_by} />
                  </div>
                ))}
            </Box>
          </Fade>
        )}
      </Popper>
    </>
  );
};

export default RejectLog;
