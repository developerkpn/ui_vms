import {
  Cancel,
  CheckCircle,
  Close,
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
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import TableLoadingRows from "src/components/common/TableLoadingRows";
import { buildMassApprovalDetail } from "src/helper/massApprovalDetail.js";
import {
  joinMassItemDescription,
  MASS_FINAL_CODE_SUFFIX_HELPER_TEXT,
  MASS_FINAL_CODE_SUFFIX_LENGTH,
  sanitizeMassFinalCodeSuffix,
  splitMassGroupLabel,
  validateMassFinalCodeSuffixes,
} from "src/helper/massFinalCode.js";
import {
  getSapStatusChip,
  getStagedMaterialCode,
  isSapError,
} from "src/helper/sapStatus.js";
import { isMdmMaterialUser } from "src/helper/adminApprovalView.js";
import { normalizeMassMaterialFieldValue } from "src/components/request-material/massMaterialFormValidation.js";
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
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import useSessionStore from "src/store/useSessionStore";
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
  REWORK_EMAIL_KIND_MASS,
  REWORK_EMAIL_REASON_NOTICE,
  validateReworkEmailContent,
} from "src/helper/reworkEmailThread.js";
import ReworkDestinationField from "./ReworkDestinationField";
import ReworkEmailThreadSection from "./ReworkEmailThreadSection";

const EDITABLE_FIELD_META = [
  { key: "plantCode", label: "Plant", dbKey: "plant_code", required: true },
  { key: "slocCode", label: "Sloc", dbKey: "sloc_code", required: true },
  { key: "materialGroup", label: "Mat Group", dbKey: "material_group", required: true },
  { key: "materialSubGroup", label: "Sub Mat Group", dbKey: "material_sub_group", required: true },
  { key: "materialDescription", label: "Description", dbKey: "material_description", required: true },
  { key: "poText", label: "PO Text", dbKey: "po_text", required: true },
  { key: "uom", label: "UoM", dbKey: "base_uom", required: true },
  { key: "spesifikasiTambahan", label: "Spesifikasi Tambahan", dbKey: "spesifikasi_tambahan", required: true },
];
const REQUIRED_FIELD_KEYS = EDITABLE_FIELD_META.filter(m => m.required).map(m => m.key);

// Per-item SAP staging status, same chips the single request shows in the
// approval list — plus the SAP write-back message on hover when it errored.
function ItemSapStatus({ item }) {
  const sapChip = getSapStatusChip(item?.sapPushStatus);

  if (!sapChip) {
    return (
      <Typography variant="caption" color="text.secondary">
        -
      </Typography>
    );
  }

  const chip = (
    <Chip
      label={sapChip.label}
      size="small"
      sx={{ fontWeight: 800, bgcolor: sapChip.bgcolor, color: sapChip.color }}
    />
  );

  if (isSapError(item?.sapPushStatus) && item?.sapErrorMsg) {
    return (
      <Tooltip title={item.sapErrorMsg} arrow placement="top">
        <Stack spacing={0.5} alignItems="flex-start" sx={{ maxWidth: 200 }}>
          {chip}
          <Typography
            variant="caption"
            sx={{
              color: "#dc2626",
              fontWeight: 600,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.sapErrorMsg}
          </Typography>
        </Stack>
      </Tooltip>
    );
  }

  return chip;
}

export default function MassApprovalFormDialog({
  open,
  row,
  items = [],
  // True while the page is still fetching this batch's items — the dialog is
  // opened first and the items arrive after, so the table needs to say so
  // instead of claiming the batch is empty.
  itemsLoading = false,
  onClose,
  onAction,
  onGrabbed,
  submitting = false,
  serverValidationErrors = {},
}) {
  const detail = useMemo(
    () => buildMassApprovalDetail(row || {}, items),
    [row, items]
  );

  // Per-item draft values – keyed by itemNo, contains only changed fields
  const [itemDrafts, setItemDrafts] = useState({});
  // Remark dialog state
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [remarkError, setRemarkError] = useState("");
  // Rework destination — Master Data only; see the Rework To field below.
  const [reworkTarget, setReworkTarget] = useState(REWORK_TO_REQUESTER);
  const [reworkNewApprover, setReworkNewApprover] = useState(null);
  const [reworkNotifyVia, setReworkNotifyVia] = useState(NOTIFY_VIA_APP);
  // The mail itself, once the EMAIL channel is chosen. Kept here rather than in
  // the field so toggling back to "Via aplikasi" and out again does not discard
  // what Master Data has already typed.
  const [reworkEmailSubject, setReworkEmailSubject] = useState("");
  const [reworkEmailBody, setReworkEmailBody] = useState("");
  const [reworkEmailErrors, setReworkEmailErrors] = useState({ subject: "", body: "" });
  // Running numbers entered at the Master Data stage — one per item, typed in
  // one by one, keyed by item id. See the Final Code dialog below.
  const [finalCodeDialogOpen, setFinalCodeDialogOpen] = useState(false);
  const [finalCodeSuffixes, setFinalCodeSuffixes] = useState({});
  const [finalCodeSuffixErrors, setFinalCodeSuffixErrors] = useState({});
  // Server-side rejection of the composed plan (duplicate code, unresolved
  // group, …) — not tied to one item's box, shown as a banner instead.
  const [finalCodeGeneralError, setFinalCodeGeneralError] = useState("");
  // Holds the freshly-claimed approval steps returned by the claim-mdm endpoint
  // so the dialog reflects the grab without waiting for a parent refresh.
  const [claimedSteps, setClaimedSteps] = useState(null);
  const [grabbing, setGrabbing] = useState(false);
  const [grabError, setGrabError] = useState("");
  const axiosPrivate = useAxiosPrivate();

  // Reset state when dialog opens/closes
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) {
      setItemDrafts({});
      setFieldErrors({});
      setRemarkDialogOpen(false);
      setCurrentAction("");
      setRemarkText("");
      setRemarkError("");
      setReworkTarget(REWORK_TO_REQUESTER);
      setReworkNewApprover(null);
      setReworkNotifyVia(NOTIFY_VIA_APP);
      setReworkEmailSubject("");
      setReworkEmailBody("");
      setReworkEmailErrors({ subject: "", body: "" });
      setFinalCodeDialogOpen(false);
      setFinalCodeSuffixes({});
      setFinalCodeSuffixErrors({});
      setFinalCodeGeneralError("");
      setClaimedSteps(null);
      setGrabbing(false);
      setGrabError("");
    }
  }, [open]);

  // A different batch is a different claim: whatever the last grab returned says
  // nothing about this one.
  useEffect(() => {
    setClaimedSteps(null);
    setGrabError("");
  }, [row]);

  const normalizedStatus = String(detail.status || "").trim().toUpperCase();
  const currentUserId = useSessionStore(state => state.user_id);
  const currentUsername = useSessionStore(state => state.username);
  const isMdmUser = useSessionStore(isMdmMaterialUser);
  const canSubmitApprovalAction = normalizedStatus === "SUBMIT";
  // The batch's steps as currently known: prefer the ones a fresh grab returned,
  // otherwise whatever the row was opened with. This is what lets the dialog go
  // from claimable to claimed without being reopened.
  const approvalSteps = useMemo(() => {
    if (Array.isArray(claimedSteps) && claimedSteps.length > 0) {
      return claimedSteps;
    }
    return Array.isArray(row?.approvalSteps) ? row.approvalSteps : [];
  }, [claimedSteps, row]);
  // It is this user's turn only when they are the ACTIVE step's assigned
  // approver (or MDM claimer). ADMIN keeps its backend-side override. Everyone
  // else — including approvers who already acted — gets a view-only dialog.
  const activeStep = useMemo(
    () =>
      approvalSteps.find(
        step => step.status !== "APPROVED" && step.status !== "REJECTED"
      ) || null,
    [approvalSteps]
  );
  const isAdminOverride =
    String(currentUsername || "").trim().toUpperCase() === "ADMIN";
  const activeApproverUserId = resolveStepApproverUserId(activeStep);

  // Master Data is the only stage that gets to choose where a rework lands, and
  // the only one that is claimed rather than assigned. Mass requests have no
  // rewind support, so the real steps below render for context only — the
  // requester and the one fillable slot are the destinations.
  const isMdmStageActive =
    String(activeStep?.kind ?? row?.currentStageKind ?? "")
      .trim()
      .toUpperCase() === MDM_STEP_KIND;
  // Same rules the single-request dialog grabs by — they live in one helper so
  // the two dialogs cannot drift apart. The backend enforces them again.
  const { canGrabMdm, isMdmClaimedByMe, claimNotice } = evaluateMdmClaimGate({
    approvalSteps,
    isMdmStageActive,
    mdmApproverUserId: activeApproverUserId,
    currentUserId,
    isMdmUser,
    canSubmitApprovalAction,
  });
  const isMyManualTurn =
    activeStep != null &&
    String(activeStep.kind || "").trim().toUpperCase() !== MDM_STEP_KIND &&
    identifiersMatch(activeApproverUserId, currentUserId);
  // Before the Master Data step is grabbed nobody may act on it — not even the
  // MDM user about to grab it — so Approve/Rework/Reject stay disabled until the
  // claim lands, exactly as they do on a single request.
  const canAct =
    canSubmitApprovalAction &&
    (isAdminOverride || isMyManualTurn || (isMdmStageActive && isMdmClaimedByMe));

  const handleGrabMdm = async () => {
    const claimPath = buildClaimMdmPath({
      requestId: row?.id,
      isMassRequest: true,
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
            approvalSteps,
            currentStageLevel: activeStep?.level ?? row?.currentStageLevel ?? null,
            userId: currentUserId,
          })
      );
      // Notify the parent so the main inbox table reflects the claim — the batch
      // should no longer show as "unclaimed" to this (or any) MDM user.
      onGrabbed?.();
    } catch (error) {
      setGrabError(resolveMdmClaimErrorMessage(error));
    } finally {
      setGrabbing(false);
    }
  };

  const canChooseReworkTarget = currentAction === "Rework" && isMdmStageActive;
  const reworkRequester = useMemo(() => resolveReworkRequester(row || {}), [row]);
  const reworkSlots = useMemo(
    () =>
      buildReworkDestinationSlots({
        approvalSteps: row?.approvalSteps,
        requesterLabel: reworkRequester.label,
        newApprover: reworkNewApprover,
        allowStepRewind: false,
      }),
    [row?.approvalSteps, reworkRequester.label, reworkNewApprover]
  );
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
  // A mail is only in play on the hand-picked-approver row; every other
  // destination notifies in-app, so its draft is neither shown nor validated.
  const reworkEmailChannel =
    canChooseReworkTarget && reworkTarget === REWORK_TO_NEW_APPROVER
      ? reworkNotifyVia
      : NOTIFY_VIA_APP;
  // On the EMAIL channel the mail is the message, so the reason box gives way to
  // the subject the approver reads first rather than asking Master Data to word
  // the same thing twice. A reason still travels — the endpoint requires one and
  // the in-app history shows it — it is just derived from the subject.
  const isReworkEmailReason = reworkEmailChannel === NOTIFY_VIA_EMAIL;
  const reworkEmailReason = isReworkEmailReason
    ? deriveReworkEmailReason(reworkEmailSubject)
    : "";

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

  // The SAP columns only mean something once the batch has been staged, so they
  // stay out of the (already wide) item table while it is still in approval.
  const hasSapColumns = useMemo(
    () => detail.items.some(item => item.finalCode || item.sapPushStatus),
    [detail.items]
  );
  // Item no + request no, one column per editable field, and the two SAP
  // columns when they are showing. Shared by the loading and empty rows so
  // neither can drift out of step with the header.
  const itemColumnCount = 2 + EDITABLE_FIELD_META.length + (hasSapColumns ? 2 : 0);

  // Server-side rejection of the composed plan (invalid entry, duplicate code,
  // or one already taken): reopen the Final Code dialog with the server
  // message shown as a banner so Master Data can fix the offending item.
  useEffect(() => {
    const serverError = serverValidationErrors?.finalCodeSuffix;
    if (serverError?.message) {
      setRemarkDialogOpen(false);
      setFinalCodeGeneralError(serverError.message);
      setFinalCodeDialogOpen(true);
    }
  }, [serverValidationErrors]);

  // Resolve a field's display value: draft overrides original item value
  const resolveField = useCallback(
    (item, fieldKey) => {
      const draft = itemDrafts[item.itemNo];
      if (draft && draft[fieldKey] !== undefined) {
        return draft[fieldKey];
      }
      return item[fieldKey] ?? "";
    },
    [itemDrafts]
  );

  const updateDraft = (itemNo, fieldKey, value) => {
    if (!canAct) {
      return;
    }
    // Clear error for this field
    setFieldErrors(prev => {
      const errKey = `${itemNo}::${fieldKey}`;
      if (!prev[errKey]) return prev;
      const next = { ...prev };
      delete next[errKey];
      return next;
    });

    setItemDrafts(prev => {
      const current = prev[itemNo];
      const originalItem = detail.items.find(i => i.itemNo === itemNo);
      const originalValue = originalItem ? originalItem[fieldKey] ?? "" : "";

      if (value === originalValue) {
        if (!current) return prev;
        const next = { ...current };
        delete next[fieldKey];
        if (Object.keys(next).length === 0) {
          const rest = { ...prev };
          delete rest[itemNo];
          return rest;
        }
        return { ...prev, [itemNo]: next };
      }

      return {
        ...prev,
        [itemNo]: {
          ...current,
          [fieldKey]: normalizeMassMaterialFieldValue(value),
        },
      };
    });
  };

  // Check if any items have been edited
  const hasEdits = Object.keys(itemDrafts).length > 0;

  // Collect edited items in snake_case for the API payload
  const buildEditedItemsPayload = () => {
    const edited = [];
    for (const itemNoStr of Object.keys(itemDrafts)) {
      const itemNo = Number(itemNoStr);
      const originalItem = detail.items.find(i => i.itemNo === itemNo);
      if (!originalItem) continue;

      const changes = itemDrafts[itemNoStr];
      const payload = { id: originalItem.id };

      for (const meta of EDITABLE_FIELD_META) {
        if (changes[meta.key] !== undefined) {
          payload[meta.dbKey] = changes[meta.key];
        }
      }

      edited.push(payload);
    }
    return edited;
  };

  // Action button handlers — open the remark dialog
  // Action button handlers — open the remark dialog
  const handleApproveClick = () => {
    // Validate: required fields that have been edited cannot be empty
    if (hasEdits) {
      const errors = {};
      for (const itemNoStr of Object.keys(itemDrafts)) {
        const itemNo = Number(itemNoStr);
        const changes = itemDrafts[itemNoStr];
        for (const fieldKey of REQUIRED_FIELD_KEYS) {
          if (
            changes[fieldKey] !== undefined &&
            String(changes[fieldKey] ?? "").trim() === ""
          ) {
            errors[`${itemNo}::${fieldKey}`] = true;
          }
        }
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }

    setCurrentAction("Approve");
    setRemarkText("");
    setRemarkError("");
    setFinalCodeSuffixes({});
    setFinalCodeSuffixErrors({});
    setFinalCodeGeneralError("");

    // The Final Code dialog gates the Master Data (MDM) stage — that approval
    // is the one that composes every item's material code and stages the batch.
    if (isMdmStageActive) {
      setFinalCodeDialogOpen(true);
      return;
    }

    setRemarkDialogOpen(true);
  };

  const handleFinalCodeDialogClose = (_, reason) => {
    if (
      submitting &&
      (reason === "backdropClick" || reason === "escapeKeyDown")
    ) {
      return;
    }
    if (submitting) return;
    setFinalCodeDialogOpen(false);
    setFinalCodeGeneralError("");
  };

  const handleFinalCodeSuffixChange = (itemId, value) => {
    setFinalCodeSuffixes(prev => ({
      ...prev,
      [itemId]: sanitizeMassFinalCodeSuffix(value),
    }));
    setFinalCodeSuffixErrors(prev => {
      if (!prev[itemId]) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    if (finalCodeGeneralError) {
      setFinalCodeGeneralError("");
    }
  };

  const handleFinalCodeNext = () => {
    // Group/sub group are read through resolveField (not the raw item) so a
    // group edited elsewhere in the dialog is what gets validated here — the
    // group is two thirds of the material code being assembled.
    const errors = validateMassFinalCodeSuffixes({
      finalCodeSuffixes,
      items: detail.items.map(item => ({
        id: item.id,
        itemNo: item.itemNo,
        materialGroup: resolveField(item, "materialGroup"),
        materialSubGroup: resolveField(item, "materialSubGroup"),
      })),
    });

    if (Object.keys(errors).length > 0) {
      setFinalCodeSuffixErrors(errors);
      return;
    }

    setFinalCodeDialogOpen(false);
    setFinalCodeSuffixErrors({});
    setFinalCodeGeneralError("");
    setRemarkDialogOpen(true);
  };

  const handleReworkClick = () => {
    setCurrentAction("Rework");
    setRemarkText("");
    setRemarkError("");
    // The requester is the destination every time the dialog is opened, so a
    // hand-picked approver is never inherited from a previous rework.
    setReworkTarget(REWORK_TO_REQUESTER);
    setReworkNotifyVia(NOTIFY_VIA_APP);
    setReworkNewApprover(null);
    // Dropping the draft re-arms the template fetch: the field unmounts with the
    // reason dialog, so the next EMAIL choice pulls a fresh mail rather than
    // reusing one composed for an earlier attempt.
    setReworkEmailSubject("");
    setReworkEmailBody("");
    setReworkEmailErrors({ subject: "", body: "" });
    setRemarkDialogOpen(true);
  };

  const handleRejectClick = () => {
    setCurrentAction("Reject");
    setRemarkText("");
    setRemarkError("");
    setRemarkDialogOpen(true);
  };

  // Remark dialog confirm — fire the action.
  // Approval, Rework, and Reject all require a non-empty remark/reason.
  const handleRemarkConfirm = () => {
    const trimmed = remarkText.trim();

    // An EMAIL rework has no box to leave empty: its reason comes from the
    // subject, which the blank-draft check below is what guards.
    if (!trimmed && !isReworkEmailReason) {
      const message =
        currentAction === "Rework"
          ? "Rework reason is required."
          : currentAction === "Reject"
            ? "Reject reason is required."
            : "Approve remark is required.";
      setRemarkError(message);
      return;
    }

    if (currentAction === "Rework") {
      if (reworkDestinationError) {
        return;
      }

      // The endpoint rejects a blank subject or body with
      // MASS_REWORK_EMAIL_CONTENT_REQUIRED; catching it here keeps the
      // half-written mail on screen instead of losing it to a 400.
      const emailContentErrors = validateReworkEmailContent({
        notifyVia: reworkEmailChannel,
        subject: reworkEmailSubject,
        body: reworkEmailBody,
      });
      setReworkEmailErrors(emailContentErrors);
      if (hasReworkEmailContentError(emailContentErrors)) {
        return;
      }

      // Absent unless Master Data actually had the choice, so every other
      // rework keeps sending exactly what it sent before.
      onAction?.(
        "rework",
        // The mail's own subject stands in for the reason nobody was asked to
        // type; the box is what every other destination still sends.
        isReworkEmailReason ? reworkEmailReason : trimmed,
        null,
        canChooseReworkTarget
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
              // Likewise copy-only: the "Via email" snackbar names the address
              // the mail went to, and only the dialog holds it.
              reworkRecipientEmail: reworkNewApprover?.email ?? "",
            }
          : {}
      );
      return;
    }

    if (currentAction === "Reject") {
      onAction?.("reject", trimmed, null);
      return;
    }

    // Approve — include edited items if any, plus the per-item running numbers
    // when this is the Master Data stage (the only stage the backend expects
    // them on).
    onAction?.(
      "approve",
      trimmed,
      hasEdits ? buildEditedItemsPayload() : null,
      isMdmStageActive ? { finalCodeSuffixes } : {}
    );
  };

  const handleClose = () => {
    setItemDrafts({});
    setRemarkDialogOpen(false);
    setCurrentAction("");
    setRemarkText("");
    setRemarkError("");
    setFinalCodeDialogOpen(false);
    setFinalCodeSuffixes({});
    setFinalCodeSuffixErrors({});
    setFinalCodeGeneralError("");
    onClose?.();
  };

  const handleRemarkDialogClose = (_, reason) => {
    if (
      submitting &&
      (reason === "backdropClick" || reason === "escapeKeyDown")
    ) {
      return;
    }
    if (submitting) return;
    setRemarkDialogOpen(false);
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        {/* Header */}
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
              Mass Request Approval
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 900, color: "#455a64", lineHeight: 1.1 }}
            >
              {detail.massRequestNo}
            </Typography>
            <Typography
              variant="body2"
              sx={{ mt: 0.75, fontWeight: 600, color: "text.secondary" }}
            >
              {detail.massRequestReason}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} aria-label="Close">
            <Close />
          </IconButton>
        </Box>

        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
          <Stack spacing={2.5}>
            {/* Summary card */}
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
                      Status
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "text.secondary" }}
                    >
                      {detail.status || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ display: "block", fontWeight: 800, mb: 0.5 }}
                    >
                      Assigned To
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "text.secondary" }}
                    >
                      {detail.assignedTo || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ display: "block", fontWeight: 800, mb: 0.5 }}
                    >
                      Item Count
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "text.secondary" }}
                    >
                      {detail.itemCount}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ display: "block", fontWeight: 800, mb: 0.5 }}
                    >
                      Created By
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "text.secondary" }}
                    >
                      {detail.createdBy || "-"}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>

            {/* Editable items table */}
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {/* No count while the items are still coming — "Items (0)"
                  flipping to "Items (24)" is the same pop the table below
                  used to have. */}
              {itemsLoading ? "Items" : `Items (${detail.items.length})`}
            </Typography>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: 2, maxHeight: 480 }}
            >
              <Table size="small" sx={{ borderCollapse: "collapse" }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f5f7f9" }}>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 700,
                        border: "1px solid #e0e0e0",
                        py: 1.5,
                        width: 40,
                      }}
                    >
                      #
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        border: "1px solid #e0e0e0",
                        py: 1.5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Request No
                    </TableCell>
                    {EDITABLE_FIELD_META.map(meta => (
                      <TableCell
                        key={meta.key}
                        sx={{
                          fontWeight: 700,
                          border: "1px solid #e0e0e0",
                          py: 1.5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {meta.label}
                      </TableCell>
                    ))}
                    {hasSapColumns && (
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          border: "1px solid #e0e0e0",
                          py: 1.5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Material Code
                      </TableCell>
                    )}
                    {hasSapColumns && (
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          border: "1px solid #e0e0e0",
                          py: 1.5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        SAP Status
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemsLoading ? (
                    <TableLoadingRows columns={itemColumnCount} />
                  ) : detail.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={itemColumnCount}
                        align="center"
                        sx={{ py: 3 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          No items available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    detail.items.map(item => (
                      <TableRow key={item.itemNo}>
                        <TableCell
                          align="center"
                          sx={{
                            border: "1px solid #e0e0e0",
                            fontWeight: 600,
                          }}
                        >
                          {item.itemNo}
                        </TableCell>
                        <TableCell
                          sx={{
                            border: "1px solid #e0e0e0",
                            fontWeight: 600,
                            color: "text.secondary",
                          }}
                        >
                          {item.requestNo}
                        </TableCell>
                        {EDITABLE_FIELD_META.map(meta => {
                          const isMultiline =
                            meta.key === "poText" ||
                            meta.key === "spesifikasiTambahan";
                          return (
                            <TableCell
                              key={meta.key}
                              sx={{
                                border: "1px solid #e0e0e0",
                                verticalAlign: "top",
                                p: 0.5,
                                minWidth: 120,
                              }}
                            >
                              <TextField
                                size="small"
                                variant="standard"
                                fullWidth
                                multiline={isMultiline}
                                minRows={isMultiline ? 1 : undefined}
                                maxRows={4}
                                value={resolveField(item, meta.key)}
                                error={Boolean(fieldErrors[`${item.itemNo}::${meta.key}`])}
                                helperText={
                                  fieldErrors[`${item.itemNo}::${meta.key}`]
                                    ? `${meta.label} cannot be empty`
                                    : undefined
                                }
                                onChange={e =>
                                  updateDraft(
                                    item.itemNo,
                                    meta.key,
                                    e.target.value
                                  )
                                }
                                disabled={!canAct || submitting}
                                inputProps={{
                                  style: { fontSize: "0.8125rem" },
                                }}
                              />
                            </TableCell>
                          );
                        })}
                        {hasSapColumns && (
                          <TableCell
                            sx={{
                              border: "1px solid #e0e0e0",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              color: "text.secondary",
                            }}
                          >
                            {getStagedMaterialCode(item) || "-"}
                          </TableCell>
                        )}
                        {hasSapColumns && (
                          <TableCell sx={{ border: "1px solid #e0e0e0" }}>
                            <ItemSapStatus item={item} />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Renders nothing at all unless this batch actually has rework
                mail, so a request that never used the EMAIL channel looks
                exactly as it did before. */}
            <ReworkEmailThreadSection
              enabled={open && (isMdmUser || isAdminOverride)}
              requestKind={REWORK_EMAIL_KIND_MASS}
              requestId={row?.id}
            />
          </Stack>
        </DialogContent>

        {/* Action buttons */}
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Stack spacing={0.75}>
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
          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
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
              startIcon={<Cancel />}
              onClick={handleRejectClick}
              disabled={!canAct || submitting}
              sx={{ bgcolor: "#c62828", textTransform: "none", fontWeight: 800 }}
            >
              Reject All
            </Button>
            <Button
              variant="contained"
              startIcon={<Replay />}
              onClick={handleReworkClick}
              disabled={!canAct || submitting}
              sx={{ bgcolor: "#fb8c00", textTransform: "none", fontWeight: 800 }}
            >
              Rework All
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircle />}
              onClick={handleApproveClick}
              disabled={!canAct || submitting}
              sx={{ bgcolor: "#0b35d9", textTransform: "none", fontWeight: 800 }}
            >
              Approve All
            </Button>
          </Stack>
        </Box>
      </Dialog>

      {/* Final Code dialog — Master Data stage only, ahead of the remark step */}
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {MASS_FINAL_CODE_SUFFIX_HELPER_TEXT}
          </Typography>
          {finalCodeGeneralError && (
            <Typography
              variant="body2"
              color="error"
              sx={{ mb: 2, fontWeight: 700 }}
            >
              {finalCodeGeneralError}
            </Typography>
          )}
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ borderRadius: 2, maxHeight: 360 }}
          >
            <Table size="small" sx={{ borderCollapse: "collapse" }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f7f9" }}>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: 700, border: "1px solid #e0e0e0", width: 40 }}
                  >
                    #
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, border: "1px solid #e0e0e0" }}>
                    Description
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, border: "1px solid #e0e0e0" }}>
                    Material Group
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, border: "1px solid #e0e0e0" }}>
                    Sub Material Group
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: 700, border: "1px solid #e0e0e0", width: 160 }}
                  >
                    Running Number
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.items.map(item => {
                  // Read through the same draft resolver the editable items
                  // table uses, so a group/description edited elsewhere in
                  // this dialog shows up here immediately rather than the
                  // stale original value.
                  const materialGroup = splitMassGroupLabel(
                    resolveField(item, "materialGroup")
                  );
                  const materialSubGroup = splitMassGroupLabel(
                    resolveField(item, "materialSubGroup")
                  );
                  const description = joinMassItemDescription(
                    resolveField(item, "materialDescription"),
                    resolveField(item, "poText")
                  );

                  return (
                    <TableRow key={item.itemNo}>
                      <TableCell
                        align="center"
                        sx={{ border: "1px solid #e0e0e0", fontWeight: 600 }}
                      >
                        {item.itemNo}
                      </TableCell>
                      <TableCell
                        sx={{ border: "1px solid #e0e0e0", color: "text.secondary" }}
                      >
                        {description}
                      </TableCell>
                      <TableCell sx={{ border: "1px solid #e0e0e0" }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {materialGroup.code || "-"}
                        </Typography>
                        {materialGroup.name && (
                          <Typography variant="caption" color="text.secondary">
                            {materialGroup.name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ border: "1px solid #e0e0e0" }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {materialSubGroup.code || "-"}
                        </Typography>
                        {materialSubGroup.name && (
                          <Typography variant="caption" color="text.secondary">
                            {materialSubGroup.name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ border: "1px solid #e0e0e0", p: 0.5 }}>
                        <TextField
                          size="small"
                          fullWidth
                          value={finalCodeSuffixes[String(item.id)] || ""}
                          placeholder="A01"
                          disabled={submitting}
                          error={Boolean(finalCodeSuffixErrors[String(item.id)])}
                          helperText={finalCodeSuffixErrors[String(item.id)] || ""}
                          inputProps={{
                            maxLength: MASS_FINAL_CODE_SUFFIX_LENGTH,
                            "aria-label": `Running Number item ${item.itemNo}`,
                            style: { textAlign: "center", fontWeight: 700 },
                          }}
                          onChange={event =>
                            handleFinalCodeSuffixChange(
                              String(item.id),
                              event.target.value
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
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

      {/* Remark dialog — shown after clicking any action button */}
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
              requestKind={REWORK_EMAIL_KIND_MASS}
              requestId={row?.id}
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
                if (remarkError) setRemarkError("");
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
            onClick={() => setRemarkDialogOpen(false)}
            disabled={submitting}
            sx={{ color: "text.secondary", textTransform: "none" }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleRemarkConfirm}
            disabled={submitting || Boolean(reworkDestinationError)}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            {submitting ? "Saving..." : currentAction || "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
