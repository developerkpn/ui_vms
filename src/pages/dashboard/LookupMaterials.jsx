import {
  Close,
  Edit,
  Image,
  InsertDriveFile,
  PictureAsPdf,
  Upload,
  Visibility,
} from "@mui/icons-material";
import {
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
  Tab,
  Tabs,
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
import TableSimple from "src/components/table/TableSimple";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";

const columnHelper = createColumnHelper();

export default function LookupMaterials() {
  const axiosPrivate = useAxiosPrivate();
  const [searchQuery, setSearchQuery] = useState("");
  const [materials, setMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [subGroups, setSubGroups] = useState([]);
  const [selectedSubGroup, setSelectedSubGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
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

  // Fetch groups on component mount
  useEffect(() => {
    fetchGroups();
  }, []);

  // Fetch groups
  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get("/material/groups");
      setGroups(response.data.data || []);
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

  // Fetch materials when a subgroup is selected
  useEffect(() => {
    if (selectedSubGroup) {
      fetchMaterialsBySubGroup(selectedSubGroup);
    } else if (selectedGroup && activeTab === 1) {
      fetchMaterialsByGroup(selectedGroup);
    } else if (activeTab === 1) {
      setMaterials([]);
    }
  }, [selectedSubGroup, selectedGroup]);

  // Fetch subgroups
  const fetchSubGroups = async groupId => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get(`/material/groups/${groupId}/subgroups`);
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
      setPagination({
        ...pagination,
        page,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      });
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
      setPagination({
        ...pagination,
        page,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      setError("Failed to load materials. Please try again.");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  // Search materials with debounce
  const debouncedSearch = useCallback(
    debounce(async (term, page = 1) => {
      if (!term || term.trim() === "") {
        setMaterials([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const encodedSearchTerm = encodeURIComponent(term.trim());
        const response = await axiosPrivate.get(
          `/material/search?q=${encodedSearchTerm}&page=${page}&pageSize=${pagination.pageSize}`
        );
        setMaterials(response.data.data || []);
        setPagination({
          ...pagination,
          page,
          totalCount: response.data.pagination.totalCount,
          totalPages: response.data.pagination.totalPages,
        });
      } catch (error) {
        console.error("Search failed:", error);
        setError("Search failed. Please try again.");
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    }, 500),
    [pagination.pageSize]
  );

  // Handle page change
  const handlePageChange = (event, newPage) => {
    if (activeTab === 0 && searchQuery) {
      debouncedSearch(searchQuery, newPage);
    } else if (activeTab === 1) {
      if (selectedSubGroup) {
        fetchMaterialsBySubGroup(selectedSubGroup, newPage);
      } else if (selectedGroup) {
        fetchMaterialsByGroup(selectedGroup, newPage);
      }
    }
  };

  // Handle search input change
  const handleSearchChange = value => {
    setSearchQuery(value);

    // Reset pagination to page 1 when search term changes
    setPagination({
      ...pagination,
      page: 1,
    });

    // Don't clear results immediately when typing, just start loading state
    if (value && value.trim() !== "") {
      setLoading(true);
    } else {
      setMaterials([]);
    }

    debouncedSearch(value, 1); // Reset to page 1
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchQuery("");
    setMaterials([]);

    if (newValue === 0) {
      // Reset selection when switching to search tab
      setSelectedGroup("");
      setSelectedSubGroup("");
    } else {
      // Fetch groups if needed when switching to browse tab
      if (groups.length === 0) {
        fetchGroups();
      }
    }
  };

  // Handle group selection
  const handleGroupSelect = groupId => {
    setSelectedGroup(groupId);
    setSelectedSubGroup(""); // Reset subgroup when group changes

    // Reset pagination to page 1
    setPagination({
      ...pagination,
      page: 1,
    });

    if (groupId === "") {
      setMaterials([]);
    }
  };

  // Handle subgroup selection
  const handleSubGroupSelect = subGroupId => {
    setSelectedSubGroup(subGroupId);

    // Reset pagination to page 1
    setPagination({
      ...pagination,
      page: 1,
    });
  };

  // Handle clear group
  const handleClearGroup = () => {
    setSelectedGroup("");
    setSelectedSubGroup("");
    setMaterials([]);
  };

  // Handle clear subgroup
  const handleClearSubgroup = () => {
    setSelectedSubGroup("");
    setMaterials([]);
  };

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
  };

  // Handle file selection
  const handleFileSelect = event => {
    setUploadFiles(Array.from(event.target.files));
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

      // Refresh the materials list in the background
      if (activeTab === 0 && searchQuery) {
        debouncedSearch(searchQuery, pagination.page);
      } else if (activeTab === 1) {
        if (selectedSubGroup) {
          fetchMaterialsBySubGroup(selectedSubGroup, pagination.page);
        } else if (selectedGroup) {
          fetchMaterialsByGroup(selectedGroup, pagination.page);
        }
      }
    } catch (error) {
      console.error("Failed to upload attachments:", error);
      let errorMessage = "Failed to upload attachments. Please try again.";

      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
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
      if (activeTab === 0 && searchQuery) {
        debouncedSearch(searchQuery, pagination.page);
      } else if (activeTab === 1) {
        if (selectedSubGroup) {
          fetchMaterialsBySubGroup(selectedSubGroup, pagination.page);
        } else if (selectedGroup) {
          fetchMaterialsByGroup(selectedGroup, pagination.page);
        }
      }

      handleCloseAliasDialog();
    } catch (error) {
      console.error("Failed to update aliases:", error);
      setError("Failed to update aliases. Please try again.");
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

  // Table columns
  const columns = useMemo(
    () => [
      columnHelper.accessor("fullCode", {
        header: "Code",
        cell: ({ getValue, row }) => {
          return getValue() || "-";
        },
      }),
      columnHelper.accessor("name", {
        header: "Material Name",
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor(
        row => ({
          groupCode: row.groupCode,
          groupName: row.groupName,
        }),
        {
          id: "group",
          header: "Group",
          cell: ({ getValue }) => {
            const group = getValue();
            return group && group.groupCode && group.groupName
              ? `${group.groupCode} - ${group.groupName}`
              : "-";
          },
        }
      ),
      columnHelper.accessor(
        row => ({
          subGroupCode: row.subGroupCode,
          subGroupName: row.subGroupName,
        }),
        {
          id: "subgroup",
          header: "Subgroup",
          cell: ({ getValue }) => {
            const subgroup = getValue();
            return subgroup && subgroup.subGroupCode && subgroup.subGroupName
              ? `${subgroup.subGroupCode} - ${subgroup.subGroupName}`
              : "-";
          },
        }
      ),
      columnHelper.accessor("created_at", {
        header: "Created At",
        cell: ({ getValue }) => (getValue() ? moment(getValue()).format("YYYY-MM-DD") : "-"),
      }),
      columnHelper.accessor("updated_at", {
        header: "Updated At",
        cell: ({ getValue }) => (getValue() ? moment(getValue()).format("YYYY-MM-DD") : "-"),
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
            </Box>
          );
        },
      }),
    ],
    []
  );

  // Determine if we should show "no results" message
  const showNoResultsMessage = () => {
    return searchQuery.trim() !== "" && !loading && materials.length === 0;
  };

  // Determine if we should show the table
  const showResultsTable = () => {
    return materials.length > 0;
  };

  // Determine if we should show the initial search prompt
  const showSearchPrompt = () => {
    return searchQuery.trim() === "" && !loading;
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
      <Box sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Search" />
          <Tab label="Browse by Category" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 3 }}>
            <SearchFieldComp
              setQuery={handleSearchChange}
              placeholder="Search materials by name, code, description..."
            />
            {loading && <CircularProgress size={24} />}
          </Box>

          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {showResultsTable() && (
            <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                <TableSimple
                  columns={columns}
                  rowsData={materials}
                  sx={{
                    height: "100%",
                    width: "100%",
                  }}
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

          {!showResultsTable() && (
            <Typography variant="body1" color="text.secondary">
              {showNoResultsMessage()
                ? "No materials found for your search. Try different keywords."
                : showSearchPrompt()
                ? "Enter a search term to find materials."
                : null}
            </Typography>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControl sx={{ minWidth: 200 }}>
                <Select
                  value={selectedGroup}
                  displayEmpty
                  onChange={e => handleGroupSelect(e.target.value)}
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

            {selectedGroup && (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <Select
                    value={selectedSubGroup}
                    displayEmpty
                    onChange={e => handleSubGroupSelect(e.target.value)}
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

            {loading && <CircularProgress size={24} />}
          </Box>

          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {materials.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                <TableSimple
                  columns={columns}
                  rowsData={materials}
                  sx={{
                    height: "100%",
                    width: "100%",
                  }}
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
          ) : (
            <Typography variant="body1" color="text.secondary">
              {selectedGroup && !loading
                ? selectedSubGroup
                  ? "No materials found in this subgroup."
                  : "No materials found in this group."
                : "Select a group to view materials. You can further filter by subgroup."}
            </Typography>
          )}
        </Box>
      )}

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
                      <ListItem key={index}>
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
                        <IconButton
                          edge="end"
                          onClick={() => handleViewAttachment(attachment)}
                          title="Preview file"
                        >
                          <Visibility />
                        </IconButton>
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
    </Box>
  );
}
