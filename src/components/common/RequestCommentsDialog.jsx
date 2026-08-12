import { Close } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { APPROVAL_STATUS_BADGES } from "src/components/common/ApprovalStatusCard";
import SectionLoadingSkeleton from "src/components/common/SectionLoadingSkeleton";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { formatDateTime } from "src/helper/adminApprovalView.js";
import {
  buildRequestCommentEventLabel,
  buildRequestCommentsPath,
  buildRequestCommentTitle,
  normalizeRequestComments,
  REQUEST_COMMENT_NO_TEXT,
  REQUEST_COMMENTS_EMPTY_TEXT,
  REQUEST_COMMENTS_ERROR_TEXT,
  REQUEST_COMMENTS_TITLE,
} from "src/helper/requestComments.js";

// The approval cards' own badge colours, so the same word means the same colour
// wherever a request's state is shown. The requester's two events borrow the
// neutral one: they are the only entries nobody approved or refused, and the
// grey is what separates "the requester spoke" from an approval decision at a
// glance.
const EVENT_BADGE_COLORS = {
  SUBMIT: APPROVAL_STATUS_BADGES.WAITING,
  RESUBMIT: APPROVAL_STATUS_BADGES.WAITING,
  APPROVE: APPROVAL_STATUS_BADGES.APPROVED,
  REWORK: APPROVAL_STATUS_BADGES.REWORK,
  REJECT: APPROVAL_STATUS_BADGES.REJECTED,
};

// One thing somebody said, in the order they said it. The stage/actor line and
// the timestamp are the header; the text below is what was typed.
function RequestCommentEntry({ comment }) {
  const badge = EVENT_BADGE_COLORS[comment.eventType] || APPROVAL_STATUS_BADGES["-"];
  const hasComment = Boolean(comment.comment);

  return (
    <Box
      sx={{
        p: 1.75,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        useFlexGap
        flexWrap="wrap"
      >
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          <Box
            sx={{
              px: 1.25,
              py: 0.25,
              borderRadius: 1,
              fontSize: "0.75rem",
              fontWeight: 900,
              bgcolor: badge.bgcolor,
              color: badge.color,
            }}
          >
            {buildRequestCommentEventLabel(comment)}
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {buildRequestCommentTitle(comment)}
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
          {formatDateTime(comment.createdAt)}
        </Typography>
      </Stack>

      {/* The actor is named on its own line whenever the header shows a stage,
          so "Approval 1" never hides which person actually acted on it. */}
      {comment.stage && comment.actorName && (
        <Typography variant="caption" sx={{ display: "block", mt: 0.25, color: "text.secondary" }}>
          {comment.actorName}
        </Typography>
      )}

      <Typography
        variant="body2"
        sx={{
          mt: 1,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontStyle: hasComment ? "normal" : "italic",
          color: hasComment ? "text.primary" : "text.disabled",
        }}
      >
        {hasComment ? comment.comment : REQUEST_COMMENT_NO_TEXT}
      </Typography>
    </Box>
  );
}

/**
 * Read-only thread of everything said about one request, oldest first: the
 * requester's submit reason, every approve remark, every rework reason, and the
 * reject reason, each with who said it and when.
 *
 * Fetched on open rather than read off the list row — the list carries only the
 * current state of each approval step, which is one remark per stage, and a
 * stage reworked twice has more to say than that.
 *
 * @param {object} props
 * @param {boolean} [props.open] - Closed keeps the thread unfetched.
 * @param {"SINGLE"|"MASS"} [props.requestKind] - Which request table the id belongs to.
 * @param {string|number} [props.requestId] - The request's id.
 * @param {string} [props.ticketNumber] - Shown as the dialog's own heading.
 * @param {string} [props.subtitle] - Line under it; the material description or batch reason.
 * @param {Function} [props.onClose] - Close handler.
 */
export default function RequestCommentsDialog({
  open = false,
  requestKind,
  requestId,
  ticketNumber,
  subtitle,
  onClose,
}) {
  const axiosPrivate = useAxiosPrivate();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const path = buildRequestCommentsPath({ requestKind, requestId });

    if (!open || !path) {
      setComments([]);
      setFailed(false);
      return undefined;
    }

    let alive = true;
    setLoading(true);
    setFailed(false);

    axiosPrivate
      .get(path)
      .then(response => {
        if (alive) {
          setComments(normalizeRequestComments(response));
        }
      })
      .catch(error => {
        console.error("Failed to load request comments", error);
        if (alive) {
          setComments([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [axiosPrivate, open, requestKind, requestId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
            {REQUEST_COMMENTS_TITLE}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#455a64", lineHeight: 1.1 }}>
            {ticketNumber || "-"}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 600, color: "text.secondary" }}>
            {subtitle || "-"}
          </Typography>
        </Box>

        <IconButton onClick={onClose} aria-label="Close request comments dialog">
          <Close />
        </IconButton>
      </Box>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        {loading && <SectionLoadingSkeleton lines={3} />}

        {!loading && failed && (
          <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>
            {REQUEST_COMMENTS_ERROR_TEXT}
          </Typography>
        )}

        {!loading && !failed && comments.length === 0 && (
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
            {REQUEST_COMMENTS_EMPTY_TEXT}
          </Typography>
        )}

        {!loading && !failed && comments.length > 0 && (
          <Stack spacing={1.5}>
            {comments.map(comment => (
              <RequestCommentEntry key={comment.id} comment={comment} />
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
