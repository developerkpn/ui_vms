import ForwardToInboxIcon from "@mui/icons-material/ForwardToInbox";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import { Box, Stack, Tooltip, Typography } from "@mui/material";

import { buildStatusNoteLabel, compactStatusNotes } from "src/helper/statusNotes";

// One icon per kind of note, chosen to say what the note is about before it is
// read: a person for whoever owes the approval, an envelope for the rework mail
// (outbound while it waits, opened once answered), a warning for a SAP rejection.
const NOTE_ICONS = {
  approver: PersonOutlineIcon,
  pickup: HourglassEmptyIcon,
  unassigned: PersonOffOutlinedIcon,
  emailWaiting: ForwardToInboxIcon,
  emailAnswered: MarkEmailReadOutlinedIcon,
  sapError: ReportProblemOutlinedIcon,
  info: InfoOutlinedIcon,
};

const TONE_COLORS = {
  error: "#dc2626",
  warning: "#b45309",
  success: "success.dark",
  info: "text.secondary",
};

/**
 * A status badge that keeps its explanatory notes on the same line.
 *
 * Each note becomes its own icon beside the badge, with the label and wording on
 * hover. With no notes this renders the badge alone and adds no wrapper, so
 * untouched rows look exactly as they did.
 *
 * Props:
 *  - children: the badge or chip
 *  - notes?:   [{ text, label, icon, tone }] — see helper/statusNotes
 */
export default function StatusWithNotes({ children, notes = [] }) {
  const visibleNotes = compactStatusNotes(notes);

  if (visibleNotes.length === 0) {
    return children;
  }

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
      {children}

      {visibleNotes.map(note => {
        const Icon = NOTE_ICONS[note.icon] || NOTE_ICONS.info;
        const color = TONE_COLORS[note.tone] || TONE_COLORS.info;

        return (
          <Tooltip
            key={`${note.icon}-${note.text}`}
            arrow
            placement="top"
            title={
              <Box sx={{ py: 0.25 }}>
                {note.label && (
                  <Typography
                    variant="caption"
                    component="div"
                    sx={{ fontWeight: 800, opacity: 0.85 }}
                  >
                    {note.label}
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  component="div"
                  sx={{ fontWeight: 600, lineHeight: 1.4 }}
                >
                  {note.text}
                </Typography>
              </Box>
            }
          >
            <Icon
              fontSize="small"
              aria-label={buildStatusNoteLabel(note)}
              sx={{ color, flexShrink: 0, cursor: "help" }}
            />
          </Tooltip>
        );
      })}
    </Stack>
  );
}
