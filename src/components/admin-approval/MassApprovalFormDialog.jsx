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
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildMassApprovalDetail } from "src/helper/massApprovalDetail.js";
import useSessionStore from "src/store/useSessionStore";

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

export default function MassApprovalFormDialog({
  open,
  row,
  items = [],
  onClose,
  onAction,
  submitting = false,
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
    }
  }, [open]);

  const normalizedStatus = String(detail.status || "").trim().toUpperCase();
  const currentUserId = useSessionStore(state => state.user_id);
  const currentUsername = useSessionStore(state => state.username);
  // It is this user's turn only when they are the ACTIVE step's assigned
  // approver (or MDM claimer). ADMIN keeps its backend-side override. Everyone
  // else — including approvers who already acted — gets a view-only dialog.
  const activeStep = useMemo(() => {
    const steps = Array.isArray(row?.approvalSteps) ? row.approvalSteps : [];
    return (
      steps.find(
        step => step.status !== "APPROVED" && step.status !== "REJECTED"
      ) || null
    );
  }, [row]);
  const isAdminOverride =
    String(currentUsername || "").trim().toUpperCase() === "ADMIN";
  const isMyTurn =
    activeStep != null &&
    activeStep.approverUserId != null &&
    String(activeStep.approverUserId).trim() !== "" &&
    String(activeStep.approverUserId).trim() ===
      String(currentUserId ?? "").trim();
  const canAct =
    normalizedStatus === "SUBMIT" && (isAdminOverride || isMyTurn);

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

      return { ...prev, [itemNo]: { ...current, [fieldKey]: value } };
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
    setRemarkDialogOpen(true);
  };

  const handleReworkClick = () => {
    setCurrentAction("Rework");
    setRemarkText("");
    setRemarkError("");
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

    if (!trimmed) {
      const message =
        currentAction === "Rework"
          ? "Rework reason is required."
          : currentAction === "Reject"
            ? "Reject reason is required."
            : "Approve remark is required.";
      setRemarkError(message);
      return;
    }

    if (currentAction === "Rework" || currentAction === "Reject") {
      onAction?.(currentAction.toLowerCase(), trimmed, null);
      return;
    }

    // Approve — include edited items if any
    onAction?.(
      "approve",
      trimmed,
      hasEdits ? buildEditedItemsPayload() : null
    );
  };

  const handleClose = () => {
    setItemDrafts({});
    setRemarkDialogOpen(false);
    setCurrentAction("");
    setRemarkText("");
    setRemarkError("");
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
              Items ({detail.items.length})
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={2 + EDITABLE_FIELD_META.length}
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
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
            justifyContent: "flex-end",
            gap: 1.5,
          }}
        >
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
        </Box>
      </Dialog>

      {/* Remark dialog — shown after clicking any action button */}
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
              if (remarkError) setRemarkError("");
            }}
            sx={{
              "& .MuiInputBase-root": {
                bgcolor: "#f5f5f5",
              },
            }}
          />
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
            disabled={submitting}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            {submitting ? "Saving..." : currentAction || "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
