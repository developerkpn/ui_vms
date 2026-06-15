import { Close } from "@mui/icons-material";
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { buildMassReworkSummary } from "src/helper/massApprovalDetail.js";

export default function MassReworkStatusDialog({ open, row, onClose }) {
  const reworkSummary = useMemo(
    () => buildMassReworkSummary(row || {}),
    [row]
  );

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
          <Typography
            variant="overline"
            sx={{ fontWeight: 800, color: "text.secondary" }}
          >
            Rework Status
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, color: "#455a64", lineHeight: 1.1 }}
          >
            {reworkSummary?.massRequestNo || "-"}
          </Typography>
        </Box>

        <IconButton onClick={onClose} aria-label="Close rework status dialog">
          <Close />
        </IconButton>
      </Box>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack spacing={1.5}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "#fbfcfe",
            }}
          >
            <Stack spacing={1.25}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 1.25,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", fontWeight: 800, mb: 0.5 }}
                  >
                    Rework By
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "text.secondary" }}
                  >
                    {reworkSummary?.approver || "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", fontWeight: 800, mb: 0.5 }}
                  >
                    Rework At
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "text.secondary" }}
                  >
                    {reworkSummary?.at || "-"}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  sx={{ display: "block", fontWeight: 800, mb: 0.5 }}
                >
                  Rework Reason
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "text.secondary" }}
                >
                  {reworkSummary?.reason || "-"}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
