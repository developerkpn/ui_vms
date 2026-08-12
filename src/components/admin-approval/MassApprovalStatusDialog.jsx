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
import { useMemo } from "react";
import ApprovalStatusCard from "src/components/common/ApprovalStatusCard";
import { formatDateTime } from "src/helper/adminApprovalView.js";

// Mass counterpart of ApprovalStatusDialog (AdminApprovalView.jsx): the row's
// approvalSteps are already normalized by normalizeMassApprovalRows, so this
// only has to format the timestamp and hand each step to the shared card —
// no separate detail-builder needed the way the rework summary dialog has one.
export default function MassApprovalStatusDialog({ open, row, onClose }) {
  const steps = useMemo(() => {
    const approvalSteps = Array.isArray(row?.approvalSteps) ? row.approvalSteps : [];
    return approvalSteps.map(step => ({
      ...step,
      approvedAt: formatDateTime(step.approvedAt),
    }));
  }, [row]);

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
            Approval Status
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#455a64", lineHeight: 1.1 }}>
            {row?.massRequestNo || "-"}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 600, color: "text.secondary" }}>
            {row?.massRequestReason || "-"}
          </Typography>
        </Box>

        <IconButton onClick={onClose} aria-label="Close approval status dialog">
          <Close />
        </IconButton>
      </Box>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack spacing={1.5}>
          {steps.map((item, index) => (
            <ApprovalStatusCard key={`${item.level ?? index}`} item={item} />
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
