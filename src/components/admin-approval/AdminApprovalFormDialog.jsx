import {
  AccessTimeOutlined,
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
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Popover,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildApprovalDetail } from "src/helper/adminApprovalDetail.mjs";
import { createApprovalDraft } from "src/helper/adminApprovalDraft.mjs";
import { buildCombinedLongTextHistory } from "src/helper/adminApprovalFieldHistory.mjs";
import {
  buildApprovalFieldHints,
  buildApprovalSpecificationFields,
  normalizeApprovalInputValue,
  validateApprovalDraft,
} from "src/helper/adminApprovalValidation.mjs";
import {
  buildApprovalSubGroupOptions,
  findSubGroupOptionById,
  formatSubGroupOptionLabel,
} from "src/helper/adminApprovalSubGroup.mjs";

const approvalStatusColors = {
  APPROVED: { bgcolor: "#e8f5e9", color: "#1b5e20" },
  WAITING: { bgcolor: "#eef2f7", color: "#546e7a" },
  REWORK: { bgcolor: "#fff7ed", color: "#c2410c" },
  REJECT: { bgcolor: "#fee2e2", color: "#b91c1c" },
  REJECTED: { bgcolor: "#fee2e2", color: "#b91c1c" },
  SKIPPED: { bgcolor: "#f3f4f6", color: "#9ca3af" },
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
const isChangeExtendRequest = row =>
  ["CHANGE", "EXTEND"].includes(String(row?.ticketType || row?.ticket_type || "").toUpperCase());

const shouldShowFieldHistoryIcon = sections =>
  Array.isArray(sections) && sections.length > 0;

function renderDefaultHistoryValue(value) {
  return <Typography variant="body2">{value || "-"}</Typography>;
}

function renderLongTextHistoryValue(value) {
  const lines = Array.isArray(value) ? value : [value || "-"];

  return (
    <Stack spacing={0.75}>
      {lines.map((lineValue, index) => (
        <Box key={`long-text-history-${index}`}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
            Long Text {index + 1}
          </Typography>
          <Typography variant="body2">{lineValue || "-"}</Typography>
        </Box>
      ))}
    </Stack>
  );
}

function FieldHistoryLabel({ label, sections, renderSectionValue = renderDefaultHistoryValue }) {
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {label}
      </Typography>
      {shouldShowFieldHistoryIcon(sections) ? (
        <>
          <Tooltip title="View change history" arrow placement="top">
            <IconButton
              size="small"
              onClick={event => setAnchorEl(event.currentTarget)}
              sx={{
                width: 24,
                height: 24,
                bgcolor: "#fff7e6",
                border: "1px solid #fde68a",
                "&:hover": {
                  bgcolor: "#ffefbf",
                },
              }}
            >
              <AccessTimeOutlined sx={{ fontSize: 15, color: "#d97706" }} />
            </IconButton>
          </Tooltip>
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
                      {renderSectionValue(section.beforeValue)}
                    </Box>
                    <Box sx={{ flex: 1, border: "1px solid #d7dde6", p: 1, bgcolor: "#f5f8ff" }}>
                      <Typography variant="caption">After</Typography>
                      {renderSectionValue(section.afterValue)}
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

function ChangeExtendApprovalSummary({ detail }) {
  const rawRow = detail?.rawRow || {};
  const ticketType = String(detail?.ticketType || rawRow?.ticket_type || "").toUpperCase();
  const isExtend = ticketType === "EXTEND";

  return (
    <Stack spacing={2}>
      <ReadOnlyField label="Material Code" value={rawRow?.materialCode || rawRow?.material_code} />
      <ReadOnlyField
        label="Material Name"
        value={detail?.basicInfo?.materialDescription || rawRow?.material_description}
      />
      {isExtend ? (
        <>
          <ReadOnlyField
            label="Plant"
            value={rawRow?.plantCode || rawRow?.plant_code || detail?.basicInfo?.plant}
          />
          <ReadOnlyField
            label="Storage Location"
            value={
              rawRow?.slocCode || rawRow?.sloc_code || detail?.basicInfo?.storageLocation
            }
          />
        </>
      ) : (
        <ReadOnlyField
          label="Base UoM"
          value={detail?.basicInfo?.baseUom || rawRow?.uom || rawRow?.base_uom}
        />
      )}
      <ReadOnlyField
        label="Reason"
        value={rawRow?.changeExtendReason || rawRow?.change_extend_reason}
        multiline
        rows={3}
      />
    </Stack>
  );
}

function ApprovalHistoryItem({ item }) {
  const color = approvalStatusColors[item.status] || approvalStatusColors.WAITING;
  const isSkipped = item.status === "SKIPPED";
  const isUnassignedWaiting =
    item.status === "WAITING" &&
    (item.approver === "-" || !item.approver || item.approver.trim() === "");

  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        minWidth: 170,
        p: 1.5,
        border: "1px solid",
        borderColor: isSkipped ? "#e5e7eb" : "divider",
        borderRadius: 2,
        opacity: isSkipped ? 0.65 : 1,
      }}
    >
      <Stack spacing={0.75}>
        <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary" }}>
          {item.label}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Chip
            label={item.status}
            size="small"
            sx={{ alignSelf: "flex-start", fontWeight: 800, ...color }}
          />
          {isUnassignedWaiting && (
            <Tooltip title="Approver belum di-assign" arrow placement="top">
              <WarningAmber sx={{ fontSize: 16, color: "#f59e0b" }} />
            </Tooltip>
          )}
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {item.approver}
        </Typography>
        {isSkipped ? (
          <Typography variant="caption" sx={{ fontStyle: "italic", color: "#9ca3af" }}>
            {item.remark || "Not required"}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            {item.approvedAt}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];
const isImageFile = fileName => {
  if (!fileName || !fileName.includes(".")) return false;
  const ext = fileName.split(".").pop().toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
};

function AttachmentItem({ attachment, index, onView }) {
  const fileUrl = attachment.path
    ? import.meta.env.VITE_URL_LOC + "/material/file/" + attachment.path
    : "";
  const isImage = isImageFile(attachment.name);
  const extension = attachment.name.includes(".")
    ? attachment.name.split(".").pop().toUpperCase()
    : "FILE";

  const handleClick = () => {
    if (fileUrl && onView) {
      onView({ name: attachment.name, url: fileUrl, type: attachment.type || "" });
    }
  };

  return (
    <Paper
      elevation={0}
      onClick={handleClick}
      title={fileUrl ? "Click to view file" : ""}
      sx={{
        width: { xs: "100%", sm: 280 },
        p: 1.25,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        cursor: fileUrl ? "pointer" : "default",
        "&:hover": fileUrl
          ? { borderColor: "primary.main", bgcolor: "action.hover" }
          : {},
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 1.5,
          bgcolor: "#edf4ff",
          color: "#2457c5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
          fontWeight: 900,
          fontSize: "0.72rem",
        }}
      >
        {extension}
        {isImage && fileUrl && (
          <Box
            component="img"
            src={fileUrl}
            onError={e => {
              e.target.style.opacity = "0.15";
              e.target.style.filter = "grayscale(100%)";
            }}
            sx={{
              width: 52,
              height: 52,
              objectFit: "cover",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          />
        )}
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
  formSchema = null,
  serverValidationErrors = {},
  onClearServerValidationErrors,
}) {
  const detail = useMemo(() => buildApprovalDetail(row || {}), [row]);
  const subGroupOptions = useMemo(
    () => buildApprovalSubGroupOptions(subGroups, row || {}),
    [subGroups, row]
  );
  const requestFieldIndex = useMemo(() => {
    const fields = Array.isArray(formSchema?.sections)
      ? formSchema.sections.flatMap(section => section.fields || [])
      : [];

    return fields.reduce((index, field) => {
      if (field?.kind !== "request_rule") {
        return index;
      }

      if (field.fieldKey === "base_unit_of_measure") {
        index.base_uom = field;
      } else if (field.fieldKey === "plant") {
        index.plant_code = field;
      } else if (field.fieldKey === "storage_location") {
        index.sloc_code = field;
      } else {
        index[field.fieldKey] = field;
      }

      return index;
    }, {});
  }, [formSchema]);
  const fieldHints = useMemo(() => buildApprovalFieldHints(formSchema), [formSchema]);
  const specificationFields = useMemo(
    () =>
      buildApprovalSpecificationFields({
        detailFields: detail.specificationFields,
        formSchema,
      }),
    [detail.specificationFields, formSchema]
  );
  const longTextHistorySections = useMemo(
    () => buildCombinedLongTextHistory({ currentRow: detail.rawRow }),
    [detail.rawRow]
  );
  const isScopedChangeExtendRequest = isChangeExtendRequest(row);

  const [draftValues, setDraftValues] = useState(() => createApprovalDraft(detail));
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewImageError, setPreviewImageError] = useState(false);
  const [currentAction, setCurrentAction] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [finalCodeSuffix, setFinalCodeSuffix] = useState("");
  const [finalCodeSuffixError, setFinalCodeSuffixError] = useState("");

  const handleViewAttachment = file => {
    setPreviewFile(file);
    setPreviewImageError(false);
    setPreviewOpen(true);
  };
  const [remarkError, setRemarkError] = useState("");
  const [clientFieldErrors, setClientFieldErrors] = useState({});
  const [hasInteracted, setHasInteracted] = useState(false);
  const [validationSnackbarOpen, setValidationSnackbarOpen] = useState(false);
  const [validationErrorCount, setValidationErrorCount] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setRemarkDialogOpen(false);
      setCurrentAction("");
      setRemarkText("");
      setFinalCodeSuffix("");
      setFinalCodeSuffixError("");
      setClientFieldErrors({});
      setHasInteracted(false);
      setValidationSnackbarOpen(false);
      setValidationErrorCount(0);
    }
  }, [open, row]);

  useEffect(() => {
    setDraftValues(createApprovalDraft(detail));
    setClientFieldErrors({});
    setHasInteracted(false);
  }, [detail]);

  useEffect(() => {
    if (!hasInteracted) {
      return;
    }

    setClientFieldErrors(
      validateApprovalDraft({
        draftValues,
        formSchema,
      })
    );
  }, [draftValues, formSchema, hasInteracted]);

  const normalizedDetailStatus = String(detail.status || "").trim().toUpperCase();
  const canSubmitApprovalAction = normalizedDetailStatus === "SUBMIT";

  const unassignedStages = useMemo(() => {
    const stages = detail.approvalHistory || [];
    return stages
      .filter(item => item.status !== "SKIPPED" && item.approver === "-")
      .map(item => ({ label: item.label, step: item.step }));
  }, [detail.approvalHistory]);

  const displayFieldErrors = useMemo(
    () => ({
      ...clientFieldErrors,
      ...(serverValidationErrors || {}),
    }),
    [clientFieldErrors, serverValidationErrors]
  );

  const updateDraftValues = updater => {
    setHasInteracted(true);
    onClearServerValidationErrors?.();
    setDraftValues(current => updater(current));
  };

  const handleApproveClick = () => {
    if (isScopedChangeExtendRequest) {
      setCurrentAction("Approve");
      setRemarkText("");
      setRemarkError("");
      setRemarkDialogOpen(true);
      return;
    }

    const nextErrors = validateApprovalDraft({
      draftValues,
      formSchema,
    });

    setHasInteracted(true);
    setClientFieldErrors(nextErrors);
    onClearServerValidationErrors?.();

    if (Object.keys(nextErrors).length > 0) {
      setValidationErrorCount(Object.keys(nextErrors).length);
      setValidationSnackbarOpen(true);

      const firstErrorInput = contentRef.current?.querySelector(
        "input[aria-invalid='true'], *[aria-invalid='true']"
      );
      if (firstErrorInput) {
        setTimeout(() => {
          firstErrorInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 250);
      }
      return;
    }

    setCurrentAction("Approve");
    setRemarkText("");
    setRemarkError("");
    setFinalCodeSuffix("");
    setFinalCodeSuffixError("");
    setRemarkDialogOpen(true);
  };

  const handleReworkClick = () => {
    setCurrentAction("Rework");
    setRemarkText("");
    setRemarkError("");
    setFinalCodeSuffix("");
    setFinalCodeSuffixError("");
    setRemarkDialogOpen(true);
  };

  const handleRejectClick = () => {
    setCurrentAction("Reject");
    setRemarkText("");
    setRemarkError("");
    setFinalCodeSuffix("");
    setFinalCodeSuffixError("");
    setRemarkDialogOpen(true);
  };

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

  const finalCodePrefix = useMemo(() => {
    const rawRow = detail?.rawRow || row || {};
    const groupCode = String(rawRow.materialGroupCode || rawRow.material_group_code || "").trim();
    const subGroupCode = String(
      rawRow.subMaterialGroupCode ||
        rawRow.material_sub_group_code ||
        rawRow.sub_material_group_code ||
        ""
    ).trim();

    if (!groupCode || !subGroupCode) {
      return "";
    }

    return `${groupCode}.${subGroupCode}.`;
  }, [detail, row]);

  const isApproval3Active = String(
    row?.approvalStage ||
      detail?.rawRow?.approvalStage ||
      detail?.assignedTo ||
      row?.assignedTo ||
      ""
  )
    .trim()
    .toUpperCase() === "APPROVAL 3";
  const isApproval3Approve = currentAction === "Approve" && isApproval3Active;

  const renderFieldHint = fieldKey => {
    const hintText = fieldHints[fieldKey];

    if (!hintText) {
      return null;
    }

    return (
      <Tooltip
        title={
          <Box sx={{ p: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Notes
            </Typography>
            <Typography variant="caption">{hintText}</Typography>
          </Box>
        }
        arrow
        placement="right"
      >
        <InfoOutlined sx={{ mb: 1, color: "#3f51b5", fontSize: 20 }} />
      </Tooltip>
    );
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

      <DialogContent ref={contentRef} sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
        <Stack spacing={3}>
          {unassignedStages.length > 0 && canSubmitApprovalAction && (
            <Alert severity="info" variant="outlined" sx={{ mb: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                Approver belum assigned: {unassignedStages.map(s => s.label).join(", ")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Saat approve, admin akan otomatis ter-assign ke stage yang belum ada assignee.
                {unassignedStages.some(s => s.step === 3) && " Approval 3 akan otomatis ter-assign ke random user MDM_MATERIAL."}
              </Typography>
            </Alert>
          )}
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

          {isScopedChangeExtendRequest ? (
            <Box>
              <SectionLabel>Request Summary</SectionLabel>
              <ChangeExtendApprovalSummary detail={detail} />
            </Box>
          ) : (
            <>
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
                  value={findSubGroupOptionById(subGroupOptions, draftValues.material_sub_group_id, row)}
                  options={subGroupOptions}
                  isOptionEqualToValue={(option, value) =>
                    String(option?.id ?? "") === String(value?.id ?? "")
                  }
                  getOptionLabel={option => formatSubGroupOptionLabel(option)}
                  onChange={(_, newValue) =>
                    updateDraftValues(current => ({
                      ...current,
                      material_sub_group_id: newValue?.id ?? null,
                    }))
                  }
                  renderInput={params => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Select sub material group"
                      error={Boolean(displayFieldErrors.material_sub_group_id?.error)}
                      helperText={displayFieldErrors.material_sub_group_id?.message || ""}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FieldHistoryLabel
                  label="Material Description *"
                  sections={detail.fieldHistory?.material_description || []}
                />
                <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={draftValues.material_description}
                    onChange={event =>
                      updateDraftValues(current => ({
                        ...current,
                        material_description: event.target.value,
                      }))
                    }
                    inputProps={{ maxLength: 40 }}
                    error={Boolean(displayFieldErrors.material_description?.error)}
                    helperText={displayFieldErrors.material_description?.message || ""}
                  />
                  {renderFieldHint("material_description")}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <FieldHistoryLabel
                  label={`Base UoM${requestFieldIndex.base_uom?.isRequired ? " *" : ""}`}
                  sections={detail.fieldHistory?.base_uom || []}
                />
                <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={draftValues.base_uom}
                    onChange={event =>
                      updateDraftValues(current => ({
                        ...current,
                        base_uom: event.target.value,
                      }))
                    }
                    error={Boolean(displayFieldErrors.base_uom?.error)}
                    helperText={displayFieldErrors.base_uom?.message || ""}
                  />
                  {renderFieldHint("base_uom")}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <FieldHistoryLabel
                  label={`Plant${requestFieldIndex.plant_code?.isRequired ? " *" : ""}`}
                  sections={detail.fieldHistory?.plant_code || []}
                />
                <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={draftValues.plant_code || ""}
                    onChange={event =>
                      updateDraftValues(current => ({
                        ...current,
                        plant_code: event.target.value,
                      }))
                    }
                    error={Boolean(displayFieldErrors.plant_code?.error)}
                    helperText={displayFieldErrors.plant_code?.message || ""}
                  />
                  {renderFieldHint("plant_code")}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <FieldHistoryLabel
                  label={`Storage Location${requestFieldIndex.sloc_code?.isRequired ? " *" : ""}`}
                  sections={detail.fieldHistory?.sloc_code || []}
                />
                <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={draftValues.sloc_code || ""}
                    onChange={event =>
                      updateDraftValues(current => ({
                        ...current,
                        sloc_code: event.target.value,
                      }))
                    }
                    error={Boolean(displayFieldErrors.sloc_code?.error)}
                    helperText={displayFieldErrors.sloc_code?.message || ""}
                  />
                  {renderFieldHint("sloc_code")}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <FieldHistoryLabel
                  label="Long Text"
                  sections={longTextHistorySections}
                  renderSectionValue={renderLongTextHistoryValue}
                />
                <Stack spacing={1}>
                  {["long_text_1", "long_text_2", "long_text_3"].map(key => (
                    <TextField
                      key={key}
                      fullWidth
                      size="small"
                      value={draftValues[key] || ""}
                      onChange={event =>
                        updateDraftValues(current => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      inputProps={{ maxLength: 40 }}
                      error={Boolean(displayFieldErrors[key]?.error)}
                      helperText={displayFieldErrors[key]?.message || ""}
                      sx={{ "& .MuiOutlinedInput-notchedOutline": { borderStyle: "dashed" } }}
                    />
                  ))}
                </Stack>
              </Grid>
                </Grid>
              </Box>

              <Box>
                <SectionLabel>Specification</SectionLabel>
                {specificationFields.length > 0 ? (
                  <Grid container spacing={2.5}>
                {specificationFields.map(field => {
                  const historySections = field.historySections || [];
                  const isEditable = isEditableApprovalField(field.key) || field.historyKey;
                  const fieldValue = draftValues.template_payload?.templateValues?.[field.key] ?? field.value;
                  const fieldError = displayFieldErrors[field.key];

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
                                updateDraftValues(current => ({
                                  ...current,
                                  template_payload: {
                                    ...(current.template_payload || {}),
                                    templateValues: {
                                      ...(current.template_payload?.templateValues || {}),
                                      [field.key]: normalizeApprovalInputValue(
                                        field,
                                        event.target.value
                                      ),
                                    },
                                  },
                                }))
                              }
                              error={Boolean(fieldError?.error)}
                              helperText={fieldError?.message || ""}
                              inputProps={{ maxLength: field.maxLength || undefined }}
                            />
                          ) : (
                            <ReadOnlyField label={field.label} value={fieldValue} />
                          )}
                        </Box>
                        {renderFieldHint(field.key) ||
                          (!shouldShowFieldHistoryIcon(historySections) && (
                            <Tooltip
                              title="Field ini berasal dari specification template saat request dibuat."
                              arrow
                            >
                              <InfoOutlined sx={{ mb: 1, color: "#3f51b5", fontSize: 20 }} />
                            </Tooltip>
                          ))}
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 2 }}
                >
                  Supported formats: PDF, DOC, DOCX, PNG, JPG, JPEG
                </Typography>
                {detail.attachments.length > 0 ? (
                  <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
                    {detail.attachments.map((attachment, index) => (
                      <AttachmentItem
                        key={attachment.id || `${attachment.name}-${index}`}
                        attachment={attachment}
                        index={index}
                        onView={handleViewAttachment}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Chip icon={<AttachFile />} label="No attachment found" variant="outlined" />
                )}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>


      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">{previewFile?.name || "File Preview"}</Typography>
            <IconButton onClick={() => setPreviewOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent
          sx={{
            height: "70vh",
            p: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {previewFile &&
            (previewFile.type?.includes("image") ? (
              previewImageError ? (
                <Box sx={{ textAlign: "center", p: 3 }}>
                  <Typography variant="body1" gutterBottom color="error">
                    Unable to load image preview.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    The file may have been moved or deleted.
                  </Typography>
                  <Button variant="contained" href={previewFile.url} target="_blank" sx={{ mt: 1 }}>
                    Open File
                  </Button>
                </Box>
              ) : (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  onError={() => setPreviewImageError(true)}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              )
            ) : previewFile.type?.includes("pdf") ? (
              <iframe
                src={previewFile.url}
                title={previewFile.name}
                width="100%"
                height="100%"
                style={{ border: "none" }}
              />
            ) : (
              <Box sx={{ textAlign: "center", p: 3 }}>
                <Typography variant="body1" gutterBottom>
                  This file type cannot be previewed directly.
                </Typography>
                <Button variant="contained" href={previewFile.url} target="_blank" sx={{ mt: 2 }}>
                  Open File
                </Button>
              </Box>
            ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          <Button
            variant="contained"
            href={previewFile?.url}
            download={previewFile?.name}
            disabled={!previewFile}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
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
            disabled={submitting || !canSubmitApprovalAction}
            onClick={handleApproveClick}
            sx={{ bgcolor: "#0b35d9", textTransform: "none", fontWeight: 800 }}
          >
            Approve
          </Button>
          <Button
            variant="contained"
            startIcon={<Replay />}
            disabled={submitting || !canSubmitApprovalAction}
            onClick={handleReworkClick}
            sx={{ bgcolor: "#fb8c00", textTransform: "none", fontWeight: 800 }}
          >
            Rework
          </Button>
          <Button
            variant="contained"
            startIcon={<Cancel />}
            disabled={submitting || !canSubmitApprovalAction}
            onClick={handleRejectClick}
            sx={{ bgcolor: "#c62828", textTransform: "none", fontWeight: 800 }}
          >
            Reject
          </Button>
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
            {currentAction ? `${currentAction} Reason` : "Reason"}
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {currentAction
              ? `Please enter the reason before proceeding with ${currentAction.toLowerCase()}.`
              : "Please enter the reason before proceeding."}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Enter your message here..."
            value={remarkText}
            error={Boolean(remarkError)}
            helperText={remarkError}
            onChange={e => {
              setRemarkText(e.target.value);
              if (remarkError) {
                setRemarkError("");
              }
            }}
            sx={{
              "& .MuiInputBase-root": {
                bgcolor: "#f5f5f5",
              },
            }}
          />
          {isApproval3Approve && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ display: "block", mb: 0.75, fontWeight: 800 }}>
                Final Code
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={finalCodeSuffix}
                placeholder="123"
                inputProps={{ maxLength: 3, inputMode: "numeric", pattern: "[0-9]*" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">{finalCodePrefix || "-.-."}</InputAdornment>
                  ),
                }}
                error={Boolean(finalCodeSuffixError)}
                helperText={finalCodeSuffixError || "Masukkan 3 digit terakhir final code."}
                onChange={event => {
                  setFinalCodeSuffix(event.target.value.replace(/\D/g, "").slice(0, 3));
                  if (finalCodeSuffixError) {
                    setFinalCodeSuffixError("");
                  }
                }}
              />
            </Box>
          )}
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
              if (currentAction === "Reject" && !String(remarkText || "").trim()) {
                setRemarkError("Reject reason is required.");
                return;
              }

              if (isApproval3Approve && !/^\d{3}$/.test(String(finalCodeSuffix || "").trim())) {
                setFinalCodeSuffixError("Final code suffix must be 3 digits.");
                return;
              }

              onAction?.(
                currentAction,
                detail,
                isScopedChangeExtendRequest
                  ? {
                      remark: remarkText,
                      ...(isApproval3Approve ? { finalCodeSuffix } : {}),
                    }
                  : {
                      remark: remarkText,
                      ...(isApproval3Approve ? { finalCodeSuffix } : {}),
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
                    }
              );
            }}
            disabled={submitting}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            {submitting ? "Saving..." : currentAction || "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={validationSnackbarOpen}
        autoHideDuration={8000}
        onClose={() => setValidationSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setValidationSnackbarOpen(false)}
          severity="warning"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {validationErrorCount} field{validationErrorCount !== 1 ? "s" : ""} belum valid. Harap perbaiki field yang ditandai sebelum approve.
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
