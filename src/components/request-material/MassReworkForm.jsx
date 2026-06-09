import { Close } from "@mui/icons-material";
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
import { useEffect, useMemo, useState } from "react";

const FIELD_META = [
  { key: "plantCode", dbKey: "plant_code", label: "Plant", required: true },
  { key: "slocCode", dbKey: "sloc_code", label: "Sloc", required: true },
  { key: "materialGroup", dbKey: "material_group", label: "Mat Group", required: true },
  {
    key: "materialSubGroup",
    dbKey: "material_sub_group",
    label: "Sub Mat Group",
    required: true,
  },
  {
    key: "materialDescription",
    dbKey: "material_description",
    label: "Description",
    required: true,
  },
  { key: "poText", dbKey: "po_text", label: "PO Text", required: false },
  { key: "uom", dbKey: "base_uom", label: "UoM", required: true },
  {
    key: "spesifikasiTambahan",
    dbKey: "spesifikasi_tambahan",
    label: "Spesifikasi Tambahan",
    required: false,
  },
];

/**
 * Editable form for revising a mass request that has been reworked.
 * Shows all items with pre-filled, editable fields — similar to the mass
 * request creation form. No reason field or attachments.
 *
 * All required fields must be non-empty before submission.
 */
export default function MassReworkForm({
  open,
  ticketNumber,
  massRequestReason,
  items = [],
  onClose,
  onSubmit,
  submitting = false,
}) {
  const [drafts, setDrafts] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  const requiredFields = useMemo(
    () => FIELD_META.filter(m => m.required).map(m => m.key),
    []
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setDrafts({});
      setFieldErrors({});
      return;
    }
    const initial = {};
    for (const item of items) {
      const row = {};
      for (const meta of FIELD_META) {
        row[meta.key] = item[meta.dbKey] ?? item[meta.key] ?? "";
      }
      initial[item.item_no] = row;
    }
    setDrafts(initial);
    setFieldErrors({});
  }, [open, items]);

  const updateDraft = (itemNo, fieldKey, value) => {
    setDrafts(prev => ({
      ...prev,
      [itemNo]: { ...(prev[itemNo] ?? {}), [fieldKey]: value },
    }));
    // Clear error for this field on change
    setFieldErrors(prev => {
      const key = `${itemNo}::${fieldKey}`;
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const errors = {};
    let hasError = false;

    for (const item of items) {
      const draft = drafts[item.item_no];
      if (!draft) continue;

      for (const fieldKey of requiredFields) {
        const val = (draft[fieldKey] ?? "").trim();
        if (val === "") {
          errors[`${item.item_no}::${fieldKey}`] = true;
          hasError = true;
        }
      }
    }

    setFieldErrors(errors);
    return !hasError;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload = items.map(item => {
      const draft = drafts[item.item_no];
      if (!draft) return { id: item.id };

      const edits = {};
      for (const meta of FIELD_META) {
        if (draft[meta.key] !== undefined) {
          edits[meta.dbKey] = draft[meta.key];
        }
      }
      return { id: item.id, ...edits };
    });

    onSubmit?.(payload);
  };

  const resolveValue = (item, fieldKey) => {
    const draft = drafts[item.item_no];
    return draft?.[fieldKey] ?? item[fieldKey] ?? "";
  };

  const hasError = (itemNo, fieldKey) =>
    Boolean(fieldErrors[`${itemNo}::${fieldKey}`]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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
            Revise Mass Request
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, color: "#455a64", lineHeight: 1.1 }}
          >
            {ticketNumber ?? "-"}
          </Typography>
          {massRequestReason && (
            <Typography
              variant="body2"
              sx={{ mt: 0.75, fontWeight: 600, color: "text.secondary" }}
            >
              {massRequestReason}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} aria-label="Close">
          <Close />
        </IconButton>
      </Box>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack spacing={2.5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Items ({items.length})
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
                  {FIELD_META.map(meta => (
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
                      {meta.required && (
                        <Typography
                          component="span"
                          sx={{ color: "error.main", ml: 0.25 }}
                        >
                          *
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2 + FIELD_META.length}
                      align="center"
                      sx={{ py: 3 }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        No items to revise
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, idx) => (
                    <TableRow key={item.item_no ?? idx}>
                      <TableCell
                        align="center"
                        sx={{
                          border: "1px solid #e0e0e0",
                          fontWeight: 600,
                        }}
                      >
                        {item.item_no ?? idx + 1}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid #e0e0e0",
                          fontWeight: 600,
                          color: "text.secondary",
                        }}
                      >
                        {item.request_no ?? "-"}
                      </TableCell>
                      {FIELD_META.map(meta => {
                        const isMultiline =
                          meta.key === "description" ||
                          meta.key === "poText" ||
                          meta.key === "spesifikasiTambahan";
                        const value = resolveValue(item, meta.key);
                        const error = hasError(item.item_no, meta.key);

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
                              value={value}
                              error={error}
                              helperText={
                                error
                                  ? `${meta.label} cannot be empty`
                                  : undefined
                              }
                              onChange={e =>
                                updateDraft(
                                  item.item_no,
                                  meta.key,
                                  e.target.value
                                )
                              }
                              disabled={submitting}
                              inputProps={{
                                style: { fontSize: "0.8125rem" },
                                ...(meta.key === "description"
                                  ? { maxLength: 40 }
                                  : {}),
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

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || items.length === 0}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
