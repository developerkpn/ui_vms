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
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  IconButton,
  Paper,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { buildApprovalDetail } from "src/helper/adminApprovalDetail.mjs";
import { buildApprovalFieldHistory } from "src/helper/adminApprovalFieldHistory.mjs";

const approvalStatusColors = {
  APPROVED: { bgcolor: "#e8f5e9", color: "#1b5e20" },
  WAITING: { bgcolor: "#eef2f7", color: "#546e7a" },
  REWORK: { bgcolor: "#fff7ed", color: "#c2410c" },
  REJECT: { bgcolor: "#fee2e2", color: "#b91c1c" },
  REJECTED: { bgcolor: "#fee2e2", color: "#b91c1c" },
};

const EDITABLE_FIELD_KEYS = [
  "material_sub_group_id",
  "plant_code",
  "sloc_code",
  "material_description",
  "base_uom",
  "long_text_1",
  "long_text_2",
  "long_text_3",
  "template_payload",
];

const isEditableApprovalField = fieldKey => EDITABLE_FIELD_KEYS.includes(fieldKey);

const shouldShowFieldHistoryIcon = sections =>
  Array.isArray(sections) && sections.length > 0;

function FieldHistoryLabel({ label, sections }) {
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {label}
      </Typography>
      {shouldShowFieldHistoryIcon(sections) ? (
        <>
          <IconButton size="small" onClick={event => setAnchorEl(event.currentTarget)}>
            <InfoOutlined sx={{ fontSize: 18, color: "#3f51b5" }} />
          </IconButton>
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <Stack spacing={1.5} sx={{ p: 2, width: 440, maxHeight: 380, overflowY: "auto" }}>
              {sections.map(section => (
                <Paper key={`${section.stage}-${section.approvedAt}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                    {section.stage}
                  </Typography>
                  <Stack direction="row" spacing={1.5}>
                    <Box sx={{ flex: 1, border: "1px solid #d7dde6", p: 1 }}>
                      <Typography variant="caption">Before</Typography>
                      <Typography variant="body2">{section.beforeValue || "-"}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, border: "1px solid #d7dde6", p: 1, bgcolor: "#f5f8ff" }}>
                      <Typography variant="caption">After</Typography>
                      <Typography variant="body2">{section.afterValue || "-"}</Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                    Source By: {section.sourceBy || "-"}
                  </Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>
                    Changed By: {section.changedBy || "-"}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Popover>
        </>
      ) : null}
    </Stack>
  );
}

function createApprovalDraft(detail) {
  const raw = detail.rawRow || {};
  return {
    material_sub_group_id: raw.material_sub_group_id ?? null,
    plant_code: raw.plant_code ?? raw.plant ?? null,
    sloc_code: raw.sloc_code ?? raw.storage_location ?? null,
    material_description: raw.material_description ?? detail.basicInfo?.materialDescription ?? "",
    base_uom: raw.base_uom ?? detail.basicInfo?.baseUom ?? "",
    long_text_1: raw.long_text_1 ?? "",
    long_text_2: raw.long_text_2 ?? "",
    long_text_3: raw.long_text_3 ?? "",
    template_payload: raw.template_payload ?? raw.templatePayload ?? {},
  };
}

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
  subGroups = [],
}) {
  const detail = useMemo(() => buildApprovalDetail(row || {}), [row]);

  const [draftValues, setDraftValues] = useState(() => createApprovalDraft(detail));
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState("");
  const [remarkText, setRemarkText] = useState("");

  useEffect(() => {
    if (!open) {
      setRemarkDialogOpen(false);
      setCurrentAction("");
      setRemarkText("");
    }
  }, [open, row]);

  useEffect(() => {
    setDraftValues(createApprovalDraft(detail));
  }, [detail]);

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
                <FieldHistoryLabel
                  label="Sub Material Group *"
                  sections={detail.fieldHistory?.material_sub_group_id || []}
                />
                <Autocomplete
                  fullWidth
                  size="small"
                  value={
                    subGroups.find(
                      sg => sg.id === draftValues.material_sub_group_id
                    ) || null
                  }
                  options={subGroups}
                  getOptionLabel={option => option.name || option.subGroupName || `Sub Group ${option.id}`}
                  onChange={(_, newValue) =>
                    setDraftValues(current => ({
                      ...current,
                      material_sub_group_id: newValue?.id ?? null,
                    }))
                  }
                  renderInput={params => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Select sub material group"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FieldHistoryLabel
                  label="Material Description *"
                  sections={detail.fieldHistory?.material_description || []}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Material Description *"
                  value={draftValues.material_description}
                  onChange={event =>
                    setDraftValues(current => ({
                      ...current,
                      material_description: event.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FieldHistoryLabel
                  label="Base UoM *"
                  sections={detail.fieldHistory?.base_uom || []}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Base UoM *"
                  value={draftValues.base_uom}
                  onChange={event =>
                    setDraftValues(current => ({
                      ...current,
                      base_uom: event.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FieldHistoryLabel
                  label="Plant"
                  sections={detail.fieldHistory?.plant_code || []}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Plant"
                  value={draftValues.plant_code || ""}
                  onChange={event =>
                    setDraftValues(current => ({
                      ...current,
                      plant_code: event.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FieldHistoryLabel
                  label="Storage Location"
                  sections={detail.fieldHistory?.sloc_code || []}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Storage Location"
                  value={draftValues.sloc_code || ""}
                  onChange={event =>
                    setDraftValues(current => ({
                      ...current,
                      sloc_code: event.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <FieldHistoryLabel
                  label="Long Text"
                  sections={[]}
                />
                <Stack spacing={1}>
                  {[
                    { key: "long_text_1", label: "Long Text 1" },
                    { key: "long_text_2", label: "Long Text 2" },
                    { key: "long_text_3", label: "Long Text 3" },
                  ].map(({ key, label }) => (
                    <TextField
                      key={key}
                      fullWidth
                      size="small"
                      label={label}
                      value={draftValues[key] || ""}
                      onChange={event =>
                        setDraftValues(current => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Box>

          <Box>
            <SectionLabel>Specification</SectionLabel>
            {detail.specificationFields.length > 0 ? (
              <Grid container spacing={2.5}>
                {detail.specificationFields.map(field => {
                  const historySections = field.historySections || [];
                  const isEditable = isEditableApprovalField(field.key) || field.historyKey;
                  const fieldValue = draftValues.template_payload?.templateValues?.[field.key] ?? field.value;

                  return (
                    <Grid item xs={12} md={6} key={field.key}>
                      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <FieldHistoryLabel
                            label={field.label}
                            sections={historySections}
                          />
                          {isEditable ? (
                            <TextField
                              fullWidth
                              size="small"
                              value={fieldValue || ""}
                              onChange={event =>
                                setDraftValues(current => ({
                                  ...current,
                                  template_payload: {
                                    ...(current.template_payload || {}),
                                    templateValues: {
                                      ...(current.template_payload?.templateValues || {}),
                                      [field.key]: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          ) : (
                            <ReadOnlyField label={field.label} value={fieldValue} />
                          )}
                        </Box>
                        {!shouldShowFieldHistoryIcon(historySections) && (
                          <Tooltip
                            title="Field ini berasal dari specification template saat request dibuat."
                            arrow
                          >
                            <InfoOutlined sx={{ mb: 1, color: "#3f51b5", fontSize: 20 }} />
                          </Tooltip>
                        )}
                      </Box>
                    </Grid>
                  );
                })}
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
              onAction?.(currentAction, detail, {
                remark: remarkText,
                editedRequest: {
                  material_sub_group_id: draftValues.material_sub_group_id,
                  plant_code: draftValues.plant_code,
                  sloc_code: draftValues.sloc_code,
                  material_description: draftValues.material_description,
                  base_uom: draftValues.base_uom,
                  long_text_1: draftValues.long_text_1,
                  long_text_2: draftValues.long_text_2,
                  long_text_3: draftValues.long_text_3,
                  template_payload: draftValues.template_payload,
                },
              });
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
