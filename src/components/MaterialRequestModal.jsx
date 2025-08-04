import { Close as CloseIcon, CloudUpload as UploadIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Modal,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useEffect, useState } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 800,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
  maxHeight: "90vh",
  overflow: "auto",
};

const MaterialRequestModal = ({ open, onClose, onSuccess }) => {
  const axiosPrivate = useAxiosPrivate();
  const [formData, setFormData] = useState({
    tanggal_permintaan: new Date().toISOString().split("T")[0],
    nama_material: "",
    deskripsi_material: "",
    material_group: "",
    sub_material_group: "",
    register_number: "",
    part_number: "",
    dimensi: "",
    berat: "",
    bahan: "",
    type: "",
    series: "",
    power: "",
    other_specification: "",
    uom: "",
    plant: "",
    storage_location: "",
    valuation_type: "",
    catatan_tambahan: "",
  });

  const [files, setFiles] = useState([]);
  const [materialGroups, setMaterialGroups] = useState([]);
  const [subGroups, setSubGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load material groups on component mount
  useEffect(() => {
    if (open) {
      loadMaterialGroups();
    }
  }, [open]);

  // Load subgroups when material group changes
  useEffect(() => {
    if (formData.material_group) {
      loadSubGroups(formData.material_group);
    } else {
      setSubGroups([]);
      setFormData(prev => ({ ...prev, sub_material_group: "" }));
    }
  }, [formData.material_group]);

  const loadMaterialGroups = async () => {
    try {
      setLoading(true);
      const response = await axiosPrivate.get("/material/groups/dropdown");
      if (response.data.success) {
        setMaterialGroups(response.data.data);
      }
    } catch (error) {
      console.error("Error loading material groups:", error);
      setError("Failed to load material groups");
    } finally {
      setLoading(false);
    }
  };

  const loadSubGroups = async groupId => {
    try {
      const response = await axiosPrivate.get(`/material/subgroups/${groupId}/dropdown`);
      if (response.data.success) {
        setSubGroups(response.data.data);
      }
    } catch (error) {
      console.error("Error loading subgroups:", error);
      setError("Failed to load subgroups");
    }
  };

  const handleInputChange = field => event => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError("");
    setSuccess("");
  };

  const handleFileChange = event => {
    const selectedFiles = Array.from(event.target.files);
    const validExtensions = ["pdf", "doc", "docx", "png", "jpg", "jpeg"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const validFiles = selectedFiles.filter(file => {
      const extension = file.name.split(".").pop().toLowerCase();
      if (!validExtensions.includes(extension)) {
        setError(`Invalid file type: ${file.name}. Allowed: ${validExtensions.join(", ")}`);
        return false;
      }
      if (file.size > maxSize) {
        setError(`File too large: ${file.name}. Maximum size: 5MB`);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
    event.target.value = ""; // Reset input
  };

  const removeFile = index => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validate required fields
    const requiredFields = [
      "nama_material",
      "deskripsi_material",
      "material_group",
      "sub_material_group",
      "uom",
    ];

    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.join(", ")}`);
      return;
    }

    try {
      setSubmitLoading(true);
      setError("");

      // Create FormData for file upload
      const submitData = new FormData();

      // Add form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Add files
      files.forEach((file, index) => {
        submitData.append("files", file);
      });

      const response = await axiosPrivate.post("/material/request", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        // Close modal immediately and notify parent
        onSuccess && onSuccess(response.data.data);
        handleClose();
      } else {
        setError(response.data.message || "Failed to submit material request");
      }
    } catch (error) {
      console.error("Submit error:", error);
      setError("Failed to submit material request. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      tanggal_permintaan: new Date().toISOString().split("T")[0],
      nama_material: "",
      deskripsi_material: "",
      material_group: "",
      sub_material_group: "",
      register_number: "",
      part_number: "",
      dimensi: "",
      berat: "",
      bahan: "",
      type: "",
      series: "",
      power: "",
      other_specification: "",
      uom: "",
      plant: "",
      storage_location: "",
      valuation_type: "",
      catatan_tambahan: "",
    });
    setFiles([]);
    setError("");
    setSuccess("");
    setSubGroups([]);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={modalStyle}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5" component="h2">
            Request New Material
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Date Field */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Request Date"
              type="date"
              size="small"
              value={formData.tanggal_permintaan}
              onChange={handleInputChange("tanggal_permintaan")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Material Name - Required */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Material Name"
              placeholder="Enter material name"
              size="small"
              value={formData.nama_material}
              onChange={handleInputChange("nama_material")}
              required
            />
          </Grid>

          {/* Material Description - Required */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Material Description"
              placeholder="Enter detailed description of the material"
              multiline
              rows={2}
              size="small"
              value={formData.deskripsi_material}
              onChange={handleInputChange("deskripsi_material")}
              required
            />
          </Grid>

          {/* Material Group - Required */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" required>
              <InputLabel>
                <span>Material Group</span>
              </InputLabel>
              <Select
                value={formData.material_group}
                onChange={handleInputChange("material_group")}
                label="Material Group"
                disabled={loading}
                displayEmpty
              >
                {materialGroups.map(group => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Sub Material Group - Required */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Sub Material Group</InputLabel>
              <Select
                value={formData.sub_material_group}
                onChange={handleInputChange("sub_material_group")}
                label="Sub Material Group"
                disabled={!formData.material_group || loading}
                displayEmpty
                sx={{
                  opacity: !formData.material_group ? 0.6 : 1,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderStyle: !formData.material_group ? "dashed" : "solid",
                  },
                }}
              >
                {subGroups.map(subGroup => (
                  <MenuItem key={subGroup.id} value={subGroup.id}>
                    {subGroup.name}
                  </MenuItem>
                ))}
              </Select>
              {!formData.material_group && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, fontStyle: "italic" }}
                >
                  Select a material group to enable this field
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* UOM - Required */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Unit of Measure (UOM)"
              placeholder="e.g., PC, KG, L, M"
              size="small"
              value={formData.uom}
              onChange={handleInputChange("uom")}
              required
            />
          </Grid>

          {/* Register Number */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Register Number"
              placeholder="Enter reference number if available"
              size="small"
              value={formData.register_number}
              onChange={handleInputChange("register_number")}
            />
          </Grid>

          {/* Part Number */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Part Number"
              placeholder="e.g., 24102-062074"
              size="small"
              value={formData.part_number}
              onChange={handleInputChange("part_number")}
            />
          </Grid>

          {/* Dimensions */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Dimensions"
              placeholder="e.g., 100x50x200 mm"
              size="small"
              value={formData.dimensi}
              onChange={handleInputChange("dimensi")}
            />
          </Grid>

          {/* Weight */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Weight"
              placeholder="e.g., 10 Kg"
              size="small"
              value={formData.berat}
              onChange={handleInputChange("berat")}
            />
          </Grid>

          {/* Material */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Material"
              placeholder="e.g., SS304, SS316, CS, CI"
              size="small"
              value={formData.bahan}
              onChange={handleInputChange("bahan")}
            />
          </Grid>

          {/* Type */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Type"
              placeholder="Enter material type"
              size="small"
              value={formData.type}
              onChange={handleInputChange("type")}
            />
          </Grid>

          {/* Series */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Series"
              placeholder="Enter series if applicable"
              size="small"
              value={formData.series}
              onChange={handleInputChange("series")}
            />
          </Grid>

          {/* Power */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Power Specifications"
              placeholder="e.g., 5 KW, 380V, 12A, 50Hz"
              size="small"
              value={formData.power}
              onChange={handleInputChange("power")}
            />
          </Grid>

          {/* Plant */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Plant"
              placeholder="e.g., EU73, TH3A, PS23"
              size="small"
              value={formData.plant}
              onChange={handleInputChange("plant")}
            />
          </Grid>

          {/* Storage Location */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Storage Location"
              placeholder="e.g., ST01, WN01"
              size="small"
              value={formData.storage_location}
              onChange={handleInputChange("storage_location")}
            />
          </Grid>

          {/* Valuation Type */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Valuation Type"
              placeholder="e.g., Store"
              size="small"
              value={formData.valuation_type}
              onChange={handleInputChange("valuation_type")}
            />
          </Grid>

          {/* Other Specifications */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Other Specifications"
              placeholder="Enter any additional technical specifications"
              multiline
              rows={2}
              size="small"
              value={formData.other_specification}
              onChange={handleInputChange("other_specification")}
            />
          </Grid>

          {/* Additional Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Additional Notes"
              placeholder="Enter any additional comments or special instructions"
              multiline
              rows={2}
              size="small"
              value={formData.catatan_tambahan}
              onChange={handleInputChange("catatan_tambahan")}
            />
          </Grid>

          {/* File Upload */}
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadIcon />}
                sx={{ mb: 1 }}
              >
                Upload Attachments
                <VisuallyHiddenInput
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                />
              </Button>
              <Typography variant="caption" display="block" color="text.secondary">
                Allowed: PDF, DOC, DOCX, PNG, JPG, JPEG (Max 5MB each)
              </Typography>
            </Box>

            {files.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {files.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    onDelete={() => removeFile(index)}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            )}
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
          <Button onClick={handleClose} disabled={submitLoading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitLoading}>
            {submitLoading ? <CircularProgress size={24} /> : "Submit Request"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default MaterialRequestModal;
