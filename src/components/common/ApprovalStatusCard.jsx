import { Box, Paper, Stack, Typography } from "@mui/material";

// Shared by the Requester's "View Approval" (RequestMaterials.jsx) and the
// Approver/Master Data "View Approval" (AdminApprovalView.jsx) so both read
// the exact same per-step card: label, approver, status badge, timestamp, and
// (when present) the remark/reason typed at that step.
export const APPROVAL_STATUS_BADGES = {
  APPROVED: { label: "Approve", bgcolor: "#2146d8", color: "#ffffff" },
  REWORK: { label: "Rework", bgcolor: "#f59e0b", color: "#ffffff" },
  REJECTED: { label: "Reject", bgcolor: "#d93025", color: "#ffffff" },
  WAITING: { label: "Waiting", bgcolor: "#8a9099", color: "#ffffff" },
  SKIPPED: { label: "Skipped", bgcolor: "#e5e7eb", color: "#6b7280" },
  "-": { label: "-", bgcolor: "#eceff3", color: "#546e7a" },
};

export default function ApprovalStatusCard({ item }) {
  const badge = APPROVAL_STATUS_BADGES[item.status] || APPROVAL_STATUS_BADGES["-"];
  const isSkipped = item.status === "SKIPPED";
  // buildApprovalHistory runs remark through pickText, which turns a blank
  // remark into the literal string "-" rather than "" — so "-" must be
  // treated as no remark, not as remark text to display.
  const hasRemark = Boolean(item.remark) && item.remark !== "-";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 0,
        border: "1px solid",
        borderColor: isSkipped ? "#e5e7eb" : "divider",
        borderRadius: 2,
        overflow: "hidden",
        opacity: isSkipped ? 0.65 : 1,
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} alignItems="stretch">
        <Box
          sx={{
            flex: 1,
            px: 2,
            py: 1.75,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 0.75,
            minHeight: 92,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
            {item.label || "-"}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary" }}>
            {item.approver || "-"}
          </Typography>
        </Box>

        <Box
          sx={{
            width: { xs: "100%", sm: 188 },
            px: 2,
            py: 1.75,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "flex-end" },
            gap: 1,
            borderTop: { xs: "1px solid", sm: "none" },
            borderLeft: { xs: "none", sm: "1px solid" },
            borderColor: "divider",
            bgcolor: "#fbfcfe",
            minHeight: 92,
          }}
        >
          <Box
            sx={{
              minWidth: 128,
              px: 2.25,
              py: 1,
              borderRadius: 1.5,
              textAlign: "center",
              fontWeight: 900,
              fontSize: "0.95rem",
              lineHeight: 1.1,
              ...badge,
            }}
          >
            {badge.label}
          </Box>
          {isSkipped ? (
            <Typography variant="caption" sx={{ fontStyle: "italic", color: "#9ca3af" }}>
              {hasRemark ? item.remark : "Not required"}
            </Typography>
          ) : (
            <>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                {item.approvedAt || "-"}
              </Typography>
              {hasRemark && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    textAlign: { xs: "left", sm: "right" },
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {item.remark}
                </Typography>
              )}
            </>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
