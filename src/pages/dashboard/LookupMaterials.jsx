import {
  Add,
  ArrowDownward,
  ArrowUpward,
  DeleteOutline,
  Edit,
  FileDownload,
  FileUpload,
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
import usePaginationStore from "src/store/usePaginationStore";
import usePermissionStore from "src/store/userPermissionStore";
import PageHeader from "src/components/common/PageHeader";
import PageTablePaper from "src/components/common/PageTablePaper";

const columnHelper = createColumnHelper();

export default function LookupMaterials() {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  // Use Zustand store for pagination
  const groupPage = usePaginationStore(state => state.groupPage);
  const groupPageSize = usePaginationStore(state => state.groupPageSize);
  const setGroupPage = usePaginationStore(state => state.setGroupPage);
  const setGroupPageSize = usePaginationStore(state => state.setGroupPageSize);

  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: groupPage,
    pageSize: groupPageSize,
    totalCount: 0,
    totalPages: 0,
  });

  const excelFileInputRef = useRef(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ code: "", name: "" });
  const [editMode, setEditMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [importLoading, setImportLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [sortField, setSortField] = useState("code");
  const [sortOrder, setSortOrder] = useState("asc");

  //get permission store
  const permission = usePermissionStore(state => state.permission);

  // Fetch groups on component mount
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: groupPage, pageSize: groupPageSize }));
  }, [groupPage, groupPageSize]);

  useEffect(() => {
    fetchGroups();
  }, [pagination.page, searchQuery, sortField, sortOrder]);

  // Sync Zustand store when page/pageSize changes
  useEffect(() => {
    setGroupPage(pagination.page);
    setGroupPageSize(pagination.pageSize);
  }, [pagination.page, pagination.pageSize]);

  // When store changes (e.g. after navigating back), update local state
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: groupPage, pageSize: groupPageSize }));
  }, [groupPage, groupPageSize]);

  // Fetch groups
  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/material/groups?page=${pagination.page}&pageSize=${pagination.pageSize}`;
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
      console.log(response.data);
      setGroups(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      }));
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
    console.log("search...");
    setSearchQuery(value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on new search
    setGroups([]);
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    setGroups([]);
  };

  // Optionally, add a handler for page size change if your TableSimple supports it
  // const handlePageSizeChange = (newSize) => {
  //   setPagination(prev => ({ ...prev, pageSize: newSize, page: 1 }));
  // };

  // Export groups to Excel
  const handleExportToExcel = async () => {
    setLoading(true);
    try {
      const response = await axiosPrivate.get("/material/groups/export/only", {
        responseType: "blob",
      });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Create a temporary link element
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "groups.xlsx");

      // Append link to the body
      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      showSnackbar("Groups exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      showSnackbar("Failed to export groups", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Excel file selection for import
  const handleExcelFileSelect = () => {
    excelFileInputRef.current.click();
  };

  // Import materials from Excel
  const handleImportFromExcel = async event => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setImportLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file); // This name must match what the backend expects

      const response = await axiosPrivate.post("/material/groups/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Import response:", response.data);

      // Refresh groups
      fetchGroups();

      showSnackbar("Groups imported successfully");
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
      showSnackbar(error.response?.data?.message || "Failed to import groups", "error");
    } finally {
      setLoading(false);
      setImportLoading(false);
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
      if (editMode) {
        // Update existing group
        await axiosPrivate.put(`/material/groups/${newGroup.id}`, newGroup);
        showSnackbar("Group updated successfully");
      } else {
        // Create new group
        await axiosPrivate.post("/material/groups", newGroup);
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
    setGroupToDelete(groupId);
    setDeleteDialogOpen(true);
  };

  // Confirm group deletion
  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;

    setLoading(true);

    try {
      await axiosPrivate.delete(`/material/groups/${groupToDelete}`);
      showSnackbar("Group deleted successfully");

      // Refresh groups
      fetchGroups();
    } catch (error) {
      console.error("Group delete failed:", error);
      showSnackbar(error.response?.data?.message || "Failed to delete group", "error");
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    }
  };

  // Cancel delete operation
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setGroupToDelete(null);
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

  // Code column header with sort arrow
  const handleSortCode = () => {
    setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    setSortField("code");
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Table columns definition
  const columns = [
    {
      id: "code",
      label: "Code",
      header: () => (
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
            onClick={() => handleViewSubgroups(row)}
          >
            {info.getValue()}
          </Box>
        );
      },
    },
    {
      id: "name",
      label: "Group Name",
      header: () => (
        <Box sx={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>Group Name</Box>
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
      header: () => (
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>Subgroups</Box>
      ),
      accessorKey: "subgroups_count",
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
            onClick={() => handleViewSubgroups(row)}
          >
            {info.getValue() || 0}
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
            onClick={() => handleViewSubgroups(row)}
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
            {(permission["Material Groups"]?.update || permission["Material Groups"]?.create) && (
              <IconButton size="small" onClick={e => handleOpenGroupDialog(row)} color="primary">
                <Edit fontSize="small" />
              </IconButton>
            )}
            {permission["Material Groups"]?.delete && (
              <IconButton size="small" onClick={e => handleDeleteGroup(row.id)} color="error">
                <DeleteOutline fontSize="small" />
              </IconButton>
            )}
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
      {/* Header section */}
      <PageHeader
        title="Material Groups"
        subtitle="Browse and manage material groups"
        actions={
          <>
            {permission["Material Groups"]?.create && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenGroupDialog()}
                sx={{ py: 1 }}
              >
                Add Group
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<FileDownload />}
              onClick={handleExportToExcel}
              disabled={loading}
              sx={{ py: 1 }}
            >
              Export Groups
            </Button>
            {(permission["Material Groups"]?.update || permission["Material Groups"]?.create) && (
              <>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={
                    importLoading ? <CircularProgress size={20} color="inherit" /> : <FileUpload />
                  }
                  onClick={handleExcelFileSelect}
                  disabled={loading || importLoading}
                  sx={{ py: 1 }}
                >
                  {importLoading ? "Importing..." : "Import Groups"}
                </Button>
                <input
                  type="file"
                  ref={excelFileInputRef}
                  style={{ display: "none" }}
                  onChange={handleImportFromExcel}
                  accept=".xlsx,.xls"
                />
              </>
            )}
          </>
        }
      />
      <Box sx={{ mb: 2 }}>
        <SearchFieldComp setQuery={handleSearchChange} placeholder="Search material groups..." />
      </Box>

      {/* Main content area */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {groups.length > 0 ? (
          <>
            <PageTablePaper>
              <TableSimple
                columns={columns}
                rowsData={groups}
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
            </PageTablePaper>
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
                size="medium"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete} maxWidth="sm">
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this group? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeleteGroup} color="error" variant="contained">
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
