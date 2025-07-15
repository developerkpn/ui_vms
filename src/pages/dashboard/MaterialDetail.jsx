import {
  ArrowBack,
  ArrowDownward,
  ArrowUpward,
  AttachFile,
  CheckCircle,
  CheckCircleOutline,
  Close,
  Delete,
  Edit,
  Image,
  InsertDriveFile,
  PictureAsPdf,
  Visibility,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Pagination,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import SearchFieldComp from "src/components/common/SearchFieldComp";
import TableSimple from "src/components/table/TableSimple";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import usePaginationStore from "src/store/usePaginationStore";

export default function Materials() {
  const { subgroupId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const { groupName, groupCode, groupId, subgroupName, subgroupCode } = location.state || {};

  const [searchQuery, setSearchQuery] = useState("");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Use Zustand store for pagination
  const materialPage = usePaginationStore(state => state.materialPage);
  const materialPageSize = usePaginationStore(state => state.materialPageSize);
  const setMaterialPage = usePaginationStore(state => state.setMaterialPage);
  const setMaterialPageSize = usePaginationStore(state => state.setMaterialPageSize);

  const [pagination, setPagination] = useState({
    page: materialPage,
    pageSize: materialPageSize,
    totalCount: 0,
    totalPages: 0,
  });
  const [attachmentsDialogOpen, setAttachmentsDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [aliasDialogOpen, setAliasDialogOpen] = useState(false);
  const [aliases, setAliases] = useState({
    alias1: "",
    alias2: "",
    alias3: "",
  });
  const [aliasLoading, setAliasLoading] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [deleteAttachmentDialogOpen, setDeleteAttachmentDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [sortField, setSortField] = useState("code");
  const [sortOrder, setSortOrder] = useState("asc");
  const [deleteMaterialDialogOpen, setDeleteMaterialDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);

  // Fetch materials on component mount
  useEffect(() => {
    if (subgroupId) {
      fetchMaterials();
    }
  }, [subgroupId, pagination.page, searchQuery, sortField, sortOrder]);

  // Sync Zustand store when page/pageSize changes
  useEffect(() => {
    setMaterialPage(pagination.page);
    setMaterialPageSize(pagination.pageSize);
  }, [pagination.page, pagination.pageSize]);

  // When store changes (e.g. after navigating back), update local state
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: materialPage, pageSize: materialPageSize }));
  }, [materialPage, materialPageSize]);

  // Fetch materials
  const fetchMaterials = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/material/subgroups/${subgroupId}/materials?page=${pagination.page}&pageSize=${pagination.pageSize}`;
      if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}`;
      }
      if (sortField) {
        url += `&sort=${sortField}`;
      }
      if (sortOrder) {
        url += `&order=${sortOrder}`;
      }
      const response = await axiosPrivate.get(url);
      setMaterials(response.data.data || []);
      setPagination({
        ...pagination,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      setError("Failed to load materials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show snackbar message
  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Handle search input change
  const handleSearchChange = value => {
    setSearchQuery(value);
    setPagination({ ...pagination, page: 1 }); // Reset to first page on new search
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    setMaterials([]);
  };

  // Optionally, add a handler for page size change if your TableSimple supports it
  // const handlePageSizeChange = (newSize) => {
  //   setPagination(prev => ({ ...prev, pageSize: newSize, page: 1 }));
  // };

  // Open attachments dialog
  const handleOpenAttachmentsDialog = async material => {
    setLoading(true);
    setSelectedMaterial(material);
    setAttachmentsDialogOpen(true);

    try {
      // Get the latest attachments
      const attachmentsResponse = await axiosPrivate.get(`/material/${material.id}/attachments`);

      // Update the selected material with fresh attachments
      setSelectedMaterial({
        ...material,
        attachments: attachmentsResponse.data.data || [],
      });
    } catch (error) {
      console.error("Error fetching attachments:", error);
      // Keep using the attachments from the material object if fetch fails
    } finally {
      setLoading(false);
    }
  };

  // Close attachments dialog
  const handleCloseAttachmentsDialog = () => {
    setAttachmentsDialogOpen(false);
    setSelectedMaterial(null);
    setUploadFiles([]);
    setError(null);
  };

  // Handle file selection
  const handleFileSelect = event => {
    if (!selectedMaterial) return;

    const files = Array.from(event.target.files);
    const currentAttachmentCount = selectedMaterial.attachments
      ? selectedMaterial.attachments.length
      : 0;
    const MAX_ATTACHMENTS = 3;
    const availableSlots = MAX_ATTACHMENTS - currentAttachmentCount;

    if (files.length > availableSlots) {
      showSnackbar(
        `Can only add ${availableSlots} more attachment(s). Maximum of ${MAX_ATTACHMENTS} attachments allowed per material.`,
        "warning"
      );
      // Take only the first N files where N is the available slots
      setUploadFiles(files.slice(0, availableSlots));
    } else {
      setUploadFiles(files);
    }
  };

  // Trigger file input click
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  // Upload attachments
  const handleUploadAttachments = async () => {
    if (!selectedMaterial || uploadFiles.length === 0) return;

    setUploadLoading(true);
    setError(null); // Clear any previous errors

    try {
      const formData = new FormData();
      uploadFiles.forEach(file => {
        formData.append("files", file);
      });

      await axiosPrivate.post(`/material/${selectedMaterial.id}/attachments`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Clear the selected files after successful upload
      setUploadFiles([]);

      // Fetch the updated material details and attachments separately
      try {
        // Get the material details
        const materialResponse = await axiosPrivate.get(`/material/${selectedMaterial.id}`);

        // Get the attachments using the dedicated endpoint
        const attachmentsResponse = await axiosPrivate.get(
          `/material/${selectedMaterial.id}/attachments`
        );

        // Create a complete updated material object with the latest attachments
        const updatedMaterial = {
          ...materialResponse.data.data,
          attachments: attachmentsResponse.data.data || [],
        };

        // Update the selected material with all details including fresh attachments
        setSelectedMaterial(updatedMaterial);
      } catch (fetchError) {
        console.error("Error fetching updated material:", fetchError);
        // Even if refresh fails, show a success message for the upload
        setError(
          "Upload successful, but couldn't refresh attachment list. Please close and reopen."
        );
      }

      showSnackbar("Attachments uploaded successfully");

      // Refresh the materials list
      fetchMaterials();
    } catch (error) {
      console.error("Failed to upload attachments:", error);
      let errorMessage = "Failed to upload attachments. Please try again.";

      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
      showSnackbar(errorMessage, "error");
    } finally {
      setUploadLoading(false);
    }
  };

  // Open alias dialog
  const handleOpenAliasDialog = material => {
    setSelectedMaterial(material);
    setAliases({
      alias1: material.alias1 || "",
      alias2: material.alias2 || "",
      alias3: material.alias3 || "",
    });
    setAliasDialogOpen(true);
  };

  // Close alias dialog
  const handleCloseAliasDialog = () => {
    setAliasDialogOpen(false);
    setSelectedMaterial(null);
  };

  // Handle alias change
  const handleAliasChange = event => {
    const { name, value } = event.target;
    setAliases(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Update aliases
  const handleUpdateAliases = async () => {
    if (!selectedMaterial) return;

    setAliasLoading(true);
    try {
      await axiosPrivate.put(`/material/${selectedMaterial.id}/aliases`, aliases);

      // Refresh material data after update
      fetchMaterials();
      showSnackbar("Aliases updated successfully");
      handleCloseAliasDialog();
    } catch (error) {
      console.error("Failed to update aliases:", error);
      showSnackbar("Failed to update aliases", "error");
    } finally {
      setAliasLoading(false);
    }
  };

  // Get icon for file type
  const getFileIcon = fileType => {
    if (!fileType) return <InsertDriveFile />;

    const type = fileType.toLowerCase();

    if (type.includes("pdf")) return <PictureAsPdf color="error" />;
    if (
      type.includes("jpg") ||
      type.includes("jpeg") ||
      type.includes("png") ||
      type.includes("gif") ||
      type.includes("image")
    )
      return <Image color="primary" />;

    return <InsertDriveFile />;
  };

  // Open attachment in a preview modal
  const handleViewAttachment = attachment => {
    // Create a URL to the file using the new streaming endpoint
    const fileUrl = `${import.meta.env.VITE_URL_LOC}/material/file/${attachment.attachment}`;

    // Set the file to preview and open the modal
    setPreviewFile({
      url: fileUrl,
      name: attachment.attachment,
      type: attachment.type || attachment.fileType || "application/octet-stream",
    });
    setPreviewModalOpen(true);
  };

  // Add a function to handle attachment deletion
  const handleDeleteAttachment = async attachment => {
    if (!attachment || !attachment.id) return;

    setAttachmentToDelete(attachment);
    setDeleteAttachmentDialogOpen(true);
  };

  // Confirm attachment deletion
  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete || !attachmentToDelete.id) return;

    setUploadLoading(true);
    setError(null);

    try {
      await axiosPrivate.delete(`/material/attachments/${attachmentToDelete.id}`);

      // Update the selected material by removing the deleted attachment
      if (selectedMaterial && selectedMaterial.attachments) {
        const updatedAttachments = selectedMaterial.attachments.filter(
          a => a.id !== attachmentToDelete.id
        );

        setSelectedMaterial({
          ...selectedMaterial,
          attachments: updatedAttachments,
        });
      }

      // Refresh the materials list to show updated attachment count
      fetchMaterials();

      showSnackbar("Attachment deleted successfully");
    } catch (error) {
      console.error("Failed to delete attachment:", error);
      let errorMessage = "Failed to delete attachment. Please try again.";

      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
      showSnackbar(errorMessage, "error");
    } finally {
      setUploadLoading(false);
      setDeleteAttachmentDialogOpen(false);
      setAttachmentToDelete(null);
    }
  };

  // Cancel delete operation
  const cancelDeleteAttachment = () => {
    setDeleteAttachmentDialogOpen(false);
    setAttachmentToDelete(null);
  };

  // Remove file from upload list
  const handleRemoveUploadFile = index => {
    setUploadFiles(prevFiles => {
      const newFiles = [...prevFiles];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Code column header with sort arrow
  const handleSortCode = () => {
    setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    setSortField("code");
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle delete material button click
  const handleDeleteMaterial = material => {
    setMaterialToDelete(material);
    setDeleteMaterialDialogOpen(true);
  };

  // Confirm delete material
  const confirmDeleteMaterial = async () => {
    if (!materialToDelete || !materialToDelete.id) return;
    setLoading(true);
    setError(null);
    try {
      await axiosPrivate.delete(`/material/${materialToDelete.id}`);
      showSnackbar("Material deleted successfully");
      // Refresh materials list
      fetchMaterials();
    } catch (error) {
      let errorMessage = "Failed to delete material. Please try again.";
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      setError(errorMessage);
      showSnackbar(errorMessage, "error");
    } finally {
      setLoading(false);
      setDeleteMaterialDialogOpen(false);
      setMaterialToDelete(null);
    }
  };

  const cancelDeleteMaterial = () => {
    setDeleteMaterialDialogOpen(false);
    setMaterialToDelete(null);
  };

  // Table columns definition
  const columns = [
    {
      header: (
        <Box
          sx={{ display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}
          onClick={handleSortCode}
        >
          Code
          {sortField === "code" &&
            (sortOrder === "asc" ? (
              <ArrowUpward fontSize="small" sx={{ ml: 0.5 }} />
            ) : (
              <ArrowDownward fontSize="small" sx={{ ml: 0.5 }} />
            ))}
        </Box>
      ),
      accessorKey: "code",
      cell: info => (
        <Box
          component="span"
          sx={{
            fontWeight: "medium",
          }}
        >
          {info.getValue()}
        </Box>
      ),
    },
    {
      header: "Material Name",
      accessorKey: "name",
      cell: info => (
        <Box
          component="span"
          sx={{
            fontWeight: "medium",
          }}
        >
          {info.getValue()}
        </Box>
      ),
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: info => {
        const description = info.getValue();
        return (
          <Box
            component="span"
            sx={{
              color: description ? "text.primary" : "text.secondary",
              fontStyle: description ? "normal" : "italic",
            }}
          >
            {description || "No description"}
          </Box>
        );
      },
    },
    {
      header: "UOM",
      accessorKey: "unit_of_measurement",
      cell: info => {
        const uom = info.getValue();
        return (
          <Box
            component="span"
            sx={{
              color: uom ? "text.primary" : "text.secondary",
              fontStyle: uom ? "normal" : "italic",
            }}
          >
            {uom || "N/A"}
          </Box>
        );
      },
    },
    {
      header: "Aliases",
      accessorKey: "alias1",
      cell: info => {
        const row = info.row.original;
        const aliases = [row.alias1, row.alias2, row.alias3].filter(Boolean);
        return (
          <Box
            component="span"
            sx={{
              color: aliases.length > 0 ? "text.primary" : "text.secondary",
              fontStyle: aliases.length > 0 ? "normal" : "italic",
            }}
          >
            {aliases.length > 0 ? aliases.join(", ") : "No aliases"}
          </Box>
        );
      },
    },
    {
      header: "Attachments",
      accessorKey: "attachments",
      cell: info => {
        const row = info.row.original;
        const attachmentsCount = row.attachments ? row.attachments.length : 0;
        const MAX_ATTACHMENTS = 3;

        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {[...Array(MAX_ATTACHMENTS)].map((_, index) => (
              <Box key={index} sx={{ mx: 0.25 }}>
                {index < attachmentsCount ? (
                  <CheckCircle color="success" fontSize="small" />
                ) : (
                  <CheckCircleOutline color="disabled" fontSize="small" />
                )}
              </Box>
            ))}
            <Typography variant="body2" sx={{ ml: 1 }}>
              {attachmentsCount}/{MAX_ATTACHMENTS}
            </Typography>
          </Box>
        );
      },
    },
    {
      header: "Actions",
      id: "actions",
      cell: info => {
        const row = info.row.original;
        return (
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => handleOpenAttachmentsDialog(row)}
              color="primary"
              title="View/Upload Attachments"
            >
              <AttachFile fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleOpenAliasDialog(row)}
              color="secondary"
              title="Edit Aliases"
            >
              <Edit fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDeleteMaterial(row)}
              color="error"
              title={row.dfFromClient ? "Already deleted" : "Delete Material"}
              disabled={row.dfFromClient}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  if (!subgroupId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error: No subgroup ID provided</Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate("/dashboard/materials/lookup")}
          sx={{ mt: 2 }}
        >
          Back to Groups
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {/* Breadcrumbs navigation */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          component={RouterLink}
          to="/dashboard/materials/lookup"
          underline="hover"
          color="text.primary"
          sx={{ fontWeight: "medium", color: "primary.main" }}
        >
          Material Groups
        </Link>
        <Link
          component={RouterLink}
          to={`/dashboard/subgroups/${groupId}`}
          state={{ groupName, groupCode }}
          underline="hover"
          color="text.primary"
          sx={{ fontWeight: "medium", color: "primary.main" }}
        >
          {groupCode && groupName ? `${groupCode} - ${groupName}` : "Subgroups"}
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: "bold" }}>
          {subgroupCode && subgroupName ? `${subgroupCode} - ${subgroupName}` : "Materials"}
        </Typography>
      </Breadcrumbs>

      {/* Header section */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box sx={{ flexGrow: 1, mr: 2 }}>
          <SearchFieldComp setQuery={handleSearchChange} placeholder="Search materials..." />
        </Box>
      </Box>

      {/* Main content area */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {materials.length > 0 ? (
          <>
            <TableSimple
              columns={columns}
              rowsData={materials}
              sx={{
                height: "100%",
                width: "100%",
              }}
            />
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                py: 2,
                gap: 2,
                alignItems: "center",
              }}
            >
              <Pagination
                count={Math.max(1, pagination.totalPages)}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                disabled={pagination.totalPages <= 1}
                size="large"
              />
            </Box>
          </>
        ) : (
          <Paper
            elevation={1}
            sx={{
              p: 3,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              backgroundColor: "background.default",
            }}
          >
            <Typography variant="body1" color="text.secondary">
              {loading ? (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading materials...
                </Box>
              ) : (
                "No materials found in this subgroup."
              )}
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Attachments Dialog */}
      <Dialog
        open={attachmentsDialogOpen}
        onClose={handleCloseAttachmentsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">
              Attachments for {selectedMaterial?.name || "Material"}
            </Typography>
            <IconButton onClick={handleCloseAttachmentsDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {selectedMaterial && (
            <>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
                <Typography variant="body1">
                  Upload new attachments. Supported formats: PDF, DOC, DOCX, PNG, JPG, JPEG.
                  <Box component="span" sx={{ fontWeight: "bold", color: "primary.main", ml: 1 }}>
                    Maximum 3 attachments allowed per material.
                  </Box>
                </Typography>

                {/* Display current attachment count and slots available */}
                <Typography variant="body2" color="text.secondary">
                  Current attachments:{" "}
                  {selectedMaterial.attachments ? selectedMaterial.attachments.length : 0}/3
                  {selectedMaterial.attachments && selectedMaterial.attachments.length >= 3 && (
                    <Box component="span" sx={{ color: "error.main", ml: 1 }}>
                      Maximum limit reached. Delete an attachment to upload a new one.
                    </Box>
                  )}
                </Typography>

                {/* Only show upload controls if below the limit */}
                {(!selectedMaterial.attachments || selectedMaterial.attachments.length < 3) && (
                  <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Button variant="outlined" onClick={handleBrowseClick}>
                        Browse Files
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        multiple
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      />
                      <Typography variant="body2">
                        {uploadFiles.length > 0
                          ? `${uploadFiles.length} file(s) selected`
                          : "No files selected"}
                      </Typography>
                      {uploadFiles.length > 0 && (
                        <Button
                          variant="contained"
                          onClick={handleUploadAttachments}
                          disabled={uploadLoading}
                        >
                          {uploadLoading ? "Uploading..." : "Upload"}
                        </Button>
                      )}
                    </Box>
                    {uploadFiles.length > 0 && (
                      <List dense>
                        {uploadFiles.map((file, index) => (
                          <ListItem
                            key={index}
                            secondaryAction={
                              <IconButton
                                edge="end"
                                onClick={() => handleRemoveUploadFile(index)}
                                title="Remove file"
                                color="error"
                                size="small"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            }
                          >
                            <ListItemIcon>{getFileIcon(file.type)}</ListItemIcon>
                            <ListItemText
                              primary={file.name}
                              secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </>
                )}
                <Divider />
              </Box>

              {error && (
                <Box sx={{ mb: 2 }}>
                  <Typography color="error" variant="body2">
                    {error}
                  </Typography>
                </Box>
              )}

              <Typography variant="h6" sx={{ mb: 1 }}>
                Existing Attachments
              </Typography>
              {selectedMaterial.attachments && selectedMaterial.attachments.length > 0 ? (
                <List>
                  {selectedMaterial.attachments.map((attachment, index) => (
                    <ListItem
                      key={attachment.id || index}
                      secondaryAction={
                        <Box sx={{ display: "flex" }}>
                          <IconButton
                            edge="end"
                            onClick={() => handleViewAttachment(attachment)}
                            title="Preview file"
                            sx={{ mr: 1 }}
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteAttachment(attachment)}
                            title="Delete attachment"
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        {getFileIcon(attachment.type || attachment.fileType)}
                      </ListItemIcon>
                      <ListItemText
                        primary={attachment.attachment}
                        secondary={attachment.type || attachment.fileType || "Unknown file type"}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No attachments available for this material.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAttachmentsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Alias Edit Dialog */}
      <Dialog open={aliasDialogOpen} onClose={handleCloseAliasDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">
              Edit Aliases for {selectedMaterial?.name || "Material"}
            </Typography>
            <IconButton onClick={handleCloseAliasDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Alias 1"
              name="alias1"
              fullWidth
              value={aliases.alias1}
              onChange={handleAliasChange}
            />
            <TextField
              label="Alias 2"
              name="alias2"
              fullWidth
              value={aliases.alias2}
              onChange={handleAliasChange}
            />
            <TextField
              label="Alias 3"
              name="alias3"
              fullWidth
              value={aliases.alias3}
              onChange={handleAliasChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleUpdateAliases} disabled={aliasLoading}>
            {aliasLoading ? <CircularProgress size={24} /> : "Save Changes"}
          </Button>
          <Button onClick={handleCloseAliasDialog}>Cancel</Button>
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
              <img
                src={previewFile.url}
                alt={previewFile.name}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
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
            disabled={!previewFile}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Attachment Confirmation Dialog */}
      <Dialog open={deleteAttachmentDialogOpen} onClose={cancelDeleteAttachment} maxWidth="sm">
        <DialogTitle>Confirm Attachment Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body1">Are you sure you want to delete this attachment?</Typography>
          {attachmentToDelete && (
            <Typography variant="body2" sx={{ mt: 1, fontWeight: "medium" }}>
              {attachmentToDelete.attachment}
            </Typography>
          )}
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteAttachment} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeleteAttachment} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Material Confirmation Dialog */}
      <Dialog open={deleteMaterialDialogOpen} onClose={cancelDeleteMaterial} maxWidth="sm">
        <DialogTitle>Confirm Material Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body1">Are you sure you want to delete this material?</Typography>
          {materialToDelete && (
            <Typography variant="body2" sx={{ mt: 1, fontWeight: "medium" }}>
              {materialToDelete.code} - {materialToDelete.name}
            </Typography>
          )}
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteMaterial} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeleteMaterial} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
