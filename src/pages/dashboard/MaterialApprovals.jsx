import { Cancel, CheckCircle, Save, Visibility } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Pagination,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { createColumnHelper } from "@tanstack/react-table";
import moment from "moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SearchFieldComp from "src/components/common/SearchFieldComp";
import TooltipButton from "src/components/common/TooltipButton";
import MaterialApprovalDetail from "src/components/MaterialApprovalDetail";
import TableSorting from "src/components/table/TableSorting";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import usePermissionStore from "src/store/userPermissionStore";

const columnHelper = createColumnHelper();

export default function MaterialApprovals() {
  const axiosPrivate = useAxiosPrivate();
  const { permission } = usePermissionStore();

  // State management
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });

  // Dialog states
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);

  // Inline editing states
  const [editingRows, setEditingRows] = useState(new Set());
  const [editData, setEditData] = useState({});

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Abort controller for search requests
  const controllerRef = useRef(null);

  // Debounced search function
  const searchPendingMaterials = useCallback(
    async (term, page = 1) => {
      setLoading(true);
      try {
        // Abort previous request if exists
        if (controllerRef.current) {
          controllerRef.current.abort();
        }
        controllerRef.current = new AbortController();
        const signal = controllerRef.current.signal;

        const response = await axiosPrivate.get("/material/pending", {
          params: {
            page: page,
            pageSize: pagination.pageSize,
            search: term,
            sort: "requested_at",
            order: "desc",
          },
          signal,
        });

        console.log("searchQuery", term);
        console.log(response.data, "response.data");

        if (response.data.success) {
          setData(response.data.data);
          setPagination(prev => ({
            ...prev,
            totalCount: response.data.pagination.totalCount,
            totalPages: response.data.pagination.totalPages,
          }));
          // Initialize edit data for all materials
          const initialEditData = {};
          response.data.data.forEach(material => {
            initialEditData[material.id] = {
              name: material.name || "",
              description: material.description || "",
              unit_of_measurement: material.unit_of_measurement || "",
              alias1: material.alias1 || "",
              alias2: material.alias2 || "",
              alias3: material.alias3 || "",
            };
          });
          setEditData(initialEditData);
        }
      } catch (error) {
        if (error.code === "ERR_CANCELED") {
          // Request was aborted, do not set error
          console.log("Request was aborted", error);
          return;
        }
        console.error("Error fetching pending materials:", error);
        setSnackbar({
          open: true,
          message: "Failed to fetch pending materials",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [axiosPrivate, pagination.pageSize]
  );

  // Fetch pending materials function
  const fetchPendingMaterials = useCallback(
    async (page = 1) => {
      await searchPendingMaterials(searchQuery, page);
    },
    [searchPendingMaterials, searchQuery]
  );

  // Fetch initial materials and when search or filters change
  useEffect(() => {
    // Reset pagination when search changes
    setPagination(prev => ({
      ...prev,
      page: 1,
    }));

    fetchPendingMaterials(1);
  }, [searchQuery, fetchPendingMaterials]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  // Handle search query change (for SearchFieldComp)
  const handleSearchQueryChange = query => {
    setSearchQuery(query);
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchPendingMaterials(newPage);
  };

  // Handle page size change
  const handlePageSizeChange = event => {
    const newPageSize = parseInt(event.target.value, 10);
    setPagination(prev => ({
      ...prev,
      pageSize: newPageSize,
      page: 1, // Reset to first page when changing page size
    }));
  };

  // Search placeholder text
  const searchPlaceholder = useMemo(() => {
    return "Search by material code, name, description, aliases, or requester name...";
  }, []);

  // Handle start editing
  const handleStartEdit = materialId => {
    setEditingRows(prev => new Set(prev).add(materialId));
  };

  // Handle cancel editing
  const handleCancelEdit = materialId => {
    setEditingRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(materialId);
      return newSet;
    });
    // Reset edit data to original
    const originalMaterial = data.find(m => m.id === materialId);
    if (originalMaterial) {
      setEditData(prev => ({
        ...prev,
        [materialId]: {
          name: originalMaterial.name || "",
          description: originalMaterial.description || "",
          unit_of_measurement: originalMaterial.unit_of_measurement || "",
          alias1: originalMaterial.alias1 || "",
          alias2: originalMaterial.alias2 || "",
          alias3: originalMaterial.alias3 || "",
        },
      }));
    }
  };

  // Handle save changes
  const handleSaveEdit = async materialId => {
    try {
      setActionLoading(true);
      const response = await axiosPrivate.put(
        `/material/pending/${materialId}`,
        editData[materialId]
      );

      if (response.data.success) {
        // Update local data
        setData(prev =>
          prev.map(item => (item.id === materialId ? { ...item, ...editData[materialId] } : item))
        );

        setEditingRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(materialId);
          return newSet;
        });

        setSnackbar({
          open: true,
          message: "Material updated successfully",
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Error updating material:", error);
      setSnackbar({
        open: true,
        message: "Failed to update material",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit data change
  const handleEditDataChange = (materialId, field, value) => {
    setEditData(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        [field]: value,
      },
    }));
  };

  // Handle approve material
  const handleApprove = async material => {
    setActionLoading(true);
    try {
      const response = await axiosPrivate.post(`/material/approve/${material.id}`);

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: `Material ${material.code} approved successfully`,
          severity: "success",
        });
        fetchPendingMaterials(pagination.page); // Refresh data
      }
    } catch (error) {
      console.error("Error approving material:", error);
      setSnackbar({
        open: true,
        message: "Failed to approve material",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
      setApprovalDialog(false);
      setSelectedMaterial(null);
    }
  };

  // Handle reject material
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setSnackbar({
        open: true,
        message: "Rejection reason is required",
        severity: "error",
      });
      return;
    }

    setActionLoading(true);
    try {
      const response = await axiosPrivate.post(`/material/reject/${selectedMaterial.id}`, {
        rejectionReason: rejectionReason.trim(),
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: `Material ${selectedMaterial.code} rejected successfully`,
          severity: "success",
        });
        fetchPendingMaterials(pagination.page); // Refresh data
      }
    } catch (error) {
      console.error("Error rejecting material:", error);
      setSnackbar({
        open: true,
        message: "Failed to reject material",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
      setRejectionDialog(false);
      setSelectedMaterial(null);
      setRejectionReason("");
    }
  };

  // Handle view/edit material
  const handleViewEdit = material => {
    setSelectedMaterial(material);
    setDetailDialog(true);
  };

  // Table columns definition
  const columns = [
    columnHelper.accessor("code", {
      header: "Material Code",
      cell: info => (
        <Box sx={{ fontFamily: "monospace", fontWeight: "bold" }}>{info.getValue()}</Box>
      ),
    }),
    columnHelper.accessor("name", {
      header: "Material Name",
      cell: info => {
        const materialId = info.row.original.id;
        const isEditing = editingRows.has(materialId);

        return isEditing ? (
          <TextField
            size="small"
            value={editData[materialId]?.name || ""}
            onChange={e => handleEditDataChange(materialId, "name", e.target.value)}
            sx={{ minWidth: 180 }}
          />
        ) : (
          <Box sx={{ maxWidth: 200 }}>
            <Typography variant="body2" noWrap>
              {info.getValue()}
            </Typography>
          </Box>
        );
      },
    }),
    columnHelper.accessor("unit_of_measurement", {
      header: "UOM",
      cell: info => {
        const materialId = info.row.original.id;
        const isEditing = editingRows.has(materialId);

        return isEditing ? (
          <TextField
            size="small"
            value={editData[materialId]?.unit_of_measurement || ""}
            onChange={e => handleEditDataChange(materialId, "unit_of_measurement", e.target.value)}
            sx={{ minWidth: 80 }}
          />
        ) : (
          <Typography variant="body2">{info.getValue() || "N/A"}</Typography>
        );
      },
    }),
    columnHelper.accessor("group_name", {
      header: "Group",
      cell: info => (
        <Chip label={info.getValue() || "N/A"} size="small" variant="outlined" color="primary" />
      ),
    }),
    columnHelper.accessor("sub_group_name", {
      header: "Sub Group",
      cell: info => (
        <Chip label={info.getValue() || "N/A"} size="small" variant="outlined" color="secondary" />
      ),
    }),
    columnHelper.accessor("requested_by_name", {
      header: "Requested By",
      cell: info => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2">{info.getValue()}</Typography>
        </Box>
      ),
    }),
    columnHelper.accessor("requested_at", {
      header: "Request Date",
      cell: info => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2">
            {moment(info.getValue()).format("DD/MM/YYYY HH:mm")}
          </Typography>
        </Box>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: info => {
        const material = info.row.original;
        const isEditing = editingRows.has(material.id);

        if (isEditing) {
          return (
            <Box sx={{ display: "flex", gap: 1 }}>
              <TooltipButton
                TooltipText="Save Changes"
                OnClick={() => handleSaveEdit(material.id)}
                Icon={<Save fontSize="small" />}
                color="success"
                size="small"
                disabled={actionLoading}
              />
              <TooltipButton
                TooltipText="Cancel"
                OnClick={() => handleCancelEdit(material.id)}
                Icon={<Cancel fontSize="small" />}
                color="default"
                size="small"
                disabled={actionLoading}
              />
            </Box>
          );
        }

        return (
          <Box sx={{ display: "flex", gap: 1 }}>
            <TooltipButton
              TooltipText="View Details"
              OnClick={() => handleViewEdit(material)}
              Icon={<Visibility fontSize="small" />}
              color="info"
              size="small"
            />
            <TooltipButton
              TooltipText="Approve"
              OnClick={() => {
                setSelectedMaterial(material);
                setApprovalDialog(true);
              }}
              Icon={<CheckCircle fontSize="small" />}
              color="success"
              size="small"
            />
            <TooltipButton
              TooltipText="Reject"
              OnClick={() => {
                setSelectedMaterial(material);
                setRejectionDialog(true);
              }}
              Icon={<Cancel fontSize="small" />}
              color="error"
              size="small"
            />
          </Box>
        );
      },
    }),
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Material Approvals
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and approve pending material requests
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <SearchFieldComp setQuery={handleSearchQueryChange} placeholder={searchPlaceholder} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150 }}>
              {pagination.totalCount} materials pending
            </Typography>
            {loading && <CircularProgress size={20} />}
          </Box>
        </Box>

        {/* Search info */}
        {searchQuery && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Searching for: "{searchQuery}" • Found {pagination.totalCount} results
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Materials Table */}
      <Paper>
        <TableSorting
          rowsData={data || []}
          columns={columns}
          sorting={sorting}
          setSorting={setSorting}
          sx={{
            height: "100%",
            width: "100%",
          }}
        />
        {pagination.totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Paper>

      {/* Approval Confirmation Dialog */}
      <Dialog
        open={approvalDialog}
        onClose={() => !actionLoading && setApprovalDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Approval</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to approve this material?</Typography>
          {selectedMaterial && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Code:</strong> {selectedMaterial.code}
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {selectedMaterial.name}
              </Typography>
              <Typography variant="body2">
                <strong>Requested by:</strong> {selectedMaterial.requested_by_name}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={() => handleApprove(selectedMaterial)}
            variant="contained"
            color="success"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {actionLoading ? "Approving..." : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog
        open={rejectionDialog}
        onClose={() => !actionLoading && setRejectionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Material</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Please provide a reason for rejecting this material:
          </Typography>
          {selectedMaterial && (
            <Box sx={{ mb: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Code:</strong> {selectedMaterial.code}
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {selectedMaterial.name}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason"
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="Please explain why this material is being rejected..."
            disabled={actionLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRejectionDialog(false);
              setRejectionReason("");
            }}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={actionLoading || !rejectionReason.trim()}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <Cancel />}
          >
            {actionLoading ? "Rejecting..." : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Material Detail Dialog */}
      <MaterialApprovalDetail
        open={detailDialog}
        onClose={() => {
          setDetailDialog(false);
          setSelectedMaterial(null);
        }}
        materialId={selectedMaterial?.id}
        onMaterialUpdated={() => fetchPendingMaterials(pagination.page)}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
