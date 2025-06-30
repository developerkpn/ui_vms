import {
  Add,
  ArrowBack,
  DeleteOutline,
  Edit,
  FileDownload,
  FileUpload,
  Search,
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
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  ListSubheader,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import SearchFieldComp from "src/components/common/SearchFieldComp";
import TableSimple from "src/components/table/TableSimple";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";

export default function Subgroups() {
  const { groupId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const { groupName, groupCode } = location.state || {};
  const excelFileInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [subgroups, setSubgroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });
  const [subgroupDialogOpen, setSubgroupDialogOpen] = useState(false);
  const [newSubgroup, setNewSubgroup] = useState({ code: "", name: "", item_group_id: "" });
  const [editMode, setEditMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [allGroups, setAllGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupFilterValue, setGroupFilterValue] = useState("");
  const [groupFetchRetry, setGroupFetchRetry] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subgroupToDelete, setSubgroupToDelete] = useState(null);

  // Fetch subgroups on component mount
  useEffect(() => {
    if (groupId) {
      fetchSubgroups();
    }
  }, [groupId, pagination.page, searchQuery]);

  // Initialize groups data on component mount (for potential use before dialog opens)
  useEffect(() => {
    // Only fetch groups if we haven't already
    if (allGroups.length === 0 && !loadingGroups) {
      fetchAllGroups(false); // Don't show errors on initial load
    }
  }, []);

  // Add effect to fetch groups when dialog is opened or retry is triggered
  useEffect(() => {
    if (subgroupDialogOpen) {
      fetchAllGroups(true); // Show errors when dialog is open
    }
  }, [subgroupDialogOpen, groupFetchRetry]);

  // Save pagination state when it changes
  useEffect(() => {
    sessionStorage.setItem("subgroupsPagination", JSON.stringify(pagination));
  }, [pagination]);

  // Fetch all groups for dropdown with retry mechanism
  const fetchAllGroups = async (showErrors = true) => {
    if (loadingGroups) return false; // Prevent multiple concurrent requests

    setLoadingGroups(true);
    try {
      // Use the dedicated endpoint for dropdown data
      const response = await axiosPrivate.get("/material/groups/dropdown");
      if (response.data && Array.isArray(response.data.data)) {
        setAllGroups(response.data.data || []);
        return true; // Indicate successful fetch
      } else {
        console.error("Invalid response format for groups:", response.data);
        if (showErrors)
          showSnackbar("Failed to load material groups - invalid response format", "error");
        return false;
      }
    } catch (error) {
      console.error("Failed to fetch all groups:", error);
      if (showErrors) showSnackbar("Failed to load material groups for selection", "error");
      return false;
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch subgroups
  const fetchSubgroups = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/material/groups/${groupId}/subgroups?page=${pagination.page}&pageSize=${pagination.pageSize}`;
      if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}`;
      }

      const response = await axiosPrivate.get(url);
      console.log("Subgroups response:", response.data);
      setSubgroups(response.data.data || []);
      setPagination({
        ...pagination,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch subgroups:", error);
      setError("Failed to load material subgroups. Please try again.");
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
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on new search
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));

    // for better UX, clear the subgroups list when page changes
    setSubgroups([]);
  };

  // Open subgroup dialog
  const handleOpenSubgroupDialog = (subgroup = null) => {
    // Set the dialog state first
    if (subgroup) {
      setNewSubgroup({
        id: subgroup.id,
        code: subgroup.code,
        name: subgroup.name,
        item_group_id: subgroup.item_group_id,
      });
      setEditMode(true);
    } else {
      setNewSubgroup({
        code: "",
        name: "",
        item_group_id: groupId || "", // Default to empty string if groupId is not available
      });
      setEditMode(false);
    }

    // Open the dialog - useEffect will trigger group fetching
    setSubgroupDialogOpen(true);
  };

  // Close subgroup dialog
  const handleCloseSubgroupDialog = () => {
    setSubgroupDialogOpen(false);
    setNewSubgroup({ code: "", name: "", item_group_id: "" });
    setEditMode(false);
  };

  // Handle input change for subgroup form
  const handleInputChange = event => {
    const { name, value } = event.target;
    setNewSubgroup(prev => ({ ...prev, [name]: value }));
  };

  // Helper function to validate selected value
  const getValidGroupId = () => {
    // If there are no groups or if the current group ID doesn't exist in the groups, return empty string
    if (allGroups.length === 0 || !allGroups.some(g => g.id === newSubgroup.item_group_id)) {
      return "";
    }
    return newSubgroup.item_group_id;
  };

  // Handle group filter change
  const handleGroupFilterChange = event => {
    setGroupFilterValue(event.target.value);
  };

  // Filter groups based on search input
  const filteredGroups = allGroups.filter(group => {
    const searchTerm = groupFilterValue.toLowerCase();
    return (
      group.code.toLowerCase().includes(searchTerm) || group.name.toLowerCase().includes(searchTerm)
    );
  });

  // Create or update subgroup
  const handleSaveSubgroup = async () => {
    if (!newSubgroup.code || !newSubgroup.name || !newSubgroup.item_group_id) {
      showSnackbar("Subgroup code, name, and group are required", "error");
      return;
    }

    setLoading(true);

    try {
      let response;

      if (editMode) {
        // Update existing subgroup
        response = await axiosPrivate.put(`/material/subgroups/${newSubgroup.id}`, newSubgroup);
        showSnackbar("Subgroup updated successfully");
      } else {
        // Create new subgroup
        response = await axiosPrivate.post("/material/subgroups", newSubgroup);
        showSnackbar("Subgroup created successfully");
      }

      // Refresh subgroups - if the group was changed, navigate to the new group's subgroups page
      if (editMode && newSubgroup.item_group_id !== groupId) {
        // Find the new group details
        const newGroup = allGroups.find(g => g.id === newSubgroup.item_group_id);
        if (newGroup) {
          navigate(`/dashboard/subgroups/${newGroup.id}`, {
            state: {
              groupName: newGroup.name,
              groupCode: newGroup.code,
            },
          });
        } else {
          fetchSubgroups();
        }
      } else {
        fetchSubgroups();
      }

      handleCloseSubgroupDialog();
    } catch (error) {
      console.error("Subgroup save failed:", error);
      showSnackbar(error.response?.data?.message || "Failed to save subgroup", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete subgroup
  const handleDeleteSubgroup = async subgroupId => {
    setSubgroupToDelete(subgroupId);
    setDeleteDialogOpen(true);
  };

  // Confirm subgroup deletion
  const confirmDeleteSubgroup = async () => {
    if (!subgroupToDelete) return;

    setLoading(true);

    try {
      await axiosPrivate.delete(`/material/subgroups/${subgroupToDelete}`);
      showSnackbar("Subgroup deleted successfully");

      // Refresh subgroups
      fetchSubgroups();
    } catch (error) {
      console.error("Subgroup delete failed:", error);
      showSnackbar(error.response?.data?.message || "Failed to delete subgroup", "error");
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setSubgroupToDelete(null);
    }
  };

  // Cancel delete operation
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setSubgroupToDelete(null);
  };

  // Navigate to materials page
  const handleViewMaterials = subgroup => {
    navigate(`/dashboard/materials/${subgroup.id}`, {
      state: {
        groupName,
        groupCode,
        groupId,
        subgroupName: subgroup.name,
        subgroupCode: subgroup.code,
      },
    });
  };

  // Navigate back to groups
  const handleBackToGroups = () => {
    navigate("/dashboard/materials/lookup");
  };

  // Add function to export subgroups
  const handleExportSubgroups = async () => {
    setLoading(true);
    try {
      // Export only subgroups for this group
      const response = await axiosPrivate.get(`/material/subgroups/export/${groupId}`, {
        responseType: "blob",
      });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Create a temporary link element
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `subgroups_for_${groupCode || groupId}.xlsx`);

      // Append link to the body
      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      showSnackbar("Subgroups exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      showSnackbar("Failed to export subgroups", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add function to handle Excel file selection for import
  const handleExcelFileSelect = () => {
    excelFileInputRef.current.click();
  };

  // Add function to import subgroups from Excel
  const handleImportFromExcel = async event => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setImportLoading(true);

    try {
      console.log("Importing file:", file.name, "Size:", file.size, "Type:", file.type);
      const formData = new FormData();
      formData.append("file", file);

      const response = await axiosPrivate.post("/material/subgroups/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Import response:", response.data);

      // Refresh subgroups
      fetchSubgroups();

      showSnackbar("Subgroups imported successfully");
    } catch (error) {
      console.error("Import failed:", error);
      if (error.response) {
        console.error("Error response:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error.request) {
        console.error("Error request:", error.request);
      } else {
        console.error("Error message:", error.message);
      }
      showSnackbar(error.response?.data?.message || "Failed to import subgroups", "error");
    } finally {
      setLoading(false);
      setImportLoading(false);
      // Reset the file input
      event.target.value = null;
    }
  };

  // Table columns definition
  const columns = [
    {
      id: "code",
      label: "Code",
      header: () => (
        <Box sx={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>Code</Box>
      ),
      accessorKey: "code",
      cell: info => {
        const row = info.row.original;
        return (
          <Box
            component="span"
            sx={{
              fontWeight: "medium",
              display: "flex",
              justifyContent: "flex-start",
              width: "100%",
              cursor: "pointer",
            }}
            onClick={() => handleViewMaterials(row)}
          >
            {info.getValue()}
          </Box>
        );
      },
    },
    {
      id: "name",
      label: "Subgroup Name",
      header: () => (
        <Box sx={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
          Subgroup Name
        </Box>
      ),
      accessorKey: "name",
      cell: info => {
        const row = info.row.original;
        return (
          <Box
            component="span"
            sx={{
              fontWeight: "medium",
              color: "primary.main",
              display: "flex",
              justifyContent: "flex-start",
              width: "100%",
              cursor: "pointer",
            }}
            onClick={() => handleViewMaterials(row)}
          >
            {info.getValue()}
          </Box>
        );
      },
    },
    {
      id: "materials_count",
      label: "Materials",
      header: () => (
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>Materials</Box>
      ),
      accessorKey: "materials_count",
      cell: info => {
        const row = info.row.original;
        return (
          <Box
            component="span"
            sx={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              cursor: "pointer",
            }}
            onClick={() => handleViewMaterials(row)}
          >
            {info.getValue() || 0}
          </Box>
        );
      },
    },
    {
      id: "actions",
      label: "Actions",
      header: () => (
        <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>Actions</Box>
      ),
      cell: info => {
        const row = info.row.original;
        return (
          <Box
            sx={{ display: "flex", gap: 1, justifyContent: "flex-end", width: "100%" }}
            onClick={e => e.stopPropagation()}
          >
            <IconButton size="small" onClick={e => handleOpenSubgroupDialog(row)} color="primary">
              <Edit fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={e => handleDeleteSubgroup(row.id)} color="error">
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  if (!groupId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error: No group ID provided</Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={handleBackToGroups}
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
        <Typography color="text.primary" sx={{ fontWeight: "bold" }}>
          {groupCode && groupName ? `${groupCode} - ${groupName}` : "Subgroups"}
        </Typography>
      </Breadcrumbs>

      {/* Header section */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box sx={{ flexGrow: 1, mr: 2 }}>
          <SearchFieldComp setQuery={handleSearchChange} placeholder="Search subgroups..." />
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenSubgroupDialog()}
            sx={{ py: 1 }}
          >
            Add
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExportSubgroups}
            sx={{ py: 1 }}
          >
            Export Subgroups
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={
              importLoading ? <CircularProgress size={20} color="inherit" /> : <FileUpload />
            }
            onClick={handleExcelFileSelect}
            disabled={loading || importLoading}
            sx={{ py: 1 }}
          >
            {importLoading ? "Importing..." : "Import Subgroups"}
          </Button>
          <input
            type="file"
            ref={excelFileInputRef}
            style={{ display: "none" }}
            onChange={handleImportFromExcel}
            accept=".xlsx,.xls"
          />
        </Box>
      </Box>

      {/* Main content area */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {subgroups.length > 0 ? (
          <>
            <TableSimple
              columns={columns}
              rowsData={subgroups}
              sx={{
                height: "100%",
                width: "100%",
                "& .MuiTableRow-root": {
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                },
                "& .MuiTableRow-root:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.05)",
                },
                "& .MuiTableCell-root": {
                  transition: "all 0.2s ease",
                },
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
                  Loading subgroups...
                </Box>
              ) : (
                "No subgroups found. Use the 'Add Subgroup' button to create one."
              )}
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Subgroup Dialog */}
      <Dialog open={subgroupDialogOpen} onClose={handleCloseSubgroupDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? "Edit Subgroup" : "Add Subgroup"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Subgroup Code"
              name="code"
              fullWidth
              value={newSubgroup.code}
              onChange={handleInputChange}
              required
            />
            <TextField
              label="Subgroup Name"
              name="name"
              fullWidth
              value={newSubgroup.name}
              onChange={handleInputChange}
              required
            />

            <FormControl fullWidth>
              <InputLabel id="group-select-label">Group</InputLabel>
              <Select
                labelId="group-select-label"
                id="group-select"
                value={allGroups.length > 0 ? getValidGroupId() : ""}
                name="item_group_id"
                label="Group"
                onChange={handleInputChange}
                required
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                    },
                  },
                }}
              >
                {loadingGroups && (
                  <MenuItem disabled value="">
                    Loading groups...
                  </MenuItem>
                )}

                {!loadingGroups && allGroups.length === 0 && (
                  <MenuItem disabled value="">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      No groups found
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={e => {
                          e.stopPropagation();
                          setGroupFetchRetry(prev => prev + 1);
                        }}
                      >
                        Retry
                      </Button>
                    </Box>
                  </MenuItem>
                )}

                {!loadingGroups && allGroups.length > 0 && (
                  <MenuItem value="" disabled sx={{ display: "none" }}>
                    Select a group
                  </MenuItem>
                )}

                {!loadingGroups && allGroups.length > 0 && (
                  <ListSubheader
                    sx={{
                      backgroundColor: "background.paper",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    <TextField
                      size="small"
                      placeholder="Search groups..."
                      fullWidth
                      value={groupFilterValue}
                      onChange={handleGroupFilterChange}
                      onClick={e => e.stopPropagation()}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ my: 1 }}
                    />
                  </ListSubheader>
                )}

                {!loadingGroups &&
                  allGroups.length > 0 &&
                  filteredGroups.length > 0 &&
                  filteredGroups.map(group => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.code} - {group.name}
                    </MenuItem>
                  ))}

                {!loadingGroups && allGroups.length > 0 && filteredGroups.length === 0 && (
                  <MenuItem disabled value="">
                    No matches found
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSubgroupDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSubgroup} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : editMode ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete} maxWidth="sm">
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this subgroup? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeleteSubgroup} color="error" variant="contained">
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
