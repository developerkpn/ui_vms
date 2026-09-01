import {
  AccessTimeOutlined,
  AttachFile,
  Cancel,
  CheckCircle,
  Close,
  Delete,
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
  Grid,
  IconButton,
  Paper,
  Popover,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AttachmentPreviewDialog, {
  buildAttachmentUrl,
  isImageFile,
} from "src/components/common/AttachmentPreviewDialog";
import SectionLoadingSkeleton from "src/components/common/SectionLoadingSkeleton";
import useSessionStore from "src/store/useSessionStore";
import { buildApprovalDetail } from "src/helper/adminApprovalDetail.js";
import { isMdmMaterialUser } from "src/helper/adminApprovalView.js";
import {
  applyOptimisticMdmClaim,
  buildClaimMdmPath,
  evaluateMdmClaimGate,
  extractClaimedApprovalSteps,
  identifiersMatch,
  MDM_GRAB_BUTTON_BUSY_LABEL,
  MDM_GRAB_BUTTON_LABEL,
  MDM_STEP_KIND,
  resolveMdmClaimErrorMessage,
  resolveStepApproverUserId,
} from "src/helper/mdmClaimGate.js";
import {
  combineMaterialDescription,
  splitMaterialDescription,
  MATERIAL_DESCRIPTION_MAX_LENGTH,
} from "src/helper/materialDescription.js";
import {
  buildApprovalFieldHints,
  buildApprovalSpecificationFields,
  normalizeApprovalInputValue,
  validateApprovalDraft,
} from "src/helper/adminApprovalValidation.js";
import {
  buildApprovalSubGroupOptions,
  findSubGroupOptionById,
  formatSubGroupOptionLabel,
} from "src/helper/adminApprovalSubGroup.js";
import {
  buildReworkDestinationPayload,
  buildReworkDestinationSlots,
  describeReworkDestination,
  NOTIFY_VIA_APP,
  NOTIFY_VIA_EMAIL,
  resolveReworkRequester,
  REWORK_TO_NEW_APPROVER,
  REWORK_TO_REQUESTER,
  validateReworkDestination,
} from "src/helper/adminApprovalRework.js";
import {
  buildReworkEmailPayload,
  deriveReworkEmailReason,
  hasReworkEmailContentError,
  resolveReworkEmailKind,
  REWORK_EMAIL_REASON_NOTICE,
  validateReworkEmailContent,
} from "src/helper/reworkEmailThread.js";
import ReworkDestinationField from "./ReworkDestinationField";
import ReworkEmailThreadSection from "./ReworkEmailThreadSection";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  ATTACHMENT_SIZE_LIMIT_TEXT,
  ATTACHMENT_SUPPORTED_FORMATS_TEXT,
  getAttachmentValidationError,
  MAX_ATTACHMENTS,
  normalizeAttachmentSelection,
} from "src/components/request-material/attachmentValidation.js";

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
}

function cloneTemplatePayload(templatePayload) {
  if (!templatePayload || typeof templatePayload !== "object" || Array.isArray(templatePayload)) {
    return {};
  }

  return {
    ...templatePayload,
    requestFields:
      templatePayload.requestFields &&
      typeof templatePayload.requestFields === "object" &&
      !Array.isArray(templatePayload.requestFields)
        ? { ...templatePayload.requestFields }
        : templatePayload.requestFields,
    templateValues:
      templatePayload.templateValues &&
      typeof templatePayload.templateValues === "object" &&
      !Array.isArray(templatePayload.templateValues)
        ? { ...templatePayload.templateValues }
        : templatePayload.templateValues,
  };
}

function createApprovalDraft(detail = {}) {
  const raw = detail.rawRow || {};
  const requestFields = raw.requestFields ?? raw.request_fields ?? {};

  const draft = {
    material_sub_group_id: firstDefined(
      raw.material_sub_group_id,
      raw.materialSubGroupId,
      raw.sub_material_group_id,
      null
    ),
    plant_code: firstDefined(
      raw.plant_code,
      raw.plantCode,
      raw.plant,
      requestFields.plant,
      null
    ),
    sloc_code: firstDefined(
      raw.sloc_code,
      raw.slocCode,
      raw.storage_location,
      raw.storageLocation,
      requestFields.storage_location,
      requestFields.storageLocation,
      null
    ),
    base_uom:
      firstDefined(raw.base_uom, raw.baseUom, raw.uom, detail.basicInfo?.baseUom, "") || "",
    template_payload: cloneTemplatePayload(
      firstDefined(raw.template_payload, raw.templatePayload, {})
    ),
  };

  // material_description + long_text_1..3 are persisted as four fixed-width SAP
  // columns; the approver edits one combined box. The columns stay canonical
  // (save payload / field history depend on them) — split/combine are exact
  // inverses. The box's raw *displayed* text (which may contain a Shift+Enter
  // newline for readability) is tracked separately in the component as
  // descriptionDisplayText; it never itself gets persisted, only its
  // space-collapsed form via splitMaterialDescription.
  draft.material_description =
    firstDefined(
      raw.material_description,
      raw.materialDescription,
      detail.basicInfo?.materialDescription,
      ""
    ) || "";
  draft.long_text_1 = firstDefined(raw.long_text_1, raw.longText1, "") || "";
  draft.long_text_2 = firstDefined(raw.long_text_2, raw.longText2, "") || "";
  draft.long_text_3 = firstDefined(raw.long_text_3, raw.longText3, "") || "";

  return draft;
}

const approvalStatusColors = {
  APPROVED: { bgcolor: "#e8f5e9", color: "#1b5e20" },
  WAITING: { bgcolor: "#eef2f7", color: "#546e7a" },
  REWORK: { bgcolor: "#f3e5f5", color: "#6a1b9a" },
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

function AttachmentItem({ attachment, index, onView, onRemove, removable = false }) {
  const fileUrl = buildAttachmentUrl(attachment);
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
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 800 }}>
          {attachment.name || `Attachment ${index + 1}`}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {attachment.existing ? attachment.type : "New file"}
        </Typography>
        {attachment.uploadedBy ? (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: "block" }}
          >
            Uploaded by {attachment.uploadedBy}
          </Typography>
        ) : null}
      </Box>
      {removable && (
        <IconButton
          size="small"
          color="error"
          onClick={event => {
            event.stopPropagation();
            onRemove?.();
          }}
          sx={{ flexShrink: 0 }}
          aria-label={`Remove ${attachment.name}`}
        >
          <Delete fontSize="small" />
        </IconButton>
      )}
    </Paper>
  );
}

export default function AdminApprovalFormDialog({
  open,
  row,
  onClose,
  onAction,
  onGrabbed,
  submitting = false,
  subGroups = [],
  formSchema = null,
  // True while the page is still fetching the sub-group list and the material
  // group's form schema — both start only once this dialog is already open, so
  // the sections built from them need somewhere to stand in the meantime.
  referenceDataLoading = false,
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
  // The four description columns are now one combined box, so fold the
  // long_text_1/2/3 change history into the material_description popover —
  // otherwise approver edits that landed past the first 40 chars would have no
  // visible audit trail. Sorted newest-first by approval time.
  const materialDescriptionHistory = useMemo(() => {
    const fieldHistory = detail.fieldHistory || {};
    return [
      ...(fieldHistory.material_description || []),
      ...(fieldHistory.long_text_1 || []),
      ...(fieldHistory.long_text_2 || []),
      ...(fieldHistory.long_text_3 || []),
    ].sort((a, b) => String(b.approvedAt || "").localeCompare(String(a.approvedAt || "")));
  }, [detail.fieldHistory]);
  const reworkRequester = useMemo(() => resolveReworkRequester(detail), [detail]);
  const isScopedChangeExtendRequest = isChangeExtendRequest(row);

  const [draftValues, setDraftValues] = useState(() => createApprovalDraft(detail));
  // Raw text shown in the Material Description box — may contain a Shift+Enter
  // newline the approver typed for readability. Kept separate from
  // draftValues so a newline is purely visual: it's collapsed to a space (via
  // splitMaterialDescription) before ever reaching draftValues/the save
  // payload, so it changes nothing about what gets submitted.
  const [descriptionDisplayText, setDescriptionDisplayText] = useState(() =>
    combineMaterialDescription(createApprovalDraft(detail))
  );
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [finalCodeDialogOpen, setFinalCodeDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [currentAction, setCurrentAction] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [reworkTarget, setReworkTarget] = useState(REWORK_TO_REQUESTER);
  // User hand-picked for the fillable "Approval 1" slot, and how they should be
  // told about it. Both only ever leave this component together with the
  // REWORK_TO_NEW_APPROVER destination.
  const [reworkNewApprover, setReworkNewApprover] = useState(null);
  const [reworkNotifyVia, setReworkNotifyVia] = useState(NOTIFY_VIA_APP);
  // The mail itself, once the EMAIL channel is chosen. It lives here rather than
  // in the field so a trip through the "Via aplikasi" radio does not throw away
  // what Master Data has already typed.
  const [reworkEmailSubject, setReworkEmailSubject] = useState("");
  const [reworkEmailBody, setReworkEmailBody] = useState("");
  const [reworkEmailErrors, setReworkEmailErrors] = useState({ subject: "", body: "" });
  const [finalCodeSuffix, setFinalCodeSuffix] = useState("");
  const [finalCodeSuffixError, setFinalCodeSuffixError] = useState("");
  // Staged attachment changes — held here and only sent to the server as part
  // of an Approve/Rework payload. Closing the dialog or rejecting discards it,
  // since neither of those is a recorded action attachment changes should ride
  // along with.
  const [pendingAttachments, setPendingAttachments] = useState(() =>
    (detail.attachments || []).map(attachment => ({ ...attachment, existing: true }))
  );
  const [attachmentError, setAttachmentError] = useState("");
  const attachmentInputRef = useRef(null);

  const handleViewAttachment = file => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const handleAttachmentBrowseClick = () => {
    attachmentInputRef.current?.click();
  };

  const handleAttachmentFileChange = event => {
    const files = Array.from(event.target.files || []);
    const result = normalizeAttachmentSelection(files, pendingAttachments);
    setPendingAttachments(result.files);
    setAttachmentError(result.error || "");

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const handleRemovePendingAttachment = indexToRemove => {
    setPendingAttachments(prev => prev.filter((_, index) => index !== indexToRemove));
    setAttachmentError("");
  };
  const [remarkError, setRemarkError] = useState("");
  const [clientFieldErrors, setClientFieldErrors] = useState({});
  const [hasInteracted, setHasInteracted] = useState(false);
  const [validationSnackbarOpen, setValidationSnackbarOpen] = useState(false);
  const [validationErrorCount, setValidationErrorCount] = useState(0);
  const [uomOptions, setUomOptions] = useState([]);
  // Holds the freshly-claimed approval steps returned by the claim-mdm endpoint
  // so the dialog reflects the grab without waiting for a parent refresh.
  const [claimedSteps, setClaimedSteps] = useState(null);
  const [grabbing, setGrabbing] = useState(false);
  const [grabError, setGrabError] = useState("");
  const axiosPrivate = useAxiosPrivate();
  const currentUserId = useSessionStore(state => state.user_id);
  const currentUsername = useSessionStore(state => state.username);
  const isMdmUser = useSessionStore(isMdmMaterialUser);

  useEffect(() => {
    let active = true;
    axiosPrivate.get("/material/uom").then(res => {
      if (active && res.data?.success) {
        setUomOptions(res.data.data || []);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const contentRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setRemarkDialogOpen(false);
      setFinalCodeDialogOpen(false);
      setCurrentAction("");
      setRemarkText("");
      setReworkTarget(REWORK_TO_REQUESTER);
      setReworkNewApprover(null);
      setReworkNotifyVia(NOTIFY_VIA_APP);
      setReworkEmailSubject("");
      setReworkEmailBody("");
      setReworkEmailErrors({ subject: "", body: "" });
      setFinalCodeSuffix("");
      setFinalCodeSuffixError("");
      setClientFieldErrors({});
      setHasInteracted(false);
      setValidationSnackbarOpen(false);
      setValidationErrorCount(0);
      setClaimedSteps(null);
      setGrabbing(false);
      setGrabError("");
      // Discards any staged attachment add/remove — an abandoned review must
      // leave no trace, per the same rule that governs every other field here.
      setPendingAttachments(
        (detail.attachments || []).map(attachment => ({ ...attachment, existing: true }))
      );
      setAttachmentError("");
    }
  }, [open, row]);

  useEffect(() => {
    const nextDraft = createApprovalDraft(detail);
    setDraftValues(nextDraft);
    setDescriptionDisplayText(combineMaterialDescription(nextDraft));
    setClientFieldErrors({});
    setHasInteracted(false);
    setClaimedSteps(null);
    setGrabError("");
    setPendingAttachments(
      (detail.attachments || []).map(attachment => ({ ...attachment, existing: true }))
    );
    setAttachmentError("");
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
    // Master Data (MDM) is a claimable queue, not an assignable stage — it is
    // expected to have no assignee until an MDM_MATERIAL user grabs it, so it is
    // not an "unassigned approver" the admin needs to be warned about.
    return stages
      .filter(
        item =>
          item.status !== "SKIPPED" &&
          item.approver === "-" &&
          item.kind !== "MDM"
      )
      .map(item => item.label);
  }, [detail.approvalHistory]);

  // The MDM step as currently known: prefer the steps returned by a fresh grab,
  // otherwise fall back to whatever buildApprovalDetail derived from the row.
  const activeMdmStep = useMemo(() => {
    if (Array.isArray(claimedSteps) && claimedSteps.length > 0) {
      const byLevel =
        detail.currentStageLevel != null
          ? claimedSteps.find(
              step =>
                Number(step.level ?? step.index) === Number(detail.currentStageLevel)
            )
          : null;
      const byKind = claimedSteps.find(
        step =>
          String(step.kind ?? step.stage_kind ?? "").toUpperCase() === "MDM" &&
          String(step.status ?? "").toUpperCase() === "WAITING"
      );
      const fallback =
        claimedSteps.find(
          step => String(step.kind ?? step.stage_kind ?? "").toUpperCase() === "MDM"
        ) || null;
      const source = byLevel || byKind || fallback;
      if (source) {
        return { approverUserId: resolveStepApproverUserId(source) };
      }
    }
    return detail.currentStep || null;
  }, [claimedSteps, detail.currentStep, detail.currentStageLevel]);

  // The active stage is the MDM (Master Data) claimable queue.
  const isMdmStageActive =
    detail.currentStageKind === MDM_STEP_KIND ||
    detail.currentStep?.kind === MDM_STEP_KIND;
  const mdmApproverUserId = resolveStepApproverUserId(activeMdmStep);
  // Whether the MDM queue is open to this MDM_MATERIAL user — including the
  // separation-of-duties rule that bars an earlier approver from grabbing. The
  // rules live in one helper so this dialog and the mass one cannot drift apart;
  // the backend enforces them again.
  const { canGrabMdm, isMdmClaimedByMe, claimNotice } = evaluateMdmClaimGate({
    approvalSteps: detail.approvalSteps,
    isMdmStageActive,
    mdmApproverUserId,
    currentUserId,
    isMdmUser,
    canSubmitApprovalAction,
  });
  // It is this user's turn only when they are the ACTIVE step's assigned
  // approver (manual stage) or its claimer (MDM stage). ADMIN keeps its
  // backend-side override. Everyone else — including approvers who already
  // acted on an earlier stage — gets a view-only dialog.
  const isAdminOverride =
    String(currentUsername || "").trim().toUpperCase() === "ADMIN";
  const isMyManualTurn =
    Boolean(detail.currentStep) &&
    String(detail.currentStep.kind || "").toUpperCase() !== MDM_STEP_KIND &&
    identifiersMatch(detail.currentStep.approverUserId, currentUserId);
  const canActNow =
    canSubmitApprovalAction &&
    (isAdminOverride || isMyManualTurn || (isMdmStageActive && isMdmClaimedByMe));
  const isMassRequest = Boolean(
    detail.rawRow?.massRequestNo ||
      detail.rawRow?.mass_request_no ||
      row?.massRequestNo ||
      row?.mass_request_no
  );

  const handleGrabMdm = async () => {
    const claimPath = buildClaimMdmPath({
      requestId: detail.id,
      isMassRequest,
    });

    if (!claimPath || grabbing) {
      return;
    }

    setGrabbing(true);
    setGrabError("");
    try {
      const response = await axiosPrivate.post(claimPath);
      const nextSteps = extractClaimedApprovalSteps(response.data);
      setClaimedSteps(
        nextSteps ||
          // No steps echoed back: optimistically mark this user as the claimer.
          applyOptimisticMdmClaim({
            approvalSteps: detail.approvalSteps,
            currentStageLevel: detail.currentStageLevel,
            userId: currentUserId,
          })
      );
      // Notify the parent so the main inbox table reflects the claim — the
      // request should no longer show as "unclaimed" to this (or any) MDM user.
      onGrabbed?.();
    } catch (error) {
      setGrabError(resolveMdmClaimErrorMessage(error));
    } finally {
      setGrabbing(false);
    }
  };

  const displayFieldErrors = useMemo(
    () => ({
      ...clientFieldErrors,
      ...(serverValidationErrors || {}),
    }),
    [clientFieldErrors, serverValidationErrors]
  );

  const updateDraftValues = updater => {
    if (!canActNow) {
      return;
    }
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

    const attachmentValidationMessage = getAttachmentValidationError(pendingAttachments);
    if (attachmentValidationMessage) {
      setAttachmentError(attachmentValidationMessage);
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

    // The Final-Code dialog gates the final (Master Data / MDM) stage.
    const isFinalMdmStage =
      detail.isFinalStage || detail.currentStageKind === "MDM";

    if (isFinalMdmStage && !isScopedChangeExtendRequest) {
      setFinalCodeDialogOpen(true);
    } else {
      setRemarkDialogOpen(true);
    }
  };

  const handleReworkClick = () => {
    if (!isScopedChangeExtendRequest) {
      const attachmentValidationMessage = getAttachmentValidationError(pendingAttachments);
      if (attachmentValidationMessage) {
        setAttachmentError(attachmentValidationMessage);
        return;
      }
    }

    setCurrentAction("Rework");
    setRemarkText("");
    // The requester is the destination every time the dialog is opened, so
    // neither a rewind nor a hand-picked approver is ever inherited from a
    // previous rework in this session.
    setReworkTarget(REWORK_TO_REQUESTER);
    setReworkNewApprover(null);
    setReworkNotifyVia(NOTIFY_VIA_APP);
    // Dropping the draft re-arms the template fetch: the field unmounts with the
    // reason dialog, so the next EMAIL choice pulls a fresh mail rather than
    // reusing one composed for an earlier attempt.
    setReworkEmailSubject("");
    setReworkEmailBody("");
    setReworkEmailErrors({ subject: "", body: "" });
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

  const handleFinalCodeDialogClose = (_, reason) => {
    if (submitting && (reason === "backdropClick" || reason === "escapeKeyDown")) {
      return;
    }

    if (submitting) {
      return;
    }

    setFinalCodeDialogOpen(false);
    setFinalCodeSuffixError("");
  };

  const handleFinalCodeNext = () => {
    if (!/^[A-Z0-9]{3}$/.test(String(finalCodeSuffix || "").trim())) {
      setFinalCodeSuffixError("Final code suffix must be 3 letters or digits.");
      return;
    }
    setFinalCodeDialogOpen(false);
    setFinalCodeSuffixError("");
    setRemarkDialogOpen(true);
  };

  // Server-side final-code rejection (e.g. the assembled material code already
  // exists in SAP master data or another request): reopen the running-number
  // dialog with the server message on the input so MDM can pick another suffix.
  useEffect(() => {
    const serverError = serverValidationErrors?.finalCodeSuffix;
    if (serverError?.message) {
      setRemarkDialogOpen(false);
      setFinalCodeSuffixError(serverError.message);
      setFinalCodeDialogOpen(true);
    }
  }, [serverValidationErrors]);

  const isFinalStageActive = detail.isFinalStage || detail.currentStageKind === "MDM";
  const isFinalStageApprove =
    currentAction === "Approve" && isFinalStageActive && !isScopedChangeExtendRequest;
  // Master Data may send a rework back to a MANUAL step that already approved,
  // or — on a request that never had a manual chain — to a hand-picked user,
  // instead of to the requester. The reason dialog is shared by
  // Approve/Rework/Reject, hence the action check; the rest is gated on the
  // active *step* rather than on the user's group, so an ADMIN acting on the
  // Master Data step gets the same choice and an MDM user who happens to be an
  // approver elsewhere does not.
  const canChooseReworkTarget = currentAction === "Rework" && isMdmStageActive;
  const reworkSlots = useMemo(
    () =>
      buildReworkDestinationSlots({
        approvalSteps: detail.approvalSteps,
        requesterLabel: reworkRequester.label,
        newApprover: reworkNewApprover,
        // Mass rework has no reworkToLevel support, so its real steps are shown
        // for context only.
        allowStepRewind: !isMassRequest,
      }),
    [detail.approvalSteps, reworkRequester.label, reworkNewApprover, isMassRequest]
  );
  // Whoever claimed the Master Data step must not end up in the chain they are
  // handing the request to, and neither may the requester.
  const reworkExcludedIdentifiers = useMemo(
    () => [...reworkRequester.identifiers, currentUserId, currentUsername],
    [reworkRequester.identifiers, currentUserId, currentUsername]
  );
  const reworkDestinationError = canChooseReworkTarget
    ? validateReworkDestination({
        selectedValue: reworkTarget,
        newApprover: reworkNewApprover,
        requesterIdentifiers: reworkRequester.identifiers,
        actorIdentifiers: [currentUserId, currentUsername],
      })
    : "";
  // Which request table the mail endpoints are keyed by — the dialog serves
  // both kinds, and the mass batch's thread lives under a different path.
  const reworkEmailKind = resolveReworkEmailKind(isMassRequest);
  // A mail is only in play on the hand-picked-approver row; every other
  // destination notifies in-app, so its draft is neither shown nor validated.
  const reworkEmailChannel =
    canChooseReworkTarget && reworkTarget === REWORK_TO_NEW_APPROVER
      ? reworkNotifyVia
      : NOTIFY_VIA_APP;
  // On the EMAIL channel the mail is the message, so the reason box gives way to
  // the subject the approver reads first — asking for a second wording of the
  // same thing is the one step Master Data would only ever repeat itself in.
  // The reason is still sent: the endpoint requires one and the in-app history
  // shows it. Every other destination keeps typing its own.
  const isReworkEmailReason = reworkEmailChannel === NOTIFY_VIA_EMAIL;
  const reworkEmailReason = isReworkEmailReason
    ? deriveReworkEmailReason(reworkEmailSubject)
    : "";
  // The transcript is for the people who can act on the Master Data step; for
  // everyone else the section never mounts and never fetches.
  const canSeeReworkEmailThread = isMdmUser || isAdminOverride;

  const handleReworkEmailTemplateLoaded = useCallback(template => {
    setReworkEmailSubject(template.subject);
    setReworkEmailBody(template.body);
  }, []);

  const handleReworkEmailSubjectChange = value => {
    setReworkEmailSubject(value);
    setReworkEmailErrors(prev => (prev.subject ? { ...prev, subject: "" } : prev));
  };

  const handleReworkEmailBodyChange = value => {
    setReworkEmailBody(value);
    setReworkEmailErrors(prev => (prev.body ? { ...prev, body: "" } : prev));
  };

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

  const selectedUomOption = uomOptions.find(
    opt => opt.uom_code === draftValues.base_uom
  ) || null;

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
                Approver belum assigned: {unassignedStages.join(", ")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Saat approve, admin akan otomatis ter-assign ke stage yang belum ada assignee.
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
                  <ApprovalHistoryItem key={item.level} item={item} />
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
                  label="Sub Material Group"
                  sections={detail.fieldHistory?.material_sub_group_id || []}
                />
                <Autocomplete
                  fullWidth
                  size="small"
                  disabled={!canActNow}
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
              <Grid item xs={12}>
                <FieldHistoryLabel
                  label="Material Description *"
                  sections={materialDescriptionHistory}
                />
                <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    size="small"
                    disabled={!canActNow}
                    inputProps={{ maxLength: MATERIAL_DESCRIPTION_MAX_LENGTH }}
                    // Shift+Enter is allowed for a visual line break only — the
                    // displayed text (with the newline) is local state; the
                    // newline is collapsed to a space before it ever reaches
                    // draftValues, so it changes nothing about what's saved.
                    value={descriptionDisplayText}
                    onChange={event => {
                      if (!canActNow) {
                        return;
                      }
                      const raw = event.target.value;
                      const boundedRaw = raw.slice(0, MATERIAL_DESCRIPTION_MAX_LENGTH);
                      setDescriptionDisplayText(boundedRaw);
                      updateDraftValues(current => ({
                        ...current,
                        ...splitMaterialDescription(boundedRaw),
                      }));
                    }}
                    error={Boolean(displayFieldErrors.material_description?.error)}
                    helperText={
                      displayFieldErrors.material_description?.message ||
                      `Split across 4 SAP columns of 40 chars (${
                        combineMaterialDescription(draftValues).length
                      }/${MATERIAL_DESCRIPTION_MAX_LENGTH})`
                    }
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
                  <Autocomplete
                    fullWidth
                    size="small"
                    disabled={!canActNow}
                    options={uomOptions}
                    value={selectedUomOption}
                    onChange={(_, val) =>
                      updateDraftValues(current => ({
                        ...current,
                        base_uom: val?.uom_code || "",
                      }))
                    }
                    noOptionsText="No UoM found"
                    isOptionEqualToValue={(opt, val) => opt?.uom_code === val?.uom_code}
                    getOptionLabel={opt => opt?.uom_code ? `${opt.uom_code} - ${opt.description}` : ""}
                    renderInput={params => (
                      <TextField
                        {...params}
                        error={Boolean(displayFieldErrors.base_uom?.error)}
                        helperText={displayFieldErrors.base_uom?.message || ""}
                      />
                    )}
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
                    disabled={!canActNow}
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
                    disabled={!canActNow}
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
                </Grid>
              </Box>

              <Box>
                <SectionLabel>Specification</SectionLabel>
                {/* The schema decides which specification fields exist, what
                    they are called and in what order — so until it lands there
                    is nothing honest to draw here. Rendering the row's raw
                    fields first would relabel and reorder them a beat later,
                    and rendering the "belum tersimpan" line would be a plain
                    lie about a request that does have a specification. */}
                {referenceDataLoading ? (
                  <SectionLoadingSkeleton lines={4} />
                ) : specificationFields.length > 0 ? (
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
                              disabled={!canActNow}
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
                  sx={{ display: "block" }}
                >
                  {ATTACHMENT_SUPPORTED_FORMATS_TEXT}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 2 }}
                >
                  {ATTACHMENT_SIZE_LIMIT_TEXT}
                </Typography>

                {canActNow && (
                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleAttachmentBrowseClick}
                      disabled={submitting || pendingAttachments.length >= MAX_ATTACHMENTS}
                      sx={{ textTransform: "none", px: 3 }}
                    >
                      Browsing File
                    </Button>
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      multiple
                      hidden
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={handleAttachmentFileChange}
                    />
                  </Box>
                )}

                {attachmentError && (
                  <Typography variant="caption" color="error" sx={{ display: "block", mb: 2 }}>
                    {attachmentError}
                  </Typography>
                )}

                {pendingAttachments.length > 0 ? (
                  <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
                    {pendingAttachments.map((attachment, index) => (
                      <AttachmentItem
                        key={attachment.id || `${attachment.name}-${index}`}
                        attachment={attachment}
                        index={index}
                        onView={handleViewAttachment}
                        removable={canActNow && !submitting}
                        onRemove={() => handleRemovePendingAttachment(index)}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Chip icon={<AttachFile />} label="No attachment found" variant="outlined" />
                )}
              </Box>
            </>
          )}

          {/* Renders nothing at all unless this request actually has rework
              mail, so a request that never used the EMAIL channel looks
              exactly as it did before. */}
          <ReworkEmailThreadSection
            enabled={open && canSeeReworkEmailThread}
            requestKind={reworkEmailKind}
            requestId={detail.id}
          />
        </Stack>
      </DialogContent>


      {/* Attachment preview — the shared viewer. */}
      <AttachmentPreviewDialog
        open={previewOpen}
        file={previewFile}
        onClose={() => setPreviewOpen(false)}
      />
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
        <Stack spacing={0.75}>
          <Button
            variant="contained"
            onClick={handleDialogClose}
            disabled={submitting}
            sx={{ bgcolor: "#546e7a", textTransform: "none", alignSelf: "flex-start" }}
          >
            Close
          </Button>
          {claimNotice && (
            <Typography variant="caption" sx={{ color: "#c2410c", fontWeight: 700 }}>
              {claimNotice}
            </Typography>
          )}
          {grabError && (
            <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>
              {grabError}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {canGrabMdm && (
            <Button
              variant="contained"
              startIcon={<CheckCircle />}
              disabled={submitting || grabbing}
              onClick={handleGrabMdm}
              sx={{ bgcolor: "#0f766e", textTransform: "none", fontWeight: 800 }}
            >
              {grabbing ? MDM_GRAB_BUTTON_BUSY_LABEL : MDM_GRAB_BUTTON_LABEL}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            disabled={submitting || !canActNow}
            onClick={handleApproveClick}
            sx={{ bgcolor: "#0b35d9", textTransform: "none", fontWeight: 800 }}
          >
            Approve
          </Button>
          <Button
            variant="contained"
            startIcon={<Replay />}
            disabled={submitting || !canActNow}
            onClick={handleReworkClick}
            sx={{ bgcolor: "#9c27b0", textTransform: "none", fontWeight: 800 }}
          >
            Rework
          </Button>
          <Button
            variant="contained"
            startIcon={<Cancel />}
            disabled={submitting || !canActNow}
            onClick={handleRejectClick}
            sx={{ bgcolor: "#c62828", textTransform: "none", fontWeight: 800 }}
          >
            Reject
          </Button>
        </Stack>
      </DialogActions>

      <Dialog
        open={finalCodeDialogOpen}
        onClose={handleFinalCodeDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmber sx={{ color: "#f59e0b" }} />
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#1e3a5f" }}>
            Final Code Required
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Material code has not been assigned. Please maintain the material code to complete the process.
          </Typography>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            {(() => {
              const rawRow = detail?.rawRow || row || {};
              const materialGroupCode = String(rawRow.materialGroupCode || rawRow.material_group_code || "").trim();
              const materialGroupName = String(rawRow.materialGroupName || rawRow.material_group_name || "").trim();
              // The sub material group is still editable on this stage, so the
              // code that makes up the material code comes from the current
              // selection, not from what the request was submitted with.
              const selectedSubGroup = findSubGroupOptionById(
                subGroupOptions,
                draftValues.material_sub_group_id,
                row
              );
              const subGroupCode = String(
                selectedSubGroup?.code ||
                  selectedSubGroup?.subGroupCode ||
                  rawRow.subMaterialGroupCode ||
                  rawRow.material_sub_group_code ||
                  rawRow.sub_material_group_code ||
                  ""
              ).trim();
              const subGroupName = String(
                selectedSubGroup?.name ||
                  selectedSubGroup?.subGroupName ||
                  rawRow.subMaterialGroupName ||
                  rawRow.material_sub_group_name ||
                  rawRow.sub_material_group_name ||
                  ""
              ).trim();

              return (
                <>
                  <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderColor: "#cfd8dc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 80,
                      }}
                    >
                      <Typography variant="h3" sx={{ fontWeight: 900, color: "#212121" }}>
                        {materialGroupCode || "-"}
                      </Typography>
                    </Paper>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: "text.secondary" }}>
                      {materialGroupName || "Material Group"}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: "center" }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderColor: "#cfd8dc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 80,
                      }}
                    >
                      <Typography variant="h3" sx={{ fontWeight: 900, color: "#212121" }}>
                        {subGroupCode || "-"}
                      </Typography>
                    </Paper>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: "text.secondary" }}>
                      {subGroupName || "Sub Material Group"}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: "center" }}>
                    <TextField
                      fullWidth
                      value={finalCodeSuffix}
                      placeholder="000"
                      inputProps={{
                        maxLength: 3,
                        pattern: "[A-Za-z0-9]*",
                        style: { textAlign: "center" },
                      }}
                      sx={{
                        "& .MuiInputBase-root": {
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: finalCodeSuffixError ? "#ef5350" : "#cfd8dc",
                          height: 80,
                          justifyContent: "center",
                          alignItems: "center",
                          bgcolor: "#fff",
                          px: 1,
                          py: 0,
                        },
                        "& .MuiInputBase-input": {
                          padding: 0,
                          fontSize: "3rem",
                          fontWeight: 900,
                          color: "#212121",
                          lineHeight: 1,
                          textAlign: "center",
                        },
                        "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                      }}
                      onChange={event => {
                        setFinalCodeSuffix(
                          event.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, "")
                            .slice(0, 3)
                        );
                        if (finalCodeSuffixError) {
                          setFinalCodeSuffixError("");
                        }
                      }}
                    />
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: "text.secondary" }}>
                      Running Number
                    </Typography>
                    {finalCodeSuffixError && (
                      <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
                        {finalCodeSuffixError}
                      </Typography>
                    )}
                  </Box>
                </>
              );
            })()}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="contained"
            onClick={handleFinalCodeDialogClose}
            disabled={submitting}
            sx={{ bgcolor: "#757575", textTransform: "none", fontWeight: 800 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleFinalCodeNext}
            disabled={submitting}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            Next
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={remarkDialogOpen}
        onClose={handleRemarkDialogClose}
        // The destination list carries "Approval N - Name - email" rows, which
        // wrap badly in the reason dialog's usual width.
        maxWidth={canChooseReworkTarget ? "sm" : "xs"}
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
            {isReworkEmailReason
              ? "Please review the email below before proceeding with rework."
              : currentAction
                ? `Please enter the reason before proceeding with ${currentAction.toLowerCase()}.`
                : "Please enter the reason before proceeding."}
          </Typography>
          {canChooseReworkTarget && (
            <ReworkDestinationField
              slots={reworkSlots}
              value={reworkTarget}
              onChange={setReworkTarget}
              onNewApproverChange={setReworkNewApprover}
              newApprover={reworkNewApprover}
              notifyVia={reworkNotifyVia}
              onNotifyViaChange={setReworkNotifyVia}
              excludeIdentifiers={reworkExcludedIdentifiers}
              disabled={submitting}
              errorText={reworkDestinationError}
              requestKind={reworkEmailKind}
              requestId={detail.id}
              emailSubject={reworkEmailSubject}
              emailBody={reworkEmailBody}
              onEmailSubjectChange={handleReworkEmailSubjectChange}
              onEmailBodyChange={handleReworkEmailBodyChange}
              onEmailTemplateLoaded={handleReworkEmailTemplateLoaded}
              emailErrors={reworkEmailErrors}
            />
          )}
          {isReworkEmailReason ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: "#f5f5f5",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {REWORK_EMAIL_REASON_NOTICE}
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 0.5, fontWeight: 700, wordBreak: "break-word" }}
              >
                {reworkEmailReason}
              </Typography>
            </Box>
          ) : (
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
              if (
                (currentAction === "Reject" || currentAction === "Rework") &&
                !isReworkEmailReason &&
                !String(remarkText || "").trim()
              ) {
                setRemarkError(
                  currentAction === "Rework"
                    ? "Rework reason is required."
                    : "Reject reason is required."
                );
                return;
              }

              if (reworkDestinationError) {
                return;
              }

              // The endpoint rejects a blank subject or body with
              // <PREFIX>_REWORK_EMAIL_CONTENT_REQUIRED; catching it here keeps
              // the half-written mail on screen instead of losing it to a 400.
              const emailContentErrors = validateReworkEmailContent({
                notifyVia: reworkEmailChannel,
                subject: reworkEmailSubject,
                body: reworkEmailBody,
              });
              setReworkEmailErrors(emailContentErrors);
              if (hasReworkEmailContentError(emailContentErrors)) {
                return;
              }

              // The mail's own subject stands in for the reason nobody was
              // asked to type; the box is what everything else still sends.
              const submittedRemark = isReworkEmailReason
                ? reworkEmailReason
                : remarkText;

              // Absent unless Master Data actually had the choice, so every
              // other rework keeps sending exactly what it sent before.
              const reworkDestination = canChooseReworkTarget
                ? {
                    ...buildReworkDestinationPayload({
                      selectedValue: reworkTarget,
                      newApprover: reworkNewApprover,
                      notifyVia: reworkNotifyVia,
                      emailContent: buildReworkEmailPayload({
                        notifyVia: reworkEmailChannel,
                        subject: reworkEmailSubject,
                        body: reworkEmailBody,
                      }),
                    }),
                    // Confirmation copy only — the page strips it before POSTing.
                    reworkDestinationLabel: describeReworkDestination({
                      slots: reworkSlots,
                      selectedValue: reworkTarget,
                    }),
                    // Likewise copy-only: the "Via email" snackbar names the
                    // address the mail went to, and only the dialog holds it.
                    reworkRecipientEmail: reworkNewApprover?.email ?? "",
                  }
                : {};

              // Reject ends the request, so pending attachment changes are
              // dropped rather than sent: editing a request on its way out
              // leaves an audit line nobody who could still act on it will
              // read. Scoped change/extend requests never show the attachment
              // editor, so their payload stays exactly as it was before this
              // feature.
              const attachmentChanges =
                currentAction !== "Reject" && !isScopedChangeExtendRequest
                  ? {
                      keepAttachmentIds: pendingAttachments
                        .filter(attachment => attachment.existing)
                        .map(attachment => attachment.id)
                        .filter(id => id !== null && id !== undefined),
                      newAttachmentFiles: pendingAttachments.filter(
                        attachment => !attachment.existing
                      ),
                    }
                  : {};

              onAction?.(
                currentAction,
                detail,
                isScopedChangeExtendRequest
                  ? {
                      remark: submittedRemark,
                      ...reworkDestination,
                      ...(isFinalStageApprove ? { finalCodeSuffix } : {}),
                    }
                  : {
                      remark: submittedRemark,
                      ...reworkDestination,
                      ...(isFinalStageApprove ? { finalCodeSuffix } : {}),
                      ...attachmentChanges,
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
            disabled={submitting || Boolean(reworkDestinationError)}
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
