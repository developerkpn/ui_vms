import {
  CheckCircle,
  CheckCircleOutline,
  Close,
  Delete,
  Download,
  Edit,
  Image,
  InsertDriveFile,
  PictureAsPdf,
  Upload,
  Visibility,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
  MenuItem,
  Pagination,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import { debounce } from "lodash";
import moment from "moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SearchFieldComp from "src/components/common/SearchFieldComp";
import TooltipButton from "src/components/common/TooltipButton";
import TableSorting from "src/components/table/TableSorting";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";

const columnHelper = createColumnHelper();

export default function SearchMaterials() {
  const axiosPrivate = useAxiosPrivate();
  const [searchQuery, setSearchQuery] = useState("");
  const [materials, setMaterials] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [subGroups, setSubGroups] = useState([]);
  const [selectedSubGroup, setSelectedSubGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 5,
    totalCount: 0,
    totalPages: 0,
  });
  const [sorting, setSorting] = useState([]);
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
  const controllerRef = useRef();
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [deleteAttachmentDialogOpen, setDeleteAttachmentDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [deleteMaterialDialogOpen, setDeleteMaterialDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Fetch groups on component mount
  useEffect(() => {
    fetchGroups();
  }, []);

  // Fetch groups
  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get("/material/groups/dropdown");
      const groupsData = response.data.data || [];
      setGroups(groupsData);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
      setError("Failed to load material groups. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch subgroups when a group is selected
  useEffect(() => {
    if (selectedGroup) {
      fetchSubGroups(selectedGroup);
    } else {
      setSubGroups([]);
      setSelectedSubGroup("");
    }
  }, [selectedGroup]);

  // Fetch initial materials and when search or filters change
  useEffect(() => {
    // Reset pagination when filters change
    setPagination(prev => ({
      ...prev,
      page: 1,
    }));

    fetchMaterials(1, sorting);
  }, [selectedSubGroup, selectedGroup, searchQuery, sorting]);

  const fetchMaterials = (page = 1) => {
    if (searchQuery) {
      searchMaterials(searchQuery, page, sorting);
    } else if (selectedGroup && selectedSubGroup) {
      fetchMaterialsBySubGroup(selectedSubGroup, page, sorting);
    } else if (selectedGroup) {
      fetchMaterialsByGroup(selectedGroup, page, sorting);
    } else {
      searchMaterials("", page, sorting); // Call with empty string to get all materials
    }
  };

  console.log(materials, "materials");

  // Search materials using the search endpoint
  const searchMaterials = useCallback(
    debounce(async (term, page = 1, sorting) => {
      setLoading(true);
      setError(null);
      try {
        // Abort previous request if exists
        if (controllerRef.current) {
          controllerRef.current.abort();
        }
        controllerRef.current = new AbortController();
        const signal = controllerRef.current.signal;
        const URLSearch = new URLSearchParams();
        // Build the URL with or without search term
        let url = `/material/search/all?page=${page}&pageSize=${pagination.pageSize}`;
        if (term && term.trim() !== "") {
          const encodedSearchTerm = encodeURIComponent(term.trim());
          url += `&q=${encodedSearchTerm}`;
        }
        console.log(sorting);
        if (sorting.length > 0) {
          for (const sort of sorting) {
            let state = sort.desc ? "desc" : "asc";
            URLSearch.append(sort.id, state);
          }
          url += "&" + URLSearch.toString();
        }
        const response = await axiosPrivate.get(url, { signal });
        setMaterials(response.data.data || []);
        setPagination(prev => ({
          ...prev,
          totalCount: response.data.pagination.totalCount,
          totalPages: response.data.pagination.totalPages,
        }));
      } catch (error) {
        if (error.code === "ERR_CANCELED") {
          // Request was aborted, do not set error
          console.log("Request was aborted", error);
          return;
        }
        console.error("Search failed:", error);
        setMaterials([]);
        setError("Failed to load materials. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 500),
    [pagination.pageSize, axiosPrivate]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    console.log(sorting);
  }, [sorting]);

  // Fetch subgroups
  const fetchSubGroups = async groupId => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get(`/material/subgroups/${groupId}/dropdown`);
      setSubGroups(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch subgroups:", error);
      setError("Failed to load subgroups. Please try again.");
      setSubGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch materials by group
  const fetchMaterialsByGroup = async (groupId, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get(
        `/material/groups/${groupId}/materials?page=${page}&pageSize=${pagination.pageSize}`
      );
      setMaterials(response.data.data || []);

      setPagination(prev => ({
        ...prev,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      }));
    } catch (error) {
      console.error("Failed to fetch materials by group:", error);
      setError("Failed to load materials. Please try again.");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch materials by subgroup
  const fetchMaterialsBySubGroup = async (subGroupId, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get(
        `/material/subgroups/${subGroupId}/materials?page=${page}&pageSize=${pagination.pageSize}`
      );
      setMaterials(response.data.data || []);

      setPagination(prev => ({
        ...prev,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      }));
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      setError("Failed to load materials. Please try again.");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (_event, newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage,
    }));

    // for better UX, clear the materials list when page changes
    setMaterials([]);

    fetchMaterials(newPage);
  };

  const handleSearchChange = value => {
    setSearchQuery(value);
  };

  const handleGroupSelect = groupId => {
    setSelectedGroup(groupId);
    setSelectedSubGroup("");
  };

  const handleSubGroupSelect = subGroupId => {
    setSelectedSubGroup(subGroupId);
  };

  const handleClearGroup = () => {
    setSelectedGroup("");
    setSelectedSubGroup("");
  };

  const handleClearSubgroup = () => {
    setSelectedSubGroup("");
  };

  const handleOpenAttachmentsDialog = async material => {
    setLoading(true);
    setSelectedMaterial(material);
    setAttachmentsDialogOpen(true);

    try {
      const attachmentsResponse = await axiosPrivate.get(`/material/${material.id}/attachments`);

      setSelectedMaterial({
        ...material,
        attachments: attachmentsResponse.data.data || [],
      });
    } catch (error) {
      console.error("Error fetching attachments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAttachmentsDialog = () => {
    setAttachmentsDialogOpen(false);
    setSelectedMaterial(null);
  };

  const handleFileSelect = event => {
    setUploadFiles(Array.from(event.target.files));
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const handleUploadAttachments = async () => {
    if (!selectedMaterial || uploadFiles.length === 0) return;

    setUploadLoading(true);
    setError(null);

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

      setUploadFiles([]);

      try {
        const materialResponse = await axiosPrivate.get(`/material/${selectedMaterial.id}`);

        const attachmentsResponse = await axiosPrivate.get(
          `/material/${selectedMaterial.id}/attachments`
        );

        const updatedMaterial = {
          ...materialResponse.data.data,
          attachments: attachmentsResponse.data.data || [],
        };

        setSelectedMaterial(updatedMaterial);
      } catch (fetchError) {
        console.error("Error fetching updated material:", fetchError);
        setError(
          "Upload successful, but couldn't refresh attachment list. Please close and reopen."
        );
      }

      fetchMaterials(pagination.page);
      showSnackbar("Attachments uploaded successfully");
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

  const handleOpenAliasDialog = material => {
    setSelectedMaterial(material);
    setAliases({
      alias1: material.alias1 || "",
      alias2: material.alias2 || "",
      alias3: material.alias3 || "",
    });
    setAliasDialogOpen(true);
  };

  const handleCloseAliasDialog = () => {
    setAliasDialogOpen(false);
    setSelectedMaterial(null);
  };

  const handleAliasChange = event => {
    const { name, value } = event.target;
    setAliases(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateAliases = async () => {
    if (!selectedMaterial) return;

    setAliasLoading(true);
    try {
      await axiosPrivate.put(`/material/${selectedMaterial.id}/aliases`, aliases);

      fetchMaterials(pagination.page);
      showSnackbar("Aliases updated successfully");
      handleCloseAliasDialog();
    } catch (error) {
      console.error("Failed to update aliases:", error);
      const errorMessage = "Failed to update aliases. Please try again.";
      setError(errorMessage);
      showSnackbar(errorMessage, "error");
    } finally {
      setAliasLoading(false);
    }
  };

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

  const handleViewAttachment = attachment => {
    const fileUrl = `${import.meta.env.VITE_URL_LOC}/material/file/${attachment.attachment}`;

    setPreviewFile({
      url: fileUrl,
      name: attachment.attachment,
      type: attachment.type || attachment.fileType || "application/octet-stream",
    });
    setPreviewModalOpen(true);
  };

  // Show snackbar message
  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
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
      fetchMaterials(pagination.page);

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
      fetchMaterials(pagination.page);
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

  const columns = useMemo(
    () => [
      columnHelper.accessor("code", {
        header: "Code",
        enableSorting: false,
        cell: ({ getValue, row }) => {
          return getValue() || "-";
        },
      }),
      columnHelper.accessor("combined_description", {
        header: "Material Description",
        enableSorting: false,
        cell: ({ getValue, row }) => {
          const combinedDesc = getValue();
          if (combinedDesc) return combinedDesc;
          const description = row.original.description;
          const longText = row.original.long_text;

          if (description && longText) return `${description} - ${longText}`;
          if (description) return description;
          if (longText) return longText;

          return "-";
        },
      }),
      columnHelper.accessor(
        row => ({
          groupCode: row.groupCode,
          groupName: row.groupName,
        }),
        {
          id: "group",
          header: "Group",
          enableSorting: false,
          cell: ({ getValue }) => {
            const group = getValue();
            return group && group.groupCode && group.groupName
              ? `${group.groupCode} - ${group.groupName}`
              : "-";
          },
        }
      ),
      columnHelper.accessor("alias1", {
        header: "Alias",
        enableSorting: false,
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("unit_of_measurement", {
        header: "UOM",
        enableSorting: false,
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("dffromclient", {
        header: "Status",
        enableSorting: false,
        cell: ({ getValue }) => (getValue() ? "Deleted" : "Active"),
      }),
      columnHelper.accessor("created_by", {
        header: "Created By",
        enableSorting: false,
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("created_at", {
        header: "Created At",
        cell: ({ getValue }) => (getValue() ? moment(getValue()).format("YYYY-MM-DD") : "-"),
      }),
      columnHelper.accessor("updated_at", {
        header: "Updated At",
        cell: ({ getValue }) => (getValue() ? moment(getValue()).format("YYYY-MM-DD") : "-"),
      }),
      columnHelper.display({
        header: "Attachments",
        enableSorting: false,
        id: "attachments",
        cell: ({ row }) => {
          const attachmentsCount = row.original.attachments ? row.original.attachments.length : 0;
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
      }),
      columnHelper.display({
        header: "Actions",
        id: "actions",
        cell: ({ row }) => {
          const material = row.original;
          const hasAttachments = material.attachments && material.attachments.length > 0;
          return (
            <Box sx={{ display: "flex", gap: 1 }}>
              <TooltipButton
                Icon={<Visibility />}
                TooltipText={
                  hasAttachments
                    ? `View Attachments (${material.attachments.length})`
                    : "View & Upload Attachments"
                }
                OnClick={() => handleOpenAttachmentsDialog(material)}
                sx={!hasAttachments ? { opacity: 0.8 } : {}}
              />
              <TooltipButton
                Icon={<Edit />}
                TooltipText="Edit Aliases"
                OnClick={() => handleOpenAliasDialog(material)}
              />
              <TooltipButton
                Icon={<Delete color={material.dffromclient ? "disabled" : "error"} />}
                TooltipText={material.dffromclient ? "Already deleted" : "Delete Material"}
                OnClick={() => handleDeleteMaterial(material)}
                disabled={material.dffromclient}
              />
            </Box>
          );
        },
      }),
    ],
    []
  );

  // Determine if we should show "no results" message
  const showNoResultsMessage = () => {
    const hasFilters = searchQuery.trim() !== "" || selectedGroup !== "" || selectedSubGroup !== "";
    return hasFilters && !loading && materials.length === 0;
  };

  // Determine if we should show the table
  const showResultsTable = () => {
    return materials.length > 0;
  };

  // Download to Excel handler
  const handleDownloadExcel = async () => {
    setDownloadLoading(true);
    try {
      let url = "/material/export/materials";
      const params = [];
      if (selectedGroup) params.push(`groupId=${selectedGroup}`);
      if (selectedSubGroup) params.push(`subGroupId=${selectedSubGroup}`);
      if (searchQuery && searchQuery.trim() !== "")
        params.push(`q=${encodeURIComponent(searchQuery.trim())}`);
      if (params.length > 0) url += `?${params.join("&")}`;

      const response = await axiosPrivate.get(url, {
        responseType: "blob",
      });

      // Try to get filename from Content-Disposition header
      let filename = "materials.xlsx";
      const disposition = response.headers["content-disposition"];
      if (disposition) {
        // More robust regex, handles quotes and whitespace
        const match = disposition.match(/filename[^;=\n]*=((['\"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, "").trim();
        }
      }

      // Create a blob and trigger download
      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download Excel:", error);
      setError("Failed to download Excel file. Please try again.");
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
          {/* Download to Excel button */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <Button
              variant="contained"
              startIcon={
                downloadLoading ? <CircularProgress size={20} color="inherit" /> : <Download />
              }
              onClick={handleDownloadExcel}
              sx={{ minWidth: 180 }}
              disabled={downloadLoading}
            >
              {downloadLoading ? "Downloading..." : "Download to Excel"}
            </Button>
          </Box>

          {/* Search field */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <SearchFieldComp
              setQuery={handleSearchChange}
              placeholder="Search materials by name, code, description..."
            />
            {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}
          </Box>

          {/* Group selection */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={selectedGroup}
                displayEmpty
                onChange={e => handleGroupSelect(e.target.value)}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                    },
                  },
                }}
              >
                <MenuItem value="">
                  <em>Select Material Group</em>
                </MenuItem>
                {groups.map(group => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.code} - {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedGroup && (
              <Tooltip title="Clear group selection">
                <IconButton onClick={handleClearGroup} size="small" sx={{ ml: 1 }}>
                  <Close fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Subgroup selection */}
          {selectedGroup && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControl sx={{ minWidth: 200 }}>
                <Select
                  value={selectedSubGroup}
                  displayEmpty
                  onChange={e => handleSubGroupSelect(e.target.value)}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Select Subgroup</em>
                  </MenuItem>
                  {subGroups.map(subGroup => (
                    <MenuItem key={subGroup.id} value={subGroup.id}>
                      {subGroup.code} - {subGroup.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedSubGroup && (
                <Tooltip title="Clear subgroup selection">
                  <IconButton onClick={handleClearSubgroup} size="small" sx={{ ml: 1 }}>
                    <Close fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {showResultsTable() && (
          <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
            <Box sx={{ flexGrow: 1 }}>
              <TableSorting
                columns={columns}
                rowsData={materials}
                sx={{
                  height: "100%",
                  width: "100%",
                }}
                sorting={sorting}
                setSorting={setSorting}
              />
            </Box>
            {pagination.totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </Box>
        )}

        {!showResultsTable() && !loading && (
          <Typography variant="body1" color="text.secondary">
            {showNoResultsMessage()
              ? "No materials found. Try different search terms or filters."
              : "Loading materials..."}
          </Typography>
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
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Button variant="outlined" startIcon={<Upload />} onClick={handleBrowseClick}>
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
                      startIcon={uploadLoading ? <CircularProgress size={20} /> : <Upload />}
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
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={handleUpdateAliases}
            disabled={aliasLoading}
          >
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
