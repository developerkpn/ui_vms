import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { AttachFile, Delete } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  MASS_MAX_ROWS,
  MASS_TEXT_FIELDS,
  isMassRowFilled,
  mapMassRequestServerErrors,
  validateMassRequestBatch,
} from "./massMaterialFormValidation.mjs";
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  normalizeAttachmentSelection,
} from "./attachmentValidation.mjs";

const MASS_ROW_FIELD_LABELS = {
  plant: "Plant",
  sloc: "Sloc",
  materialGroup: "Material Group",
  materialSubGroup: "Sub Mat Group",
  description: "Description",
  poText: "PO Text",
  uom: "UoM",
  spesifikasiTambahan: "Spesifikasi Tambahan",
};

const createEmptyRow = () => ({
  plant: "",
  sloc: "",
  materialGroup: "",
  materialSubGroup: "",
  description: "",
  poText: "",
  uom: "",
  spesifikasiTambahan: "",
  attachments: [],
  rowErrors: {},
  attachmentError: "",
});

const createInitialRows = () =>
  Array.from({ length: MASS_MAX_ROWS }, () => createEmptyRow());

const MassMaterialForm = ({ onBack }) => {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const [rows, setRows] = useState(createInitialRows);
  const [selectedFilesByRow, setSelectedFilesByRow] = useState(() =>
    Array.from({ length: MASS_MAX_ROWS }, () => [])
  );
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonDraft, setReasonDraft] = useState("");
  const [reasonError, setReasonError] = useState("");
  const pendingSubmitRef = useRef(null);

  const updateRow = (rowIndex, updater) => {
    setRows(prev =>
      prev.map((row, idx) => (idx === rowIndex ? updater(row) : row))
    );
  };

  const handleFieldChange = (rowIndex, fieldKey, value) => {
    updateRow(rowIndex, row => {
      const nextRowErrors = { ...row.rowErrors };
      delete nextRowErrors[fieldKey];
      return {
        ...row,
        [fieldKey]: value,
        rowErrors: nextRowErrors,
      };
    });
  };

  const handleAttachmentPick = (rowIndex, fileList) => {
    const incoming = Array.from(fileList || []);
    setSelectedFilesByRow(prev => {
      const next = prev.slice();
      next[rowIndex] = incoming;
      return next;
    });
    updateRow(rowIndex, row => ({ ...row, attachmentError: "" }));
  };

  const handleAttachmentUpload = rowIndex => {
    const picked = selectedFilesByRow[rowIndex] || [];
    const current = rows[rowIndex].attachments;
    const result = normalizeAttachmentSelection(picked, current);

    updateRow(rowIndex, row => ({
      ...row,
      attachments: result.files,
      attachmentError: result.error,
    }));

    if (picked.length > 0) {
      setSelectedFilesByRow(prev => {
        const next = prev.slice();
        next[rowIndex] = [];
        return next;
      });
    }
  };

  const handleAttachmentRemove = (rowIndex, attachIndex) => {
    updateRow(rowIndex, row => ({
      ...row,
      attachments: row.attachments.filter((_, idx) => idx !== attachIndex),
      attachmentError: "",
    }));
  };

  const handleSuccessConfirm = () => {
    setSaveSuccessOpen(false);
    navigate("/dashboard/materials/request");
  };

  const handleSuccessDialogClose = (_, reason) => {
    if (reason === "backdropClick" || reason === "escapeKeyDown") {
      return;
    }
  };

  const handleSave = () => {
    setSubmitError("");

    const { errors: rowErrors, filledRowIndexes } =
      validateMassRequestBatch(rows);

    if (filledRowIndexes.length === 0) {
      setSubmitError("Minimal isi 1 baris.");
      return;
    }

    if (rowErrors && Object.keys(rowErrors).length > 0) {
      setRows(prev =>
        prev.map((row, idx) => {
          const errorsForRow = rowErrors[idx];
          if (!errorsForRow) {
            return row;
          }
          return {
            ...row,
            rowErrors: {
              ...row.rowErrors,
              ...errorsForRow,
            },
          };
        })
      );
      const topLevelRowError = rowErrors[-1]?.rows?.message;
      if (topLevelRowError) {
        setSubmitError(topLevelRowError);
      }
      return;
    }

    pendingSubmitRef.current = { filledRowIndexes };
    setReasonError("");
    setReasonDraft("");
    setReasonDialogOpen(true);
  };

  const handleReasonDialogClose = (_, reason) => {
    if (reason === "backdropClick" || reason === "escapeKeyDown") {
      return;
    }
    setReasonDialogOpen(false);
  };

  const handleReasonConfirm = async () => {
    const trimmed = reasonDraft.trim();
    if (!trimmed) {
      setReasonError("Mass request reason wajib diisi.");
      return;
    }

    const pending = pendingSubmitRef.current;
    if (!pending) {
      setReasonDialogOpen(false);
      return;
    }

    const { filledRowIndexes } = pending;
    setReasonDialogOpen(false);

    const formPayload = new FormData();
    formPayload.append(
      "rows",
      JSON.stringify(
        rows.map(row => ({
          plant: row.plant,
          sloc: row.sloc,
          materialGroup: row.materialGroup,
          materialSubGroup: row.materialSubGroup,
          description: row.description,
          poText: row.poText,
          uom: row.uom,
          spesifikasiTambahan: row.spesifikasiTambahan,
        }))
      )
    );

    formPayload.append("massRequestReason", trimmed);
    for (const rowIndex of filledRowIndexes) {
      const row = rows[rowIndex];
      for (const file of row.attachments) {
        formPayload.append("files", file);
        formPayload.append("fileRowIndex", String(rowIndex));
      }
    }

    try {
      setSubmitting(true);
      await axiosPrivate.post("/material/requests/mass", formPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSaveSuccessOpen(true);
    } catch (error) {
      const serverErrors = Array.isArray(error?.response?.data?.errors)
        ? error.response.data.errors
        : [];
      const mapped = mapMassRequestServerErrors(serverErrors);

      if (Object.keys(mapped).length > 0) {
        setRows(prev =>
          prev.map((row, idx) => {
            const rowErrorMap = mapped[idx];
            if (!rowErrorMap) {
              return row;
            }
            return {
              ...row,
              rowErrors: {
                ...row.rowErrors,
                ...rowErrorMap,
              },
            };
          })
        );
      }

      const topLevel =
        error?.response?.data?.message ||
        "Gagal menyimpan mass material request.";
      if (Object.keys(mapped).length === 0) {
        setSubmitError(topLevel);
      }
    } finally {
      setSubmitting(false);
      pendingSubmitRef.current = null;
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
        mb: 4,
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a237e" }}>
            Mass Material Request
          </Typography>
          <Typography variant="caption" color="text.secondary">
            *Maksimal {MASS_MAX_ROWS} baris per submit. Setiap baris wajib
            memiliki minimal 1 attachment.
          </Typography>
        </Box>
      </Box>

      <CardContent sx={{ p: 2 }}>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0 }}>
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
                {MASS_TEXT_FIELDS.map(fieldKey => (
                  <TableCell
                    key={fieldKey}
                    align="left"
                    sx={{
                      fontWeight: 700,
                      border: "1px solid #e0e0e0",
                      py: 1.5,
                    }}
                  >
                    {MASS_ROW_FIELD_LABELS[fieldKey]}
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    border: "1px solid #e0e0e0",
                    py: 1.5,
                    width: 220,
                  }}
                >
                  Attach
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, rowIndex) => {
                const picked = selectedFilesByRow[rowIndex] || [];
                const canUpload =
                  picked.length > 0 && row.attachments.length < 3;
                return (
                  <TableRow key={rowIndex}>
                    <TableCell
                      align="center"
                      sx={{ border: "1px solid #e0e0e0", fontWeight: 600 }}
                    >
                      {rowIndex + 1}
                    </TableCell>
                    {MASS_TEXT_FIELDS.map(fieldKey => {
                      const fieldError = row.rowErrors[fieldKey];
                      return (
                        <TableCell
                          key={fieldKey}
                          sx={{
                            border: "1px solid #e0e0e0",
                            verticalAlign: "top",
                          }}
                        >
                          <TextField
                            size="small"
                            variant="standard"
                            fullWidth
                            multiline={
                              fieldKey === "poText" ||
                              fieldKey === "spesifikasiTambahan"
                            }
                            minRows={
                              fieldKey === "poText" ||
                              fieldKey === "spesifikasiTambahan"
                                ? 1
                                : undefined
                            }
                            maxRows={4}
                            value={row[fieldKey]}
                            onChange={e =>
                              handleFieldChange(
                                rowIndex,
                                fieldKey,
                                e.target.value
                              )
                            }
                            error={Boolean(fieldError?.error)}
                            helperText={fieldError?.message || ""}
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell
                      align="left"
                      sx={{
                        border: "1px solid #e0e0e0",
                        verticalAlign: "top",
                        p: 1,
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          <Chip
                            size="small"
                            label={`${row.attachments.length}/3 attached`}
                            color={
                              row.attachments.length === 0
                                ? "default"
                                : row.attachments.length >= 3
                                ? "success"
                                : "primary"
                            }
                            variant="outlined"
                          />
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          <Button
                            component="label"
                            size="small"
                            variant="text"
                            startIcon={<AttachFile fontSize="small" />}
                            disabled={row.attachments.length >= 3}
                            sx={{ textTransform: "none" }}
                          >
                            Browse
                            <input
                              type="file"
                              hidden
                              multiple
                              accept={ALLOWED_ATTACHMENT_EXTENSIONS.map(
                                ext => `.${ext}`
                              ).join(",")}
                              onChange={e =>
                                handleAttachmentPick(rowIndex, e.target.files)
                              }
                            />
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleAttachmentUpload(rowIndex)}
                            disabled={!canUpload}
                            sx={{ textTransform: "none" }}
                          >
                            Upload
                          </Button>
                        </Stack>
                        {picked.length > 0 ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {picked.length} file dipilih (klik Upload untuk
                            menambahkan ke baris).
                          </Typography>
                        ) : null}
                        {row.attachmentError ? (
                          <Typography variant="caption" color="error">
                            {row.attachmentError}
                          </Typography>
                        ) : null}
                        {row.rowErrors.attachments?.error ? (
                          <Typography variant="caption" color="error">
                            {row.rowErrors.attachments.message}
                          </Typography>
                        ) : null}
                        {row.attachments.map((file, attachIndex) => (
                          <Stack
                            key={`${rowIndex}-${attachIndex}-${file.name}`}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              border: "1px solid #e0e0e0",
                              borderRadius: 0.5,
                              px: 1,
                              py: 0.5,
                            }}
                          >
                            <Tooltip title={file.name} placement="top">
                              <Typography
                                variant="caption"
                                noWrap
                                sx={{ maxWidth: 140 }}
                              >
                                {file.name}
                              </Typography>
                            </Tooltip>
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleAttachmentRemove(rowIndex, attachIndex)
                              }
                              aria-label="Remove attachment"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Stack>
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {submitError ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="error">
              {submitError}
            </Typography>
          </Box>
        ) : null}
      </CardContent>

      <Box
        sx={{
          p: 2.5,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
        }}
      >
        <Button
          variant="contained"
          sx={{
            bgcolor: "#546e7a",
            "&:hover": { bgcolor: "#455a64" },
            textTransform: "none",
            minWidth: 100,
          }}
          onClick={onBack}
          disabled={submitting}
        >
          Close
        </Button>
        <Button
          variant="contained"
          disableElevation
          sx={{
            bgcolor: "#1976d2",
            textTransform: "none",
            minWidth: 100,
          }}
          onClick={handleSave}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save"}
        </Button>
      </Box>
      <Dialog
        open={reasonDialogOpen}
        onClose={handleReasonDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Mass Request Reason</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Jelaskan alasan pengajuan mass request ini. Wajib diisi sebelum
              submit.
            </Typography>
            <TextField
              autoFocus
              required
              multiline
              minRows={3}
              maxRows={6}
              fullWidth
              value={reasonDraft}
              onChange={event => {
                setReasonDraft(event.target.value);
                if (reasonError) {
                  setReasonError("");
                }
              }}
              error={Boolean(reasonError)}
              helperText={reasonError || "Minimal 1 karakter."}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            onClick={handleReasonDialogClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReasonConfirm}
            disabled={submitting || reasonDraft.trim() === ""}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={saveSuccessOpen}
        onClose={handleSuccessDialogClose}
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Success</DialogTitle>
        <DialogContent>
          <Typography>Mass material request saved successfully</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleSuccessConfirm}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default MassMaterialForm;
