import { Badge, Box, Paper } from '@mui/material';
import { FeedOutlined, EditOutlined, DeleteOutlined } from '@mui/icons-material';
import { useEffect, useState, useMemo } from 'react';
import useAxiosPrivate from 'src/hooks/useAxiosPrivate';
import ProgressStat from 'src/components/common/ProgressStat';
import TooltipButton from 'src/components/common/TooltipButton';
import AccordionTemplate from 'src/components/common/AccordionTemplate';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

const HeadAccordion = ({ datalen }) => {
  return (
    <Box sx={{ display: 'flex', gap: 3 }}>
      <Badge badgeContent={datalen}>
        <FeedOutlined />
      </Badge>
      Outstanding Edit Request
    </Box>
  );
};

const CardOutstanding = ({ req_desc, date_req, position, submitted, id_ticket }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const memoStatus = useMemo(() => {
    if (!submitted) {
      return {
        bgColor: theme.palette.grey[200],
        text: 'Not Submitted',
      };
    }
    return {
      bgColor: theme.palette.warning.main,
      color: theme.palette.warning.contrastText,
      text: position,
    };
  }, [submitted, submitted]);
  return (
    <Paper sx={{ borderRadius: '5px', backgroundColor: theme.palette.secondary.main, py: 2, px: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <h4 style={{ margin: '0 0 0 0', color: theme.palette.secondary.contrastText }}>{req_desc}</h4>
          <p style={{ color: theme.palette.secondary.contrastText }}>{`Date Requested : ${date_req}`}</p>
        </Box>
        <Box>
          <ProgressStat color={memoStatus.bgColor}>
            <Box sx={{ p: 2 }}>{memoStatus.text}</Box>
          </ProgressStat>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TooltipButton
            Icon={<EditOutlined style={{ color: theme.palette.secondary.contrastText }} />}
            OnClick={(e) => {
              navigate(`editreq/form?id=${id_ticket}`);
            }}
            TooltipText={'Edit'}
          />
          <TooltipButton
            Icon={<DeleteOutlined style={{ color: theme.palette.secondary.contrastText }} />}
            OnClick={(e) => {
              console.log('delete');
            }}
            TooltipText={'Delete'}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default function OutstandingRequestEdit() {
  const axiosPrivate = useAxiosPrivate();
  const theme = useTheme();
  const [osreq, setOsreq] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await axiosPrivate.get('/ticeddet/getactive');
      setOsreq(data);
    })();
  }, []);
  return (
    <div>
      <AccordionTemplate
        head={<HeadAccordion datalen={osreq.length} />}
        sxHead={{
          backgroundColor: theme.palette.secondary.main,
          color: theme.palette.secondary.contrastText,
          borderRadius: '5px 5px 0 0',
          py: 1,
        }}
      >
        <Box sx={{ height: '6rem', overflowY: 'scroll' }}>
          {osreq.map((item) => (
            <CardOutstanding
              {...{
                req_desc: item.description,
                date_req: item.date_req,
                position: item.cur_pos,
                submitted: item.submitted,
                id_ticket: item.uuid,
              }}
              key={item.uuid}
            />
          ))}
        </Box>
      </AccordionTemplate>
    </div>
  );
}
