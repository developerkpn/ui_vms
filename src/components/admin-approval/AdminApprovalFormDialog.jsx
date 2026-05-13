import {
  AttachFile,
  Cancel,
  CheckCircle,
  Close,
  History,
  InfoOutlined,
  Replay,
  WarningAmber,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { buildApprovalDetail } from "src/helper/adminApprovalDetail.mjs";

const approvalStatusColors = {
  APPROVED: { bgcolor: "#e8f5e9", color: "#1b5e20" },
  WAITING: { bgcolor: "#eef2f7", color: "#546e7a" },
  REWORK: { bgcolor: "#fff7ed", color: "#c2410c" },
  REJECT: { bgcolor: "#fee2e2", color: "#b91c1c" },
};

function SectionLabel({ children }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        px: 1.5,
        py: 0.4,
        mb: 2,
        borderRadius: 999,
        bgcolor: "#34a853",
        color: "common.white",
        fontWeight: 800,
        fontSize: "0.78rem",
      }}
    >
      {children}
    </Box>
  );
}

function ReadOnlyField({ label, value, multiline = false, rows = 1 }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ display: "block", mb: 0.75, fontWeight: 800 }}>
        {label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        value={value || "-"}
        multiline={multiline}
        rows={rows}
        InputProps={{ readOnly: true }}
        sx={{
          "& .MuiInputBase-root": {
            bgcolor: "#fbfcfe",
            color: "text.primary",
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#cfd8dc",
            borderStyle: "dashed",
          },
        }}
      />
    </Box>
  );
}

function ReadOnlyLongTextFields({ label, values = [] }) {
  const lines = [0, 1, 2].map(index => values[index] || "-");

  return (
    <Box>
      <Typography variant="caption" sx={{ display: "block", mb: 0.75, fontWeight: 800 }}>
        {label}
      </Typography>
      <Stack spacing={1}>
        {lines.map((line, index) => (
          <TextField
            key={`${label}-${index + 1}`}
            fullWidth
            size="small"
            value={line}
            InputProps={{ readOnly: true }}
            sx={{
              "& .MuiInputBase-root": {
                bgcolor: "#fbfcfe",
                color: "text.primary",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#cfd8dc",
                borderStyle: "dashed",
              },
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}

function ApprovalHistoryItem({ item }) {
  const color = approvalStatusColors[item.status] || approvalStatusColors.WAITING;

  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        minWidth: 170,
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Stack spacing={0.75}>
        <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary" }}>
          {item.label}
        </Typography>
        <Chip
          label={item.status}
          size="small"
          sx={{ alignSelf: "flex-start", fontWeight: 800, ...color }}
        />
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {item.approver}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.approvedAt}
        </Typography>
      </Stack>
    </Paper>
  );
}

function AttachmentItem({ attachment, index }) {
  const extension = attachment.name.includes(".")
    ? attachment.name.split(".").pop().toUpperCase()
    : "FILE";

  return (
    <Paper
      elevation={0}
      sx={{
        width: { xs: "100%", sm: 280 },
        p: 1.25,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 1.5,
          bgcolor: "#edf4ff",
          color: "#2457c5",
          display: "grid",
          placeItems: "center",
          fontWeight: 900,
          fontSize: "0.72rem",
        }}
      >
        {extension}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 800 }}>
          {attachment.name || `Attachment ${index + 1}`}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {attachment.type}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function AdminApprovalFormDialog({
  open,
  row,
  onClose,
  onAction,
  submitting = false,
}) {
  const detail = useMemo(() => buildApprovalDetail(row || {}), [row]);

  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState(""); // 'Approve', 'Rework', 'Reject'
  const [remarkText, setRemarkText] = useState("");

  useEffect(() => {
    if (!open) {
      setRemarkDialogOpen(false);
      setCurrentAction("");
      setRemarkText("");
    }
  }, [open, row]);

  const handleDialogClose = (_, reason) => {
    if (submitting && (reason === "backdropClick" || reason === "escapeKeyDown")) {
      return;
    }

    if (submitting) {
      return;
    }

    onClose?.();
  };

  const handleRemarkDialogClose = (_, reason) => {
    if (submitting && (reason === "backdropClick" || reason === "escapeKeyDown")) {
      return;
    }

    if (submitting) {
      return;
    }

    setRemarkDialogOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="lg" scroll="paper">
      <Box
        sx={{
          px: { xs: 2, md: 3 },
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
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#455a64" }}>
            {detail.title}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 0.75 }}
            useFlexGap
            flexWrap="wrap"
          >
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {detail.ticketNumber}
            </Typography>
            <Chip
              label={detail.assignedTo}
              size="small"
              sx={{ bgcolor: "#616161", color: "common.white", fontWeight: 800 }}
            />
          </Stack>
        </Box>

        <IconButton onClick={handleDialogClose} disabled={submitting} aria-label="Close approval form">
          <Close />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 1.75,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                Created By
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {detail.createdBy}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {detail.createdAt}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                flex: 1.4,
                p: 1.75,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Button
                startIcon={<History />}
                variant="text"
                sx={{ px: 0, textTransform: "none", fontWeight: 800 }}
              >
                History Approval
              </Button>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                {detail.approvalHistory.map(item => (
                  <ApprovalHistoryItem key={item.step} item={item} />
                ))}
              </Stack>
            </Paper>
          </Stack>

          <Box>
            <SectionLabel>Basic Info</SectionLabel>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <ReadOnlyField label="Material Group *" value={detail.basicInfo.materialGroup} />
              </Grid>
              <Grid item xs={12} md={6}>
                <ReadOnlyField
                  label="Sub Material Group *"
                  value={detail.basicInfo.subMaterialGroup}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <ReadOnlyField
                  label="Material Description *"
                  value={detail.basicInfo.materialDescription}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <ReadOnlyField label="Base UoM *" value={detail.basicInfo.baseUom} />
              </Grid>
              <Grid item xs={12} md={6}>
                <ReadOnlyField label="Plant" value={detail.basicInfo.plant} />
              </Grid>
              <Grid item xs={12} md={6}>
                <ReadOnlyField label="Storage Location" value={detail.basicInfo.storageLocation} />
              </Grid>
              <Grid item xs={12}>
                <ReadOnlyLongTextFields label="Long Text" values={detail.longTextLines} />
              </Grid>
            </Grid>
          </Box>

          <Box>
            <SectionLabel>Specification</SectionLabel>
            {detail.specificationFields.length > 0 ? (
              <Grid container spacing={2.5}>
                {detail.specificationFields.map(field => (
                  <Grid item xs={12} md={6} key={field.key}>
                    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <ReadOnlyField label={field.label} value={field.value} />
                      </Box>
                      <Tooltip
                        title="Field ini berasal dari specification template saat request dibuat."
                        arrow
                      >
                        <InfoOutlined sx={{ mb: 1, color: "#3f51b5", fontSize: 20 }} />
                      </Tooltip>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Specification belum tersimpan untuk request ini.
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
              Attachment *
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Supported formats: PDF, DOC, DOCX, PNG, JPG, JPEG
            </Typography>
            {detail.attachments.length > 0 ? (
              <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
                {detail.attachments.map((attachment, index) => (
                  <AttachmentItem
                    key={attachment.id || `${attachment.name}-${index}`}
                    attachment={attachment}
                    index={index}
                  />
                ))}
              </Stack>
            ) : (
              <Chip icon={<AttachFile />} label="No attachment found" variant="outlined" />
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Button
          variant="contained"
          onClick={handleDialogClose}
          disabled={submitting}
          sx={{ bgcolor: "#546e7a", textTransform: "none" }}
        >
          Close
        </Button>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            disabled={submitting}
            onClick={() => {
              setCurrentAction("Approve");
              setRemarkText("");
              setRemarkDialogOpen(true);
            }}
            sx={{ bgcolor: "#0b35d9", textTransform: "none", fontWeight: 800 }}
          >
            Approve
          </Button>
          <Tooltip title="Belum masuk scope">
            <span>
              <Button
                variant="contained"
                startIcon={<Replay />}
                disabled
                title="Belum masuk scope"
                sx={{ bgcolor: "#fb8c00", textTransform: "none", fontWeight: 800 }}
              >
                Rework
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Belum masuk scope">
            <span>
              <Button
                variant="contained"
                startIcon={<Cancel />}
                disabled
                title="Belum masuk scope"
                sx={{ bgcolor: "#c62828", textTransform: "none", fontWeight: 800 }}
              >
                Reject
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </DialogActions>

      <Dialog
        open={remarkDialogOpen}
        onClose={handleRemarkDialogClose}
        maxWidth="xs"
        fullWidth
      >
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmber sx={{ color: "#f59e0b" }} />
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Reason
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please enter the reason before proceeding.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Enter your message here..."
            value={remarkText}
            onChange={e => setRemarkText(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                bgcolor: "#f5f5f5",
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleRemarkDialogClose}
            disabled={submitting}
            sx={{ color: "text.secondary", textTransform: "none" }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              onAction?.(currentAction, detail, remarkText);
            }}
            disabled={submitting}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
