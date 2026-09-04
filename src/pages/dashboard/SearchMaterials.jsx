import {
  BrokenImage,
  Close,
  Delete,
  Description,
  Download,
  Edit,
  Visibility,
  MoreHoriz,
  InsertDriveFile,
  PictureAsPdf,
  Image as ImageIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import moment from "moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SearchSuggestionField from "src/components/common/SearchSuggestionField";
import {
  buildChangeRequestPayload,
  buildChangeTemplateFields,
  buildExtendRequestPayload,
  buildPlantOptions,
  buildPlantLabelMap,
  buildStorageOptionsForPlant,
  extractChangeTemplateValues,
} from "src/helper/materialChangeExtendRequest.js";
import {
  ATTACHMENT_SIZE_LIMIT_TEXT,
  ATTACHMENT_SUPPORTED_FORMATS_TEXT,
  getAttachmentExtension,
  MAX_ATTACHMENTS,
  normalizeAttachmentSelection,
} from "src/components/request-material/attachmentValidation.js";
import TableSorting from "src/components/table/TableSorting";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import PageHeader from "src/components/common/PageHeader";
import PageTablePaper from "src/components/common/PageTablePaper";
import usePermissionStore from "src/store/userPermissionStore";

const columnHelper = createColumnHelper();
const MAX_ATTACHMENT_PREVIEW = 3;
const DEFAULT_PLANT_LABEL = "EU73 - EUP GENERAL KIJING";
const DEFAULT_STORAGE_LOCATION = "ST01 - Main Store";
const DEFAULT_BASE_UOM = "PC - Pieces";
const IMAGE_ATTACHMENT_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

// Which icon or thumbnail a file name gets, in the three places that ask: the
// table's preview strip, the files queued for upload, and the material's saved
// list.
const isImageAttachment = fileName =>
  IMAGE_ATTACHMENT_EXTENSIONS.includes(getAttachmentExtension(fileName));

// A non-image attachment shows what it actually is. Anything generic in this
// slot reads as "no attachment" to someone scanning the column, which is the
// one thing it must never mean.
function AttachmentTypeIcon({ fileName }) {
  const extension = getAttachmentExtension(fileName);

  if (extension === "pdf") {
    return <PictureAsPdf sx={{ fontSize: 24, color: "error.main" }} />;
  }

  if (extension === "doc" || extension === "docx") {
    return <Description sx={{ fontSize: 24, color: "info.dark" }} />;
  }

  return <InsertDriveFile sx={{ fontSize: 24, color: "text.secondary" }} />;
}

// This column used to render `name` alone — MAKTX, hard-capped at 40 chars in
// SAP — while /material/search also matches description, long_text and the
// aliases. A row that matched on word 60 of its long text therefore looked like
// it had matched nothing. It now shows the combined description the search
// endpoint already returns, clamped to two lines.
function MaterialDescriptionCell({ text }) {
  const textRef = useRef(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const node = textRef.current;
    // +1 absorbs sub-pixel line-height rounding, which otherwise reports a
    // one-line description as overflowing.
    setIsClamped(Boolean(node) && node.scrollHeight > node.clientHeight + 1);
  }, [text]);

  const body = (
    <Typography
      ref={textRef}
      variant="body2"
      sx={{
        fontWeight: 600,
        color: "text.primary",
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: 2,
        overflow: "hidden",
      }}
    >
      {text}
    </Typography>
  );

  // Only a clamped description earns a tooltip; hovering one that is already
  // fully visible just repeats it back.
  return (
    <Box sx={{ minWidth: 200 }}>
      {isClamped ? (
        <Tooltip title={text} placement="top-start">
          {body}
        </Tooltip>
      ) : (
        body
      )}
    </Box>
  );
}
const MATERIAL_ACTION_DIALOG_CONFIG = {
  extend: {
    title: "Extend Material",
    subtitle: "Extend existing materials to additional plants, storage locations, or views.",
    primaryLabel: "Plant",
    secondaryLabel: "Storage Location",
    secondaryDisabled: false,
    reasonPlaceholder: "Reason for Material Extension?",
  },
  change: {
    title: "Change Material",
    subtitle: "Update or modify existing material master data.",
    primaryLabel: "Material Name",
    secondaryLabel: "Base UoM",
    secondaryDisabled: false,
    reasonPlaceholder: "Reason for Material Change?",
  },
};

const buildPlantLabel = material => {
  const plantCandidates = [
    material?.plantLabel,
    material?.plant_name,
    material?.plantName,
    material?.plant,
  ].filter(Boolean);

  if (plantCandidates.length > 0) {
    const plantCode = material?.plant_code || material?.plantCode;
    const firstValue = plantCandidates[0];
    return plantCode && !String(firstValue).includes(plantCode)
      ? `${plantCode} - ${firstValue}`
      : firstValue;
  }

  if (material?.groupCode || material?.groupName) {
    return [material.groupCode, material.groupName].filter(Boolean).join(" - ");
  }

  return DEFAULT_PLANT_LABEL;
};

const buildStorageLocationLabel = material => {
  const storageCandidates = [
    material?.storageLocationLabel,
    material?.storage_location,
    material?.storageLocation,
    material?.sloc_code,
    material?.slocCode,
  ].filter(Boolean);

  return storageCandidates[0] || DEFAULT_STORAGE_LOCATION;
};

const buildBaseUomLabel = material =>
  material?.unit_of_measurement || material?.base_uom || material?.baseUom || DEFAULT_BASE_UOM;

const createMaterialActionDraft = (mode, material = {}) => {
  const code = material?.code || "-";
  const description = material?.name || material?.material_description || "-";
  const plantLabel = buildPlantLabel(material);
  const storageLocationLabel = buildStorageLocationLabel(material);
  const baseUomLabel = buildBaseUomLabel(material);
  const plantCode = material?.plant_code || material?.plantCode || plantLabel.split(" - ")[0] || "";
  const storageLocation = material?.sloc_code || material?.slocCode || storageLocationLabel;

  if (mode === "extend") {
    return {
      plantCode,
      storageLocation,
      reason: "",
      materialCode: code,
      materialDescription: description,
    };
  }

  return {
    materialName: description,
    baseUom: baseUomLabel,
    reason: "",
    materialCode: code,
    materialDescription: description,
    changeTemplateFields: buildChangeTemplateFields(material),
    templateValues: extractChangeTemplateValues(material),
  };
};

function MaterialActionDialog({
  open,
  mode,
  draft,
  plantOptions,
  plantLabelMap = new Map(),
  storageOptions,
  submitting,
  onClose,
  onFieldChange,
  onSubmit,
}) {
  const config = MATERIAL_ACTION_DIALOG_CONFIG[mode];
  const isExtend = mode === "extend";
  const changeTemplateFields = isExtend ? [] : draft.changeTemplateFields || [];

  if (!config) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 0,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#1f2a44", mb: 1 }}>
              {config.title}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 360 }}>
              {config.subtitle}
            </Typography>
          </Box>
          <Chip
            label="PRD"
            size="small"
            sx={{
              height: 28,
              fontWeight: 800,
              bgcolor: "#e6f0ff",
              color: "#7aa2f7",
              borderRadius: 1,
            }}
          />
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#1f2a44", mb: 0.5 }}>
          {draft.materialCode || "-"}
        </Typography>
        <Typography variant="subtitle1" sx={{ color: "#4f5b6b", mb: 3.5 }}>
          {draft.materialDescription || "-"}
        </Typography>

        <Stack spacing={2.5}>
          {isExtend ? (
            <>
              <TextField
                select
                label={config.primaryLabel}
                fullWidth
                value={draft.plantCode || ""}
                onChange={event => onFieldChange("plantCode", event.target.value)}
                InputLabelProps={{ shrink: true }}
              >
                {plantOptions.map(option => (
                  <MenuItem key={option} value={option}>
                    {plantLabelMap.get(option) || option}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={config.secondaryLabel}
                fullWidth
                value={draft.storageLocation || ""}
                onChange={event => onFieldChange("storageLocation", event.target.value)}
                disabled={config.secondaryDisabled || storageOptions.length === 0}
                InputLabelProps={{ shrink: true }}
              >
                {storageOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </>
          ) : (
            <>
              <TextField
                label={config.primaryLabel}
                fullWidth
                value={draft.materialName || ""}
                onChange={event => onFieldChange("materialName", event.target.value.toUpperCase())}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label={config.secondaryLabel}
                fullWidth
                value={draft.baseUom || ""}
                onChange={event => onFieldChange("baseUom", event.target.value.toUpperCase())}
                disabled={config.secondaryDisabled}
                InputLabelProps={{ shrink: true }}
              />
            </>
          )}
          {changeTemplateFields.map(field => (
            <TextField
              key={field.key}
              label={field.label}
              fullWidth
              value={draft.templateValues?.[field.key] || field.value || ""}
              onChange={event => onFieldChange(`templateValues.${field.key}`, event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          ))}
          {/* Reason stays as-typed on purpose — it's free-text explanation,
              not a material field going to SAP. Mass Request's own Reason
              field (MassMaterialForm.jsx) does uppercase, so this is a
              deliberate deviation from that one, not an oversight. */}
          <TextField
            label="Reason"
            fullWidth
            multiline
            minRows={5}
            value={draft.reason}
            onChange={event => onFieldChange("reason", event.target.value)}
            placeholder={config.reasonPlaceholder}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 0, justifyContent: "flex-start", gap: 1 }}>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={submitting}
          sx={{
            minWidth: 76,
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "8px",
            boxShadow: "none",
          }}
        >
          {submitting ? "Saving..." : "Add"}
        </Button>
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{ textTransform: "none", color: "text.secondary" }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const AuthenticatedImage = ({ src, sx, onClick }) => {
  const axiosPrivate = useAxiosPrivate();
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      try {
        const response = await axiosPrivate.get(src, { responseType: "blob" });
        if (isMounted) {
          const url = URL.createObjectURL(response.data);
          setImgSrc(url);
          setError(false);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setImgSrc(null);
          setLoading(false);
        }
      }
    };

    fetchImage();
    return () => {
      isMounted = false;
      if (imgSrc) {
        URL.revokeObjectURL(imgSrc);
      }
    };
  }, [src, axiosPrivate]);

  if (loading) return <CircularProgress size={16} thickness={5} sx={{ color: "grey.300" }} />;

  // An image the browser could not fetch or decode says so. Standing in a
  // picture-shaped graphic here would make a missing file look like a file.
  if (error) {
    return <BrokenImage sx={{ fontSize: 24, color: "text.disabled" }} />;
  }

  return (
    <Box
      component="img"
      src={imgSrc}
      sx={{
        ...sx,
        transition: "transform 0.2s",
        "&:hover": { transform: "scale(1.1)" },
      }}
      onError={() => setError(true)}
      onClick={onClick}
    />
  );
};

export default function SearchMaterials() {
  const axiosPrivate = useAxiosPrivate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState("idle");
  const [materials, setMaterials] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });
  const [sorting, setSorting] = useState([]);
  const [attachmentsDialogOpen, setAttachmentsDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const attachmentInputRef = useRef(null);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [materialActionDialog, setMaterialActionDialog] = useState({
    open: false,
    mode: "change",
    material: null,
    draft: createMaterialActionDraft("change"),
  });
  const [initialLocations, setInitialLocations] = useState([]);
  const [materialActionSubmitting, setMaterialActionSubmitting] = useState(false);
  const [activeRequestCheck, setActiveRequestCheck] = useState({ change: false, extend: false, loading: false });
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuMaterial, setMenuMaterial] = useState(null);
  const permission = usePermissionStore(state => state.permission);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axiosPrivate.get("/material/groups/dropdown");
      setGroups(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  };

  // Remove redundant useEffect that resets page 1 automatically
  // Handling reset in event handlers instead for better predictability

  useEffect(() => {
    fetchMaterials(pagination.page);
  }, [searchQuery, selectedGroup, pagination.page, sorting, searchMode]);

  const fetchMaterials = useCallback(
    async (pageNumber = 1) => {
      if (searchMode === "idle") {
        setMaterials([]);
        setPagination(prev => ({
          ...prev,
          totalCount: 0,
          totalPages: 0,
          page: 1,
        }));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await axiosPrivate.get("/material/search", {
          params: {
            q: searchQuery,
            groupId: selectedGroup,
            page: pageNumber,
            pageSize: pagination.pageSize,
            sortBy: sorting[0]?.id || "createdAt",
            sortOrder: sorting[0]?.desc ? "desc" : "asc",
          },
        });

        const data = response.data.data || [];
        let rows = data;

        if (searchMode === "selected") {
          // A picked suggestion already identifies one material, so the table
          // collapses to that single row instead of the whole result set.
          const normalizedQuery = (searchQuery || "").toLowerCase().trim();
          const exactMatches = data.filter(item => {
            const code = (item.code || "").toLowerCase();
            const name = (item.name || "").toLowerCase();
            return code === normalizedQuery || name === normalizedQuery;
          });
          rows = exactMatches.length > 0 ? [exactMatches[0]] : data.slice(0, 1);

          setPagination(prev => ({
            ...prev,
            totalCount: rows.length,
            totalPages: rows.length ? 1 : 0,
            page: 1,
          }));
        } else {
          const meta = response.data.pagination || {};
          setPagination(prev => ({
            ...prev,
            totalCount: meta.totalCount ?? rows.length,
            totalPages: meta.totalPages ?? (rows.length ? 1 : 0),
            page: meta.page ?? pageNumber,
          }));
        }

        setMaterials(rows);

        // Fetch attachments for found materials (non-blocking). Rows land here
        // with `attachments` undefined and the column shows a skeleton until
        // this settles it to an array — so every path below has to settle it,
        // including the ones that fetch nothing.
        const codes = rows.map(m => m.code).filter(Boolean);
        if (codes.length === 0) {
          setMaterials(prev => prev.map(m => ({ ...m, attachments: m.attachments || [] })));
        } else {
          axiosPrivate.post("/material/by-codes", { codes })
            .then(attRes => {
              const byCode = {};
              (attRes.data?.data || []).forEach(m => {
                byCode[m.code] = m.attachments || [];
              });
              setMaterials(prev =>
                prev.map(m => ({ ...m, attachments: byCode[m.code] || [] }))
              );
            })
            .catch(() => {
              // Attachments are optional; the column settles on "none" rather
              // than waiting forever on a call that already failed.
              setMaterials(prev => prev.map(m => ({ ...m, attachments: m.attachments || [] })));
            });
        }
      } catch (error) {
        console.error("Failed to fetch materials:", error);
      } finally {
        setLoading(false);
      }
    },
    [searchMode, searchQuery, selectedGroup, pagination.pageSize, sorting, axiosPrivate]
  );

  const resetTableState = () => {
    setMaterials([]);
    setPagination(prev => ({
      ...prev,
      totalCount: 0,
      totalPages: 0,
      page: 1,
    }));
  };

  const handleSearchChange = payload => {
    if (!payload) return;

    if (payload.type === "select") {
      setSearchMode("selected");
      setSearchQuery(payload.keyword || "");
      setPagination(prev => ({ ...prev, page: 1 }));
      return;
    }

    if (payload.type === "enter" || payload.type === "icon") {
      setSearchMode("query");
      setSearchQuery(payload.query || "");
      setPagination(prev => ({ ...prev, page: 1 }));
      return;
    }
  };

  const handleSearchInputChange = value => {
    if (searchMode !== "idle") {
      setSearchMode("idle");
      setSearchQuery("");
      resetTableState();
    }

    if (!value) {
      setSearchMode("idle");
      setSearchQuery("");
      resetTableState();
    }
  };

  const handleGroupChange = e => {
    setSelectedGroup(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (event, value) => {
    setPagination(prev => ({ ...prev, page: value }));
    // fetchMaterials will be called by useEffect
  };

  const handleActionMenuOpen = async (event, material) => {
    setAnchorEl(event.currentTarget);
    setMenuMaterial(material);
    setActiveRequestCheck({ change: false, extend: false, loading: true });

    try {
      const materialCode = material?.code || "";
      if (materialCode) {
        const [changeRes, extendRes] = await Promise.all([
          axiosPrivate.get("/material/requests/single/active-check", { params: { materialCode, ticketType: "Change" } }),
          axiosPrivate.get("/material/requests/single/active-check", { params: { materialCode, ticketType: "Extend" } }),
        ]);
        setActiveRequestCheck({
          change: changeRes.data?.data?.hasActive || false,
          extend: extendRes.data?.data?.hasActive || false,
          loading: false,
        });
      } else {
        setActiveRequestCheck({ change: false, extend: false, loading: false });
      }
    } catch {
      setActiveRequestCheck({ change: false, extend: false, loading: false });
    }
  };

  const handleActionMenuClose = () => {
    setAnchorEl(null);
    setMenuMaterial(null);
  };

  // Re-reads one material's attachment list and writes it into both the open
  // dialog and the row behind it. The row's copy came from the batched
  // /material/by-codes prefetch, which is only as fresh as the last search, so
  // without this the table's thumbnail strip keeps showing the list from before
  // an upload.
  const refreshMaterialAttachments = async materialId => {
    if (!materialId) {
      return;
    }

    try {
      const response = await axiosPrivate.get(`/material/${materialId}/attachments`);
      const attachments = response.data?.data || [];

      setSelectedMaterial(prev =>
        prev?.id === materialId ? { ...prev, attachments } : prev
      );
      setMaterials(prev =>
        prev.map(row => (row.id === materialId ? { ...row, attachments } : row))
      );
    } catch (error) {
      // The dialog falls back to the prefetched list rather than emptying out,
      // so a failed refresh costs freshness, not the whole section.
      console.error("Failed to load material attachments:", error?.message);
    }
  };

  const handleOpenAttachmentsDialog = material => {
    setSelectedMaterial(material);
    setPendingAttachments([]);
    setAttachmentError("");
    setAttachmentsDialogOpen(true);
    refreshMaterialAttachments(material?.id);
  };

  const handleCloseAttachmentsDialog = () => {
    setAttachmentsDialogOpen(false);
    setSelectedMaterial(null);
    setPendingAttachments([]);
    setAttachmentError("");
  };

  const handleAttachmentBrowseClick = () => {
    attachmentInputRef.current?.click();
  };

  const handleAttachmentFileChange = event => {
    const { files, error } = normalizeAttachmentSelection(
      event.target.files,
      pendingAttachments
    );

    setPendingAttachments(files);
    setAttachmentError(error);
    // Cleared so picking the same file again after removing it still fires a
    // change event.
    event.target.value = "";
  };

  const handleRemovePendingAttachment = index => {
    setPendingAttachments(prev => prev.filter((_, position) => position !== index));
    setAttachmentError("");
  };

  const handleUploadAttachments = async () => {
    const materialId = selectedMaterial?.id;
    if (!materialId || pendingAttachments.length === 0) {
      return;
    }

    setAttachmentsUploading(true);
    setAttachmentError("");

    try {
      const formData = new FormData();
      // "files" is the field the upload endpoint parses; anything else arrives
      // as an empty upload.
      pendingAttachments.forEach(file => formData.append("files", file));

      await axiosPrivate.post(`/material/${materialId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPendingAttachments([]);
      await refreshMaterialAttachments(materialId);
      showSnackbar("Attachments uploaded successfully");
    } catch (error) {
      // Only the message: an axios error carries the request config, and that
      // config carries the Authorization header this client attaches to every
      // call. A browser console is user-visible and often screen-shared.
      const message =
        error?.response?.data?.message || "Failed to upload attachments. Please try again.";
      console.error("Failed to upload attachments:", error?.message);
      setAttachmentError(message);
      showSnackbar(message, "error");
    } finally {
      setAttachmentsUploading(false);
    }
  };

  const handleOpenMaterialActionDialog = (mode, material) => {
    const hasActive = mode === "change" ? activeRequestCheck.change : activeRequestCheck.extend;
    if (hasActive) {
      showSnackbar(
        `An active ${mode} request already exists for this material. Please wait for it to complete.`,
        "warning"
      );
      return;
    }
    setMaterialActionDialog({
      open: true,
      mode,
      material,
      draft: createMaterialActionDraft(mode, material),
    });
  };

  const handleCloseMaterialActionDialog = () => {
    setMaterialActionDialog(currentState => ({
      ...currentState,
      open: false,
    }));
  };

  const handleMaterialActionFieldChange = (field, value) => {
    setMaterialActionDialog(currentState => ({
      ...currentState,
      draft: {
        ...currentState.draft,
        ...(field.startsWith("templateValues.")
          ? {
              templateValues: {
                ...(currentState.draft.templateValues || {}),
                [field.replace("templateValues.", "")]: value,
              },
            }
          : {
              [field]: value,
              ...(field === "plantCode" ? { storageLocation: "" } : {}),
            }),
      },
    }));
  };

  const loadInitialLocations = useCallback(async () => {
    const response = await axiosPrivate.get("/material/initial-screen-data");
    setInitialLocations(response.data?.data?.locations || []);
  }, [axiosPrivate]);

  const handleMaterialActionSubmit = async () => {
    const trimmedReason = (materialActionDialog.draft.reason || "").trim();

    if (!trimmedReason) {
      showSnackbar("Reason is required for Change or Extend request.", "error");
      return;
    }

    try {
      setMaterialActionSubmitting(true);
      const payload =
        materialActionDialog.mode === "change"
          ? buildChangeRequestPayload({
              material: materialActionDialog.material,
              draft: materialActionDialog.draft,
            })
          : buildExtendRequestPayload({
              material: materialActionDialog.material,
              draft: materialActionDialog.draft,
            });

      await axiosPrivate.post("/material/requests/single", payload);
      showSnackbar(`${payload.ticketType} material request submitted.`, "success");
      handleCloseMaterialActionDialog();
} catch (error) {
      const serverMessage = error?.response?.data?.message || "Material request failed. Please try again.";
      const serverErrors = error?.response?.data?.errors;
      const detailMessage = Array.isArray(serverErrors) && serverErrors.length > 0
        ? serverErrors.map(e => e.fieldLabel ? `${e.fieldLabel}: ${e.message}` : e.message).join("; ")
        : "";
      showSnackbar(
        detailMessage ? `${serverMessage} — ${detailMessage}` : serverMessage,
        "error"
      );
    } finally {
      setMaterialActionSubmitting(false);
    }
  };

  const handleViewAttachment = attachment => {
    const fileUrl = `${import.meta.env.VITE_URL_LOC}/material/file/${attachment.attachment}`;
    setImageLoadError(false);
    setPreviewFile({
      url: fileUrl,
      name: attachment.attachment,
      type: attachment.type || attachment.fileType || "application/octet-stream",
    });
    setPreviewModalOpen(true);
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        header: "Action",
        id: "actions",
        cell: ({ row }) => (
          <IconButton onClick={e => handleActionMenuOpen(e, row.original)}>
            <MoreHoriz />
          </IconButton>
        ),
      }),
      columnHelper.accessor("code", {
        header: "Code",
        cell: info => (
          <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 500 }}>
            {info.getValue()}
          </Typography>
        ),
      }),
      // Accessor stays "name": it is the sort key the backend's column map
      // understands, and combined_description is not sortable there.
      columnHelper.accessor("name", {
        header: "Material Description",
        size: 280,
        cell: info => (
          <MaterialDescriptionCell
            text={info.row.original.combined_description || info.getValue() || "-"}
          />
        ),
      }),
      columnHelper.accessor("groupName", {
        header: "Group",
        size: 200,
        cell: info => (
          <Typography variant="body2" sx={{ minWidth: 150 }}>
            {info.row.original.groupCode} - {info.getValue()}
          </Typography>
        ),
      }),
      columnHelper.display({
        header: "Alias",
        id: "aliases",
        size: 180,
        cell: ({ row }) => {
          const aliases_list = [
            row.original.alias1,
            row.original.alias2,
            row.original.alias3,
          ].filter(Boolean);
          return (
            <Typography variant="body2" sx={{ minWidth: 120 }}>
              {aliases_list.join(", ") || "-"}
            </Typography>
          );
        },
      }),
      columnHelper.accessor("unit_of_measurement", {
        header: "UoM",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: info => (
          <Typography
            variant="caption"
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: info.getValue() === "Active" ? "success.lighter" : "grey.200",
              color: info.getValue() === "Active" ? "success.main" : "text.secondary",
              fontWeight: 600,
            }}
          >
            {info.getValue()}
          </Typography>
        ),
      }),
      columnHelper.accessor("created_by", {
        header: "Created By",
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("created_at", {
        header: "Created At",
        cell: info => moment(info.getValue()).format("YYYY-MM-DD"),
      }),
      columnHelper.display({
        header: "Attachment",
        id: "attachment",
        size: 160,
        cell: ({ row }) => {
          // Undefined means the attachment call has not answered for this row
          // yet; an empty array means it has, and there are none. The two used
          // to render identically, which is what made an empty row look like it
          // held three files.
          const attachments = row.original.attachments;

          if (attachments === undefined) {
            return (
              <Box sx={{ display: "flex", gap: 0.75, minWidth: 140 }}>
                {Array.from({ length: MAX_ATTACHMENT_PREVIEW }, (_, idx) => (
                  <Skeleton key={idx} variant="rounded" width={42} height={42} />
                ))}
              </Box>
            );
          }

          if (attachments.length === 0) {
            return (
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                -
              </Typography>
            );
          }

          const previewItems = attachments.slice(0, MAX_ATTACHMENT_PREVIEW);

          return (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
                gap: 0.75,
                minWidth: 140,
              }}
            >
              {previewItems.map((att, idx) => {
                const isImg = isImageAttachment(att.attachment);
                return (
                  <Tooltip key={idx} title={att.attachment} arrow>
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        backgroundColor: "white",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "primary.main",
                          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                          transform: "translateY(-2px)",
                        },
                      }}
                      onClick={() => handleViewAttachment(att)}
                    >
                      {isImg ? (
                        <AuthenticatedImage
                          src={`/material/file/${att.attachment}`}
                          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <AttachmentTypeIcon fileName={att.attachment} />
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
              {attachments.length > MAX_ATTACHMENT_PREVIEW && (
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "text.secondary",
                    backgroundColor: "grey.100",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                  }}
                >
                  +{attachments.length - MAX_ATTACHMENT_PREVIEW}
                </Typography>
              )}
            </Box>
          );
        },
      }),
    ],
    []
  );

  const plantOptions = useMemo(() => buildPlantOptions(initialLocations), [initialLocations]);
  const plantLabelMap = useMemo(() => buildPlantLabelMap(initialLocations), [initialLocations]);
  const storageOptions = useMemo(
    () => buildStorageOptionsForPlant(initialLocations, materialActionDialog.draft.plantCode),
    [initialLocations, materialActionDialog.draft.plantCode]
  );

  useEffect(() => {
    if (
      materialActionDialog.open &&
      materialActionDialog.mode === "extend" &&
      plantOptions.length > 0
    ) {
      const currentPlant = materialActionDialog.draft.plantCode;
      const validPlant = currentPlant && plantOptions.includes(currentPlant) ? currentPlant : plantOptions[0];
      const currentStorage = materialActionDialog.draft.storageLocation;
      const storageOpts = buildStorageOptionsForPlant(initialLocations, validPlant);
      const validStorage = currentStorage && storageOpts.some(o => o.value === currentStorage)
        ? currentStorage
        : (storageOpts[0]?.value || "");

      if (validPlant !== currentPlant || validStorage !== currentStorage) {
        setMaterialActionDialog(prev => ({
          ...prev,
          draft: { ...prev.draft, plantCode: validPlant, storageLocation: validStorage },
        }));
      }
    }
  }, [materialActionDialog.open, materialActionDialog.mode, plantOptions, initialLocations]);

  const isSearchActive = searchMode === "selected" || searchMode === "query";
  const emptyMessage = !isSearchActive
    ? "Silakan pilih material dari suggestion, atau tekan Enter untuk mencari"
    : "Maaf, data material tidak ditemukan. Coba gunakan kata kunci atau filter lain.";

  return (
    <>
      <PageHeader
        title="Material Search"
        subtitle="Search and manage materials across all groups"
        actions={
          <Button variant="contained" startIcon={<Download />} color="primary" sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 600, px: 3 }}>
            Download To Excel
          </Button>
        }
      />

      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 2.5,
          width: "100%",
          maxWidth: { md: "800px" },
        }}
      >
        <Box sx={{ width: "100%" }}>
          <SearchSuggestionField
            placeholder="Search materials by name, code, description, alias, UoM..."
            onSearch={handleSearchChange}
            onInputValueChange={handleSearchInputChange}
            apiEndpoint="/material/suggestions"
            sx={{ bgcolor: "background.paper" }}
          />
        </Box>
        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 400 } }}>
          <Select
            displayEmpty
            value={selectedGroup}
            onChange={handleGroupChange}
            renderValue={selected => {
              if (selected === "") {
                return (
                  <Typography sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    Select Material Group
                  </Typography>
                );
              }
              const selectedOption = groups.find(g => g.id === selected);
              return (
                <Typography
                  sx={{
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    fontSize: "0.875rem",
                    lineHeight: 1.2,
                    py: 0.5,
                  }}
                >
                  {selectedOption ? `${selectedOption.code} - ${selectedOption.name}` : selected}
                </Typography>
              );
            }}
            sx={{
              bgcolor: "background.paper",
              "& .MuiSelect-select": {
                whiteSpace: "normal !important",
                display: "flex",
                alignItems: "center",
                minHeight: "1.5rem",
                py: 1,
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  width: "auto",

                  maxHeight: 400,
                },
              },
            }}
          >
            <MenuItem value="" sx={{ whiteSpace: "normal" }}>
              Select Material Group
            </MenuItem>
            {groups.map(group => (
              <MenuItem
                key={group.id}
                value={group.id}
                sx={{
                  whiteSpace: "normal",
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-child": { borderBottom: 0 },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {group.code} - {group.name}
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <PageTablePaper>
        <TableSorting
          rowsData={materials}
          columns={columns}
          sorting={sorting}
          setSorting={setSorting}
          loading={loading}
          emptyMessage={emptyMessage}
        />
      </PageTablePaper>

      <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
        <Pagination
          count={pagination.totalPages}
          page={pagination.page}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>

      {/* Attachments Dialog */}
      <Dialog
        open={attachmentsDialogOpen}
        onClose={handleCloseAttachmentsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Attachments</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
              Add Attachment
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {ATTACHMENT_SUPPORTED_FORMATS_TEXT}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              {ATTACHMENT_SIZE_LIMIT_TEXT}
            </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleAttachmentBrowseClick}
                disabled={
                  attachmentsUploading || pendingAttachments.length >= MAX_ATTACHMENTS
                }
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
              <Button
                variant="contained"
                onClick={handleUploadAttachments}
                disabled={attachmentsUploading || pendingAttachments.length === 0}
                startIcon={
                  attachmentsUploading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : undefined
                }
                sx={{ textTransform: "none", px: 3 }}
              >
                {attachmentsUploading ? "Uploading..." : "Upload"}
              </Button>
            </Box>

            {attachmentError && (
              <Typography variant="caption" color="error" sx={{ display: "block", mb: 2 }}>
                {attachmentError}
              </Typography>
            )}

            {pendingAttachments.length > 0 && (
              <List dense>
                {pendingAttachments.map((file, index) => (
                  <ListItem
                    key={`${file.name}-${index}`}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        color="error"
                        disabled={attachmentsUploading}
                        onClick={() => handleRemovePendingAttachment(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <Delete />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      {isImageAttachment(file.name) ? (
                        <ImageIcon color="primary" />
                      ) : (
                        <AttachmentTypeIcon fileName={file.name} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
            Existing Attachments
          </Typography>
          {selectedMaterial?.attachments?.length > 0 ? (
            <List>
              {selectedMaterial.attachments.map((att, index) => (
                <ListItem
                  key={att.id || index}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleViewAttachment(att)}>
                      <Visibility />
                    </IconButton>
                  }
                >
                  <ListItemIcon>
                    {isImageAttachment(att.attachment) ? (
                      <ImageIcon color="primary" />
                    ) : (
                      <AttachmentTypeIcon fileName={att.attachment} />
                    )}
                  </ListItemIcon>
                  <ListItemText primary={att.attachment} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No attachments available for this material.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAttachmentsDialog} disabled={attachmentsUploading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>


      {/* File Preview Modal */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">{previewFile?.name || "File Preview"}</Typography>
            <IconButton onClick={() => setPreviewModalOpen(false)}>
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
            (previewFile.type.includes("image") ? (
              imageLoadError ? (
                <Box sx={{ textAlign: "center", p: 3 }}>
                  <Typography variant="body1" gutterBottom color="error">
                    Unable to load image. The file may be missing or empty.
                  </Typography>
                </Box>
              ) : (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  onError={() => setImageLoadError(true)}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              )
            ) : previewFile.type.includes("pdf") ? (
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
          <Button onClick={() => setPreviewModalOpen(false)}>Close</Button>
          <Button
            variant="contained"
            href={previewFile?.url}
            download={previewFile?.name}
            disabled={!previewFile || imageLoadError}>
            Download
          </Button>
        </DialogActions>
      </Dialog>
      <MaterialActionDialog
        open={materialActionDialog.open}
        mode={materialActionDialog.mode}
        draft={materialActionDialog.draft}
        plantOptions={plantOptions}
        plantLabelMap={plantLabelMap}
        storageOptions={storageOptions}
        submitting={materialActionSubmitting}
        onClose={handleCloseMaterialActionDialog}
        onFieldChange={handleMaterialActionFieldChange}
        onSubmit={handleMaterialActionSubmit}
      />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionMenuClose}
        PaperProps={{ elevation: 3, sx: { minWidth: 150, mt: 1 } }}
      >
        <MenuItem
          onClick={() => {
            handleOpenAttachmentsDialog(menuMaterial);
            handleActionMenuClose();
          }}
        >
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Attachment</ListItemText>
        </MenuItem>
        <Divider />
        <Tooltip title={activeRequestCheck.change ? "An active Change request already exists for this material" : ""} placement="left">
          <span>
            <MenuItem
              disabled={activeRequestCheck.change || activeRequestCheck.loading}
              onClick={() => {
                handleOpenMaterialActionDialog("change", menuMaterial);
                handleActionMenuClose();
              }}
            >
              <ListItemIcon>
                <Edit fontSize="small" />
              </ListItemIcon>
              <ListItemText>Change</ListItemText>
            </MenuItem>
          </span>
        </Tooltip>
        <Tooltip title={activeRequestCheck.extend ? "An active Extend request already exists for this material" : ""} placement="left">
          <span>
            <MenuItem
              disabled={activeRequestCheck.extend || activeRequestCheck.loading}
              onClick={async () => {
                try {
                  await loadInitialLocations();
                  handleOpenMaterialActionDialog("extend", menuMaterial);
                } catch (error) {
                  showSnackbar("Failed to load plant and storage options.", "error");
                }
                handleActionMenuClose();
              }}
            >
              <ListItemIcon>
                <InsertDriveFile fontSize="small" />
              </ListItemIcon>
              <ListItemText>Extend</ListItemText>
            </MenuItem>
          </span>
        </Tooltip>
      </Menu>
    </>
  );
}
