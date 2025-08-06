import {
  AttachFile,
  Cancel,
  CheckCircle,
  Close,
  Edit,
  Save,
  Visibility,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import moment from "moment";
import { useEffect, useState } from "react";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";

export default function MaterialApprovalDetail({ open, onClose, materialId, onMaterialUpdated }) {
  const axiosPrivate = useAxiosPrivate();

  // State management
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch material details
  const fetchMaterialDetails = async () => {
    if (!materialId) return;

    setLoading(true);
    try {
      const response = await axiosPrivate.get(`/material/pending/${materialId}`);

      if (response.data.success) {
        setMaterial(response.data.data);
        setEditData({
          name: response.data.data.name || "",
          description: response.data.data.description || "",
          unit_of_measurement: response.data.data.unit_of_measurement || "",
          alias1: response.data.data.alias1 || "",
          alias2: response.data.data.alias2 || "",
          alias3: response.data.data.alias3 || "",
        });
      }
    } catch (error) {
      console.error("Error fetching material details:", error);
      setSnackbar({
        open: true,
        message: "Failed to fetch material details",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load material when dialog opens
  useEffect(() => {
    if (open && materialId) {
      fetchMaterialDetails();
    }
  }, [open, materialId]);

  // Handle save changes
  const handleSaveChanges = async () => {
    setActionLoading(true);
    try {
      const response = await axiosPrivate.put(`/material/pending/${materialId}`, editData);

      if (response.data.success) {
        setMaterial(response.data.data);
        setEditing(false);
        setSnackbar({
          open: true,
          message: "Material updated successfully",
          severity: "success",
        });
        onMaterialUpdated?.();
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

  // Handle approve material
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const response = await axiosPrivate.post(`/material/approve/${materialId}`);

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: "Material approved successfully",
          severity: "success",
        });
        onMaterialUpdated?.();
        onClose();
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
      const response = await axiosPrivate.post(`/material/reject/${materialId}`, {
        rejectionReason: rejectionReason.trim(),
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: "Material rejected successfully",
          severity: "success",
        });
        onMaterialUpdated?.();
        onClose();
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
      setRejectionReason("");
    }
  };

  // Handle close dialog
  const handleClose = () => {
    if (editing) {
      // Reset edit data
      setEditData({
        name: material?.name || "",
        description: material?.description || "",
        unit_of_measurement: material?.unit_of_measurement || "",
        alias1: material?.alias1 || "",
        alias2: material?.alias2 || "",
        alias3: material?.alias3 || "",
      });
      setEditing(false);
    }
    onClose();
  };

  if (!material && !loading) {
    return null;
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: "70vh" },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6">Material Approval Details</Typography>
            <IconButton onClick={handleClose} disabled={actionLoading}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ py: 1 }}>
              {/* Basic Information */}
              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title="Basic Information"
                  action={
                    !editing ? (
                      <Button
                        startIcon={<Edit />}
                        onClick={() => setEditing(true)}
                        variant="outlined"
                        size="small"
                      >
                        Edit
                      </Button>
                    ) : (
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          startIcon={<Save />}
                          onClick={handleSaveChanges}
                          variant="contained"
                          size="small"
                          disabled={actionLoading}
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditing(false)}
                          variant="outlined"
                          size="small"
                          disabled={actionLoading}
                        >
                          Cancel
                        </Button>
                      </Box>
                    )
                  }
                />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Material Code"
                        value={material?.code || ""}
                        disabled
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="Material Name"
                        value={editing ? editData.name : material?.name || ""}
                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                        disabled={!editing}
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="Unit of Measurement"
                        value={
                          editing
                            ? editData.unit_of_measurement
                            : material?.unit_of_measurement || ""
                        }
                        onChange={e =>
                          setEditData({ ...editData, unit_of_measurement: e.target.value })
                        }
                        disabled={!editing}
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Material Group"
                        value={material?.group_name || "N/A"}
                        disabled
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="Sub Group"
                        value={material?.sub_group_name || "N/A"}
                        disabled
                        sx={{ mb: 2 }}
                      />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                        <Chip label="Pending Approval" color="warning" variant="outlined" />
                      </Box>
                    </Grid>
                  </Grid>

                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={editing ? editData.description : material?.description || ""}
                    onChange={e => setEditData({ ...editData, description: e.target.value })}
                    disabled={!editing}
                    sx={{ mb: 2 }}
                  />

                  {/* Aliases */}
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
                    Aliases
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Alias 1"
                        value={editing ? editData.alias1 : material?.alias1 || ""}
                        onChange={e => setEditData({ ...editData, alias1: e.target.value })}
                        disabled={!editing}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Alias 2"
                        value={editing ? editData.alias2 : material?.alias2 || ""}
                        onChange={e => setEditData({ ...editData, alias2: e.target.value })}
                        disabled={!editing}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Alias 3"
                        value={editing ? editData.alias3 : material?.alias3 || ""}
                        onChange={e => setEditData({ ...editData, alias3: e.target.value })}
                        disabled={!editing}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Request Information */}
              <Card sx={{ mb: 3 }}>
                <CardHeader title="Request Information" />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Requested By
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {material?.requested_by_name || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Request Date
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {material?.requested_at
                          ? moment(material.requested_at).format("DD/MM/YYYY HH:mm")
                          : "N/A"}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Attachments */}
              {material?.attachments && material.attachments.length > 0 && (
                <Card>
                  <CardHeader title="Attachments" avatar={<AttachFile />} />
                  <CardContent>
                    <List dense>
                      {material.attachments.map((attachment, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <AttachFile fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={attachment.attachment}
                            secondary={attachment.type}
                          />
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => {
                              // Handle file view - this would open the file
                              window.open(`/material/file/${attachment.attachment}`, "_blank");
                            }}
                          >
                            View
                          </Button>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={actionLoading}>
            Close
          </Button>
          <Button
            onClick={handleApprove}
            variant="contained"
            color="success"
            startIcon={actionLoading ? <CircularProgress size={16} /> : <CheckCircle />}
            disabled={actionLoading || editing}
          >
            {actionLoading ? "Approving..." : "Approve"}
          </Button>
          <Button
            onClick={() => setRejectionDialog(true)}
            variant="contained"
            color="error"
            startIcon={<Cancel />}
            disabled={actionLoading || editing}
          >
            Reject
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
    </>
  );
}
