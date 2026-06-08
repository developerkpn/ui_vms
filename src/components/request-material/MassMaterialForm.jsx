import React, { useRef, useState } from "react";
import {
  Alert,
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
import {
  AttachFile,
  Delete,
  FileDownloadOutlined,
  FileUploadOutlined,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
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
  buildMassExcelAoa,
  parseMassExcelToRows,
} from "./massMaterialExcel.mjs";
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  normalizeAttachmentSelection,
} from "./attachmentValidation.mjs";

// Column widths (in characters) for the exported worksheet, aligned to
// MASS_EXCEL_HEADER_ROW: [No, Plant, Sloc, Material Group, Sub Mat Group,
// Description, PO Text, UoM, Spesifikasi Tambahan].
const MASS_EXCEL_COLUMN_WIDTHS = [
  { wch: 5 },
  { wch: 12 },
  { wch: 12 },
  { wch: 18 },
  { wch: 18 },
  { wch: 42 },
  { wch: 30 },
  { wch: 10 },
  { wch: 42 },
];

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
  const [importFeedback, setImportFeedback] = useState(null);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const pendingSubmitRef = useRef(null);
  const fileInputRef = useRef(null);
  const pendingImportRef = useRef(null);

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

  const handleExportExcel = () => {
    const filledRows = rows.filter(isMassRowFilled);
    // Always emit MASS_MAX_ROWS data rows so the sheet doubles as a ready-to-fill
    // template and the text formatting below applies to every editable cell.
    const exportRows = Array.from(
      { length: MASS_MAX_ROWS },
      (_, idx) => filledRows[idx] || createEmptyRow()
    );
    const aoa = buildMassExcelAoa(exportRows);
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet["!cols"] = MASS_EXCEL_COLUMN_WIDTHS;

    // Force the 8 data field columns to Excel "Text" format (z:"@") so codes
    // typed into the template keep leading zeros (e.g. SAP sloc "0010" would
    // otherwise be numericized to 10 before the file is ever re-imported).
    // Column 0 is the "No" column, left numeric.
    const lastFieldCol = MASS_TEXT_FIELDS.length; // cols 1..N are the fields
    for (let r = 1; r <= MASS_MAX_ROWS; r += 1) {
      for (let c = 1; c <= lastFieldCol; c += 1) {
        const ref = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[ref] || { t: "s", v: "" };
        cell.t = "s";
        cell.z = "@";
        worksheet[ref] = cell;
      }
    }
    worksheet["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: MASS_MAX_ROWS, c: lastFieldCol },
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mass Request");
    const filename =
      filledRows.length > 0
        ? "mass-material-request.xlsx"
        : "mass-material-request-template.xlsx";
    XLSX.writeFile(workbook, filename);
    setImportFeedback({
      severity: "info",
      message:
        filledRows.length > 0
          ? `Berhasil mengekspor ${filledRows.length} baris ke Excel.`
          : "Template Excel berhasil diunduh. Isi datanya lalu import kembali ke form.",
    });
  };

  const handleImportClick = () => {
    setImportFeedback(null);
    if (fileInputRef.current) {
      // Reset so picking the same file again still fires onChange.
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const applyImportedRows = parsed => {
    const imported = parsed.rows.slice(0, MASS_MAX_ROWS);
    const nextRows = Array.from({ length: MASS_MAX_ROWS }, (_, idx) => {
      const base = createEmptyRow();
      const source = imported[idx];
      if (!source) {
        return base;
      }
      return {
        ...base,
        plant: source.plant ?? "",
        sloc: source.sloc ?? "",
        materialGroup: source.materialGroup ?? "",
        materialSubGroup: source.materialSubGroup ?? "",
        description: source.description ?? "",
        poText: source.poText ?? "",
        uom: source.uom ?? "",
        spesifikasiTambahan: source.spesifikasiTambahan ?? "",
      };
    });

    setRows(nextRows);
    setSelectedFilesByRow(Array.from({ length: MASS_MAX_ROWS }, () => []));
    setSubmitError("");
    pendingImportRef.current = null;

    const parts = [
      `${parsed.importedCount} baris berhasil diimport dan masih bisa diedit.`,
    ];
    if (parsed.skippedBlank > 0) {
      parts.push(`${parsed.skippedBlank} baris kosong dilewati.`);
    }
    if (parsed.droppedOverflow > 0) {
      parts.push(
        `${parsed.droppedOverflow} baris melebihi batas ${MASS_MAX_ROWS} diabaikan.`
      );
    }
    parts.push(
      "Tambahkan attachment di setiap baris sebelum submit (tidak ikut terimport dari Excel)."
    );

    setImportFeedback({
      severity: parsed.droppedOverflow > 0 ? "warning" : "success",
      message: parts.join(" "),
    });
  };

  const handleImportFileChange = async event => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setImportFeedback({
          severity: "error",
          message: "File Excel tidak memiliki sheet.",
        });
        return;
      }
      const worksheet = workbook.Sheets[firstSheetName];
      // raw:false returns each cell's displayed text, so dates come back as the
      // shown string (not an Excel serial) and number-formatted codes keep their
      // formatting instead of being stringified through String(number).
      const aoa = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        blankrows: false,
        defval: "",
        raw: false,
      });
      const parsed = parseMassExcelToRows(aoa);
      if (parsed.error) {
        setImportFeedback({ severity: "error", message: parsed.error });
        return;
      }

      // Warn before discarding any existing work: filled text rows, uploaded
      // attachments, or files that were picked but not yet uploaded.
      const hasExistingData =
        rows.some(
          row =>
            isMassRowFilled(row) ||
            (Array.isArray(row.attachments) && row.attachments.length > 0)
        ) ||
        selectedFilesByRow.some(list => Array.isArray(list) && list.length > 0);

      if (hasExistingData) {
        pendingImportRef.current = parsed;
        setOverwriteConfirmOpen(true);
      } else {
        applyImportedRows(parsed);
      }
    } catch (error) {
      setImportFeedback({
        severity: "error",
        message:
          "Gagal membaca file Excel. Pastikan file berformat .xlsx atau .xls yang valid.",
      });
    }
  };

  const handleOverwriteConfirm = () => {
    setOverwriteConfirmOpen(false);
    if (pendingImportRef.current) {
      applyImportedRows(pendingImportRef.current);
    }
  };

  const handleOverwriteCancel = () => {
    setOverwriteConfirmOpen(false);
    pendingImportRef.current = null;
    setImportFeedback({
      severity: "info",
      message: "Import dibatalkan. Data yang sudah ada tetap dipertahankan.",
    });
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
    setImportFeedback(null);

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
          <Typography variant="caption" color="text.secondary" display="block">
            *Maksimal {MASS_MAX_ROWS} baris per submit. Setiap baris wajib
            memiliki minimal 1 attachment.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Gunakan Export Excel untuk mengunduh template/data, lalu Import Excel
            untuk mengisi tabel otomatis (data tetap bisa diedit).
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadOutlined fontSize="small" />}
            onClick={handleExportExcel}
            disabled={submitting}
            sx={{ textTransform: "none" }}
          >
            Export Excel
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileUploadOutlined fontSize="small" />}
            onClick={handleImportClick}
            disabled={submitting}
            sx={{ textTransform: "none" }}
          >
            Import Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".xlsx,.xls"
            onChange={handleImportFileChange}
          />
        </Stack>
      </Box>

      <CardContent sx={{ p: 2 }}>
        {importFeedback ? (
          <Alert
            severity={importFeedback.severity}
            sx={{ mb: 2, borderRadius: 0 }}
            onClose={() => setImportFeedback(null)}
          >
            {importFeedback.message}
          </Alert>
        ) : null}
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
                              onClick={e => {
                                // Reset so re-picking the same filename (e.g. to
                                // re-add a removed file) still fires onChange.
                                e.currentTarget.value = "";
                              }}
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
        open={overwriteConfirmOpen}
        onClose={handleOverwriteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Ganti data yang ada?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Form saat ini sudah memiliki data. Import dari Excel akan mengganti
            semua baris pada tabel (attachment yang sudah dipilih akan direset).
            Lanjutkan?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={handleOverwriteCancel}>
            Batal
          </Button>
          <Button variant="contained" onClick={handleOverwriteConfirm}>
            Ya, Ganti Data
          </Button>
        </DialogActions>
      </Dialog>

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
