import { Add, DeleteOutline, Edit, FileDownload, FileUpload } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Pagination,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchFieldComp from "src/components/common/SearchFieldComp";
import TableSimple from "src/components/table/TableSimple";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";

const columnHelper = createColumnHelper();

export default function LookupMaterials() {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });

  const excelFileInputRef = useRef(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ code: "", name: "" });
  const [editMode, setEditMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [importStats, setImportStats] = useState(null);

  // Fetch groups on component mount
  useEffect(() => {
    fetchGroups();
    console.log("rerender");
  }, [pagination.page, searchQuery]);

  // Fetch groups
  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/material/groups?page=${pagination.page}&pageSize=${pagination.pageSize}`;
      if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}`;
      }

      const response = await axiosPrivate.get(url);
      console.log(response.data);
      setGroups(response.data.data || []);
      setPagination({
        ...pagination,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch groups:", error);
      setError("Failed to load material groups. Please try again.");
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
  };

  // Export groups to Excel
  const handleExportToExcel = async () => {
    setLoading(true);
    try {
      const response = await axiosPrivate.get("/material/groups/export", {
        responseType: "blob",
      });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Create a temporary link element
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "material_groups.xlsx");

      // Append link to the body
      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      showSnackbar("Material groups exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      showSnackbar("Failed to export material groups", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Excel file selection for import
  const handleExcelFileSelect = () => {
    excelFileInputRef.current.click();
  };

  // Import groups from Excel
  const handleImportFromExcel = async event => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);

    try {
      console.log("Importing file:", file.name, "Size:", file.size, "Type:", file.type);
      const formData = new FormData();
      formData.append("file", file); // This name must match what the backend expects

      // Log formData contents for debugging
      console.log("FormData contents:");
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      const response = await axiosPrivate.post("/material/groups/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Import response:", response.data);

      // Display import stats
      setImportStats(response.data.data);

      // Refresh groups
      fetchGroups();

      showSnackbar("Material groups imported successfully");
    } catch (error) {
      console.error("Import failed:", error);
      // More detailed error logging
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
      showSnackbar(error.response?.data?.message || "Failed to import material groups", "error");
    } finally {
      setLoading(false);
      // Reset the file input
      event.target.value = null;
    }
  };

  // Open group dialog
  const handleOpenGroupDialog = (group = null) => {
    if (group) {
      setNewGroup({ id: group.id, code: group.code, name: group.name });
      setEditMode(true);
    } else {
      setNewGroup({ code: "", name: "" });
      setEditMode(false);
    }
    setGroupDialogOpen(true);
  };

  // Close group dialog
  const handleCloseGroupDialog = () => {
    setGroupDialogOpen(false);
    setNewGroup({ code: "", name: "" });
    setEditMode(false);
  };

  // Handle input change for group form
  const handleInputChange = event => {
    const { name, value } = event.target;
    setNewGroup(prev => ({ ...prev, [name]: value }));
  };

  // Create or update group
  const handleSaveGroup = async () => {
    if (!newGroup.code || !newGroup.name) {
      showSnackbar("Group code and name are required", "error");
      return;
    }

    setLoading(true);

    try {
      let response;

      if (editMode) {
        // Update existing group
        response = await axiosPrivate.put(`/material/groups/${newGroup.id}`, newGroup);
        showSnackbar("Group updated successfully");
      } else {
        // Create new group
        response = await axiosPrivate.post("/material/groups", newGroup);
        showSnackbar("Group created successfully");
      }

      // Refresh groups
      fetchGroups();
      handleCloseGroupDialog();
    } catch (error) {
      console.error("Group save failed:", error);
      showSnackbar(error.response?.data?.message || "Failed to save group", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async groupId => {
    if (
      !window.confirm("Are you sure you want to delete this group? This action cannot be undone.")
    ) {
      return;
    }

    setLoading(true);

    try {
      await axiosPrivate.delete(`/material/groups/${groupId}`);
      showSnackbar("Group deleted successfully");

      // Refresh groups
      fetchGroups();
    } catch (error) {
      console.error("Group delete failed:", error);
      showSnackbar(error.response?.data?.message || "Failed to delete group", "error");
    } finally {
      setLoading(false);
    }
  };

  // Navigate to subgroups page
  const handleViewSubgroups = group => {
    navigate(`/dashboard/subgroups/${group.id}`, {
      state: {
        groupName: group.name,
        groupCode: group.code,
      },
    });
  };

  // Table columns definition
  const columns = [
    {
      id: "code",
      label: "Code",
      header: "Code",
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
      id: "name",
      label: "Group Name",
      header: "Group Name",
      accessorKey: "name",
      cell: info => {
        const row = info.row.original;
        return (
          <Box
            component="span"
            sx={{
              fontWeight: "medium",
              cursor: "pointer",
              color: "primary.main",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
            onClick={() => handleViewSubgroups(row)}
          >
            {info.getValue()}
          </Box>
        );
      },
    },
    {
      id: "subgroups_count",
      label: "Subgroups",
      header: "Subgroups",
      accessorKey: "subgroups_count",
      cell: info => (
        <Box
          component="span"
          sx={{
            textAlign: "center",
          }}
        >
          {info.getValue() || 0}
        </Box>
      ),
    },
    {
      id: "materials_count",
      label: "Materials",
      header: "Materials",
      accessorKey: "materials_count",
      cell: info => (
        <Box
          component="span"
          sx={{
            textAlign: "center",
          }}
        >
          {info.getValue() || 0}
        </Box>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      header: "Actions",
      cell: info => {
        const row = info.row.original;
        return (
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton size="small" onClick={() => handleOpenGroupDialog(row)} color="primary">
              <Edit fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => handleDeleteGroup(row.id)} color="error">
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {/* Header section with Excel import/export */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box sx={{ flexGrow: 1, mr: 2 }}>
          <SearchFieldComp setQuery={handleSearchChange} placeholder="Search material groups..." />
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenGroupDialog()}
            sx={{ py: 1 }}
          >
            Add Group
          </Button>
          <Button
            variant="contained"
            startIcon={<FileDownload />}
            onClick={handleExportToExcel}
            disabled={loading}
            sx={{ py: 1 }}
          >
            Export to Excel
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<FileUpload />}
            onClick={handleExcelFileSelect}
            disabled={loading}
            sx={{ py: 1 }}
          >
            Import from Excel
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

      {importStats && (
        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: "bold" }}>
            Import Results: {importStats.total} rows processed
          </Typography>
          <Typography variant="body2">{importStats.createdInfo}</Typography>
          <Typography variant="body2">{importStats.updatedInfo}</Typography>
          {importStats.skippedInfo && (
            <Typography variant="body2">{importStats.skippedInfo}</Typography>
          )}
          {importStats.errorsCount > 0 && (
            <Typography variant="body2" color="error">
              Errors: {importStats.errorsCount}
            </Typography>
          )}
        </Alert>
      )}

      {/* Main content area */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {groups.length > 0 ? (
          <>
            <TableSimple
              columns={columns}
              rowsData={groups}
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
                count={pagination.totalPages}
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
                  Loading groups...
                </Box>
              ) : (
                "No material groups found. Use the 'Add Group' button to create one."
              )}
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onClose={handleCloseGroupDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? "Edit Material Group" : "Add Material Group"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Group Code"
              name="code"
              fullWidth
              value={newGroup.code}
              onChange={handleInputChange}
              required
            />
            <TextField
              label="Group Name"
              name="name"
              fullWidth
              value={newGroup.name}
              onChange={handleInputChange}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroupDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveGroup} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : editMode ? "Update" : "Save"}
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
