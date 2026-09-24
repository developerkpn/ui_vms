import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AdministratorBackLink from "src/components/common/AdministratorBackLink";
import PageHeader from "src/components/common/PageHeader";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import useCollapsedFolders from "src/hooks/useCollapsedFolders";
import { useSnackBar } from "src/provider/SnackbarProvider";
import {
  GUIDE_ACCEPT_ATTRIBUTE,
  GUIDE_SIZE_LIMIT_TEXT,
  GUIDE_SUPPORTED_FORMATS_TEXT,
  buildGuideUploadFormData,
  defaultGuideName,
  findGuideMissingName,
  formatGuideSize,
  validateGuideSelection,
} from "src/helper/materialGuides";

const NO_FOLDER = "";

const SectionPaper = ({ children }) => (
  <Paper
    elevation={0}
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: "12px",
      p: { xs: 2, md: 3 },
      bgcolor: "background.paper",
    }}
  >
    {children}
  </Paper>
);

export default function MaterialsGuideUpload() {
  const axiosPrivate = useAxiosPrivate();
  const { openSnackbar } = useSnackBar();
  const fileInputRef = useRef(null);

  const [tree, setTree] = useState({ folders: [], files: [] });
  const [loading, setLoading] = useState(false);

  // Upload staging: files chosen but not yet sent, each with its own optional
  // name and description.
  const [staged, setStaged] = useState([]);
  const [uploadFolder, setUploadFolder] = useState(NO_FOLDER);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  // Folder create/rename dialog.
  const [folderDialog, setFolderDialog] = useState(null);
  const [folderSaving, setFolderSaving] = useState(false);

  // Guide edit dialog.
  const [guideDialog, setGuideDialog] = useState(null);
  const [guideSaving, setGuideSaving] = useState(false);

  const [confirm, setConfirm] = useState(null);
  const { isCollapsed, toggleFolder } = useCollapsedFolders(
    "material-guides.upload.collapsed-folders"
  );

  const loadGuides = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosPrivate.get("/material/guides");
      setTree(data?.data || { folders: [], files: [] });
    } catch (error) {
      openSnackbar(
        "error",
        error?.response?.data?.message || "Failed to load guides."
      );
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, openSnackbar]);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  const allGuides = useMemo(() => {
    const fromFolders = (tree.folders || []).flatMap(folder =>
      (folder.files || []).map(item => ({ ...item, folderName: folder.name }))
    );
    return [...fromFolders, ...(tree.files || [])];
  }, [tree]);

  const handleBrowseClick = () => fileInputRef.current?.click();

  const handleFileChange = event => {
    const { files, error } = validateGuideSelection(event.target.files);

    // Clear the input either way, so picking the same file again still fires.
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (error) {
      openSnackbar("error", error);
      return;
    }

    setStaged(
      files.map(file => ({
        file,
        // Prefilled, not blank: the name is required, and the filename is
        // almost always the right starting point.
        name: defaultGuideName(file.name),
        description: "",
      }))
    );
  };

  const updateStaged = (index, patch) => {
    setStaged(previous =>
      previous.map((entry, position) =>
        position === index ? { ...entry, ...patch } : entry
      )
    );
  };

  const removeStaged = index => {
    setStaged(previous => previous.filter((entry, position) => position !== index));
  };

  const handleUpload = async () => {
    if (staged.length === 0) {
      return;
    }

    const missingName = findGuideMissingName(staged);
    if (missingName) {
      openSnackbar("error", `Give ${missingName.file.name} a name before uploading.`);
      return;
    }

    setUploading(true);
    setUploadPercent(0);

    try {
      const formData = buildGuideUploadFormData({
        files: staged.map(entry => entry.file),
        folderId: uploadFolder === NO_FOLDER ? null : uploadFolder,
        meta: staged.map(entry => ({
          name: entry.name,
          description: entry.description,
        })),
      });

      await axiosPrivate.post("/material/guides/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        // A 100MB video takes long enough that a spinner alone reads as a hang.
        onUploadProgress: event => {
          if (event.total) {
            setUploadPercent(Math.round((event.loaded * 100) / event.total));
          }
        },
      });

      openSnackbar(
        "success",
        staged.length === 1 ? "Guide uploaded." : `${staged.length} guides uploaded.`
      );
      setStaged([]);
      setUploadFolder(NO_FOLDER);
      await loadGuides();
    } catch (error) {
      openSnackbar(
        "error",
        error?.response?.data?.message || "Failed to upload guides."
      );
    } finally {
      setUploading(false);
      setUploadPercent(0);
    }
  };

  const handleSaveFolder = async () => {
    const name = (folderDialog?.name || "").trim();
    if (name === "") {
      openSnackbar("error", "Folder name is required.");
      return;
    }

    setFolderSaving(true);
    try {
      const payload = { name, description: folderDialog.description || "" };

      if (folderDialog.id) {
        await axiosPrivate.put(`/material/guides/folders/${folderDialog.id}`, payload);
        openSnackbar("success", "Folder updated.");
      } else {
        await axiosPrivate.post("/material/guides/folders", payload);
        openSnackbar("success", "Folder created.");
      }

      setFolderDialog(null);
      await loadGuides();
    } catch (error) {
      openSnackbar(
        "error",
        error?.response?.data?.message || "Failed to save folder."
      );
    } finally {
      setFolderSaving(false);
    }
  };

  const handleSaveGuide = async () => {
    if (String(guideDialog?.name || "").trim() === "") {
      openSnackbar("error", "Guide name is required.");
      return;
    }

    setGuideSaving(true);
    try {
      await axiosPrivate.put(`/material/guides/files/${guideDialog.id}`, {
        name: guideDialog.name || "",
        description: guideDialog.description || "",
        folderId: guideDialog.folderId === NO_FOLDER ? null : guideDialog.folderId,
      });
      openSnackbar("success", "Guide updated.");
      setGuideDialog(null);
      await loadGuides();
    } catch (error) {
      openSnackbar(
        "error",
        error?.response?.data?.message || "Failed to update guide."
      );
    } finally {
      setGuideSaving(false);
    }
  };

  const runConfirmedDelete = async () => {
    const target = confirm;
    setConfirm(null);
    if (!target) {
      return;
    }

    try {
      if (target.kind === "folder") {
        await axiosPrivate.delete(`/material/guides/folders/${target.id}`);
        openSnackbar("success", "Folder deleted. Its guides are now standalone.");
      } else {
        await axiosPrivate.delete(`/material/guides/files/${target.id}`);
        openSnackbar("success", "Guide deleted.");
      }
      await loadGuides();
    } catch (error) {
      openSnackbar("error", error?.response?.data?.message || "Failed to delete.");
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pb: { xs: 4, md: 6 } }}>
      <AdministratorBackLink />
      <PageHeader
        title="Guide Upload"
        subtitle="Upload the documents and videos shown on Materials > Dashboard"
        actions={
          <Button
            variant="outlined"
            startIcon={<CreateNewFolderIcon />}
            onClick={() => setFolderDialog({ id: null, name: "", description: "" })}
            sx={{ textTransform: "none", borderRadius: "10px" }}
          >
            New folder
          </Button>
        }
      />

      <SectionPaper>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Upload guides
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {GUIDE_SUPPORTED_FORMATS_TEXT}. {GUIDE_SIZE_LIMIT_TEXT}. A folder and the
          name and description of each guide are all optional.
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ mt: 2.5 }}
        >
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={handleBrowseClick}
            disabled={uploading}
            sx={{ textTransform: "none", borderRadius: "10px" }}
          >
            Choose files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept={GUIDE_ACCEPT_ATTRIBUTE}
            onChange={handleFileChange}
          />

          <TextField
            select
            size="small"
            label="Folder (optional)"
            value={uploadFolder}
            onChange={event => setUploadFolder(event.target.value)}
            disabled={uploading}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value={NO_FOLDER}>No folder — standalone</MenuItem>
            {(tree.folders || []).map(folder => (
              <MenuItem key={folder.id} value={folder.id}>
                {folder.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {staged.length > 0 && (
          <Stack spacing={2} sx={{ mt: 3 }}>
            {staged.map((entry, index) => (
              <Paper
                key={`${entry.file.name}-${index}`}
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "10px",
                  p: 2,
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <InsertDriveFileIcon fontSize="small" color="action" />
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {entry.file.name}
                    </Typography>
                    <Chip size="small" label={formatGuideSize(entry.file.size)} />
                  </Stack>
                  <Tooltip title="Remove from this upload">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => removeStaged(index)}
                        disabled={uploading}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    size="small"
                    fullWidth
                    required
                    label="Name"
                    placeholder={entry.file.name}
                    value={entry.name}
                    onChange={event => updateStaged(index, { name: event.target.value })}
                    disabled={uploading}
                    error={entry.name.trim() === ""}
                    helperText={entry.name.trim() === "" ? "Name is required" : " "}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="Description (optional)"
                    value={entry.description}
                    onChange={event =>
                      updateStaged(index, { description: event.target.value })
                    }
                    disabled={uploading}
                  />
                </Stack>
              </Paper>
            ))}

            {uploading && (
              <Box>
                <LinearProgress variant="determinate" value={uploadPercent} />
                <Typography variant="caption" color="text.secondary">
                  Uploading… {uploadPercent}%
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                onClick={() => setStaged([])}
                disabled={uploading}
                sx={{ textTransform: "none" }}
              >
                Clear
              </Button>
              <LoadingButton
                variant="contained"
                loading={uploading}
                onClick={handleUpload}
                sx={{ textTransform: "none", borderRadius: "10px" }}
              >
                Upload {staged.length} file{staged.length === 1 ? "" : "s"}
              </LoadingButton>
            </Stack>
          </Stack>
        )}
      </SectionPaper>

      <SectionPaper>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Uploaded guides
          </Typography>
          {loading && <CircularProgress size={20} />}
        </Stack>

        {!loading && (tree.folders || []).length === 0 && allGuides.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Nothing uploaded yet.
          </Typography>
        )}

        <Stack spacing={2} sx={{ mt: 2 }}>
          {(tree.folders || []).map(folder => (
            <Paper
              key={folder.id}
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "10px",
                p: 2,
              }}
            >
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={1}
              >
                {/* Clicking the folder's own details folds it away; the edit and
                    delete buttons beside it stop the event so they still act on
                    the folder rather than toggling it. */}
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                  onClick={() => toggleFolder(folder.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={!isCollapsed(folder.id)}
                  onKeyDown={event => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleFolder(folder.id);
                    }
                  }}
                  sx={{
                    minWidth: 0,
                    flexGrow: 1,
                    cursor: "pointer",
                    userSelect: "none",
                    borderRadius: "8px",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <IconButton size="small" tabIndex={-1} sx={{ mt: -0.5 }}>
                    {isCollapsed(folder.id) ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                  </IconButton>
                  <FolderIcon color="primary" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{folder.name}</Typography>
                    {folder.description && (
                      <Typography variant="body2" color="text.secondary">
                        {folder.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {(folder.files || []).length} guide
                      {(folder.files || []).length === 1 ? "" : "s"}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={0.5} onClick={event => event.stopPropagation()}>
                  <Tooltip title="Rename folder">
                    <IconButton
                      size="small"
                      onClick={() =>
                        setFolderDialog({
                          id: folder.id,
                          name: folder.name,
                          description: folder.description || "",
                        })
                      }
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete folder">
                    <IconButton
                      size="small"
                      onClick={() =>
                        setConfirm({
                          kind: "folder",
                          id: folder.id,
                          message: `Delete folder "${folder.name}"? The guides inside are kept and become standalone.`,
                        })
                      }
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              <Collapse in={!isCollapsed(folder.id)} timeout="auto" unmountOnExit>
                {(folder.files || []).length > 0 && <Divider sx={{ my: 1.5 }} />}

                <Stack spacing={1}>
                  {(folder.files || []).map(guide => (
                  <GuideRow
                    key={guide.id}
                    guide={guide}
                    onEdit={() =>
                      setGuideDialog({
                        id: guide.id,
                        name: guide.name || "",
                        description: guide.description || "",
                        folderId: guide.folderId ?? NO_FOLDER,
                      })
                    }
                    onDelete={() =>
                      setConfirm({
                        kind: "file",
                        id: guide.id,
                        message: `Delete "${guide.displayName}"? This removes the uploaded file.`,
                      })
                    }
                  />
                  ))}
                </Stack>
              </Collapse>
            </Paper>
          ))}

          {(tree.files || []).length > 0 && (
            <Paper
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "10px",
                p: 2,
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>Standalone guides</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1}>
                {(tree.files || []).map(guide => (
                  <GuideRow
                    key={guide.id}
                    guide={guide}
                    onEdit={() =>
                      setGuideDialog({
                        id: guide.id,
                        name: guide.name || "",
                        description: guide.description || "",
                        folderId: guide.folderId ?? NO_FOLDER,
                      })
                    }
                    onDelete={() =>
                      setConfirm({
                        kind: "file",
                        id: guide.id,
                        message: `Delete "${guide.displayName}"? This removes the uploaded file.`,
                      })
                    }
                  />
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      </SectionPaper>

      <Dialog
        open={Boolean(folderDialog)}
        onClose={() => (folderSaving ? null : setFolderDialog(null))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {folderDialog?.id ? "Rename folder" : "New folder"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Folder name"
              value={folderDialog?.name || ""}
              onChange={event =>
                setFolderDialog(previous => ({ ...previous, name: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Description (optional)"
              value={folderDialog?.description || ""}
              onChange={event =>
                setFolderDialog(previous => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setFolderDialog(null)}
            disabled={folderSaving}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            loading={folderSaving}
            onClick={handleSaveFolder}
            sx={{ textTransform: "none" }}
          >
            Save
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(guideDialog)}
        onClose={() => (guideSaving ? null : setGuideDialog(null))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Edit guide</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              required
              label="Name"
              error={String(guideDialog?.name || "").trim() === ""}
              helperText={
                String(guideDialog?.name || "").trim() === "" ? "Name is required" : " "
              }
              value={guideDialog?.name || ""}
              onChange={event =>
                setGuideDialog(previous => ({ ...previous, name: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Description (optional)"
              value={guideDialog?.description || ""}
              onChange={event =>
                setGuideDialog(previous => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              select
              label="Folder"
              value={guideDialog?.folderId ?? NO_FOLDER}
              onChange={event =>
                setGuideDialog(previous => ({ ...previous, folderId: event.target.value }))
              }
              fullWidth
            >
              <MenuItem value={NO_FOLDER}>No folder — standalone</MenuItem>
              {(tree.folders || []).map(folder => (
                <MenuItem key={folder.id} value={folder.id}>
                  {folder.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setGuideDialog(null)}
            disabled={guideSaving}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            loading={guideSaving}
            onClick={handleSaveGuide}
            sx={{ textTransform: "none" }}
          >
            Save
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Please confirm</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{confirm?.message || ""}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(null)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={runConfirmedDelete}
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function GuideRow({ guide, onEdit, onDelete }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{ pl: { xs: 0, sm: 1 } }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        <InsertDriveFileIcon fontSize="small" color="action" />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {guide.displayName}
          </Typography>
          {guide.description && (
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {guide.description}
            </Typography>
          )}
        </Box>
        <Chip size="small" label={formatGuideSize(guide.sizeBytes)} />
      </Stack>

      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Edit name, description or folder">
          <IconButton size="small" onClick={onEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete guide">
          <IconButton size="small" onClick={onDelete}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
