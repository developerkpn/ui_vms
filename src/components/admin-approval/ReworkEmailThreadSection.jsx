import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import SectionLoadingSkeleton from "src/components/common/SectionLoadingSkeleton";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { formatDateTime } from "src/helper/adminApprovalView.js";
import {
  buildReworkEmailThreadPath,
  normalizeReworkEmailThread,
  REWORK_EMAIL_SENDER_MISMATCH_TEXT,
  REWORK_EMAIL_THREAD_TITLE,
} from "src/helper/reworkEmailThread.js";

// One approver answer, indented under the mail it replies to. The sender is
// shown even when it matches, because "who actually typed this" is the whole
// reason a mailed rework is auditable at all.
function ReworkEmailReply({ reply }) {
  return (
    <Box
      sx={{
        pl: 1.5,
        py: 0.75,
        borderLeft: "3px solid",
        borderColor: reply.senderMatches ? "success.light" : "warning.light",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {reply.fromEmail || "-"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDateTime(reply.receivedAt)}
        </Typography>
        {!reply.senderMatches && (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={REWORK_EMAIL_SENDER_MISMATCH_TEXT}
            sx={{ height: 20, fontSize: 11, fontWeight: 700 }}
          />
        )}
      </Stack>
      <Typography
        variant="body2"
        sx={{ mt: 0.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {reply.bodyText || "-"}
      </Typography>
    </Box>
  );
}

// One sent mail: what left the VMS mailbox, and everything that came back.
function ReworkEmailEntry({ email }) {
  const failed = email.sendStatus === "FAILED";

  return (
    <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Chip
          size="small"
          color={failed ? "error" : "success"}
          label={email.sendStatus}
          sx={{ height: 20, fontSize: 11, fontWeight: 800 }}
        />
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {email.subject || "-"}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        Kepada {email.toEmail || "-"} · {formatDateTime(email.sentAt)}
      </Typography>
      {failed && email.sendError && (
        <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 0.5 }}>
          {email.sendError}
        </Typography>
      )}
      <Typography
        variant="body2"
        sx={{ mt: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {email.body || "-"}
      </Typography>

      {email.replies.length > 0 && (
        <Stack spacing={1} sx={{ mt: 1.5, pl: 2 }}>
          <Divider flexItem />
          {email.replies.map((reply, index) => (
            <ReworkEmailReply key={`${email.id}-reply-${index}`} reply={reply} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

/**
 * Read-only transcript of the rework mails sent for one request, newest first.
 *
 * Rendered only where it means something: the request is one Master Data can
 * act on, and at least one mail exists. Everything else — a request that never
 * used the EMAIL channel, a deployment that has not run the thread migration,
 * an endpoint that errors — collapses to nothing, because a rework detail must
 * stay readable whether or not the mail feature is in play.
 *
 * @param {object} props
 * @param {boolean} [props.enabled] - False keeps the section unmounted and unfetched.
 * @param {"SINGLE"|"MASS"} [props.requestKind] - Which request table the id belongs to.
 * @param {string|number} [props.requestId] - The request's id.
 */
export default function ReworkEmailThreadSection({ enabled = false, requestKind, requestId }) {
  const axiosPrivate = useAxiosPrivate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const path = buildReworkEmailThreadPath({ requestKind, requestId });

    if (!enabled || !path) {
      setEmails([]);
      return undefined;
    }

    let alive = true;
    setLoading(true);

    axiosPrivate
      .get(path)
      .then(response => {
        if (alive) {
          setEmails(normalizeReworkEmailThread(response));
        }
      })
      .catch(error => {
        // Silent by design — see the component doc.
        console.error("Failed to load rework email thread", error);
        if (alive) {
          setEmails([]);
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
  }, [axiosPrivate, enabled, requestKind, requestId]);

  if (!enabled || (!loading && emails.length === 0)) {
    return null;
  }

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#455a64", mb: 1 }}>
        {REWORK_EMAIL_THREAD_TITLE}
      </Typography>
      {loading ? (
        // Same skeleton idiom as every other late-arriving section of these
        // modals — shaped like the mail entry that is about to replace it.
        <SectionLoadingSkeleton lines={3} />
      ) : (
        <Stack spacing={1.5}>
          {emails.map(email => (
            <ReworkEmailEntry key={email.id} email={email} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
