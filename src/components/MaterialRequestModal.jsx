import { Close as CloseIcon, CloudUpload as UploadIcon, Add as AddIcon, Delete as DeleteIcon, NavigateNext as NextIcon, NavigateBefore as PrevIcon } from "@mui/icons-material";
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
  Paper,
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
  
  const getInitialMaterialData = () => ({
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
    alias1: "",
    alias2: "",
    alias3: "",
    files: [],
  });

  const [materials, setMaterials] = useState([getInitialMaterialData()]);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(0);
  const [materialGroups, setMaterialGroups] = useState([]);
  const [subGroups, setSubGroups] = useState({});
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

  const loadSubGroups = async (groupId, materialIndex) => {
    try {
      const response = await axiosPrivate.get(`/material/subgroups/${groupId}/dropdown`);
      if (response.data.success) {
        setSubGroups(prev => ({
          ...prev,
          [materialIndex]: response.data.data
        }));
      }
    } catch (error) {
      console.error("Error loading subgroups:", error);
      setError("Failed to load subgroups");
    }
  };

  const addMaterial = () => {
    setMaterials(prev => [...prev, getInitialMaterialData()]);
    setCurrentMaterialIndex(materials.length);
  };

  const removeMaterial = () => {
    if (materials.length > 1) {
      const indexToRemove = currentMaterialIndex;
      setMaterials(prev => prev.filter((_, i) => i !== indexToRemove));
      setSubGroups(prev => {
        const newSubGroups = { ...prev };
        delete newSubGroups[indexToRemove];
        const reindexed = {};
        Object.keys(newSubGroups).forEach(key => {
          const keyNum = parseInt(key);
          if (keyNum > indexToRemove) {
            reindexed[keyNum - 1] = newSubGroups[key];
          } else {
            reindexed[key] = newSubGroups[key];
          }
        });
        return reindexed;
      });
      if (currentMaterialIndex >= materials.length - 1) {
        setCurrentMaterialIndex(Math.max(0, materials.length - 2));
      }
    }
  };

  const nextMaterial = () => {
    setCurrentMaterialIndex(prev => Math.min(prev + 1, materials.length - 1));
  };

  const prevMaterial = () => {
    setCurrentMaterialIndex(prev => Math.max(prev - 1, 0));
  };

  const handleInputChange = (field) => event => {
    const value = event.target.value;
    const materialIndex = currentMaterialIndex;
    setMaterials(prev => prev.map((material, index) => 
      index === materialIndex 
        ? { ...material, [field]: value }
        : material
    ));
    
    if (field === 'material_group' && value) {
      loadSubGroups(value, materialIndex);
      setMaterials(prev => prev.map((material, index) => 
        index === materialIndex 
          ? { ...material, sub_material_group: "" }
          : material
      ));
    } else if (field === 'material_group' && !value) {
      setSubGroups(prev => {
        const newSubGroups = { ...prev };
        delete newSubGroups[materialIndex];
        return newSubGroups;
      });
    }
    
    setError("");
    setSuccess("");
  };

  const handleFileChange = () => event => {
    const selectedFiles = Array.from(event.target.files);
    const validExtensions = ["pdf", "doc", "docx", "png", "jpg", "jpeg"];
    const maxSize = 5 * 1024 * 1024;
    const materialIndex = currentMaterialIndex;

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

    setMaterials(prev => prev.map((material, index) => 
      index === materialIndex 
        ? { ...material, files: [...material.files, ...validFiles] }
        : material
    ));
    event.target.value = "";
  };

  const removeFile = (fileIndex) => {
    const materialIndex = currentMaterialIndex;
    setMaterials(prev => prev.map((material, index) => 
      index === materialIndex 
        ? { ...material, files: material.files.filter((_, i) => i !== fileIndex) }
        : material
    ));
  };

  const handleSubmit = async () => {
    const requiredFields = [
      "nama_material",
      "deskripsi_material", 
      "material_group",
      "sub_material_group",
      "uom",
    ];

    const validationErrors = [];
    materials.forEach((material, index) => {
      const missingFields = requiredFields.filter(field => !material[field]);
      if (missingFields.length > 0) {
        validationErrors.push(`Material ${index + 1}: ${missingFields.join(", ")}`);
      }
    });

    if (validationErrors.length > 0) {
      setError(`Please fill in required fields:\n${validationErrors.join("\n")}`);
      return;
    }

    try {
      setSubmitLoading(true);
      setError("");
      
      const results = [];
      const errors = [];

      for (let i = 0; i < materials.length; i++) {
        const material = materials[i];
        try {
          const submitData = new FormData();

          Object.keys(material).forEach(key => {
            if (key !== 'files' && material[key]) {
              submitData.append(key, material[key]);
            }
          });

          material.files.forEach((file) => {
            submitData.append("files", file);
          });

          const response = await axiosPrivate.post("/material/request", submitData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          if (response.data.success) {
            results.push(`Material ${i + 1}: ${material.nama_material} - Success`);
          } else {
            errors.push(`Material ${i + 1}: ${material.nama_material} - ${response.data.message || "Failed"}`);
          }
        } catch (error) {
          console.error(`Submit error for material ${i + 1}:`, error);
          errors.push(`Material ${i + 1}: ${material.nama_material} - Network error`);
        }
      }

      if (errors.length === 0) {
        setSuccess(`All ${materials.length} material requests submitted successfully!`);
        setTimeout(() => {
          onSuccess && onSuccess(results);
          handleClose();
        }, 1500);
      } else if (results.length === 0) {
        setError(`All requests failed:\n${errors.join("\n")}`);
      } else {
        const message = `${results.length} successful, ${errors.length} failed:\n\nSuccessful:\n${results.join("\n")}\n\nFailed:\n${errors.join("\n")}`;
        setError(message);
      }
    } catch (error) {
      console.error("Submit error:", error);
      setError("Failed to submit material requests. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleClose = () => {
    setMaterials([getInitialMaterialData()]);
    setCurrentMaterialIndex(0);
    setError("");
    setSuccess("");
    setSubGroups({});
    onClose();
  };

  const currentMaterial = materials[currentMaterialIndex] || getInitialMaterialData();

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={modalStyle}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5" component="h2">
            Request New Material{materials.length > 1 ? 's' : ''}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={addMaterial}
              disabled={submitLoading}
            >
              Add Material
            </Button>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Material Navigation */}
        {materials.length > 1 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PrevIcon />}
              onClick={prevMaterial}
              disabled={currentMaterialIndex === 0 || submitLoading}
            >
              Previous
            </Button>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Material {currentMaterialIndex + 1} of {materials.length}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={removeMaterial}
                disabled={materials.length === 1 || submitLoading}
              >
                Delete Current
              </Button>
            </Box>
            <Button
              variant="outlined"
              size="small"
              endIcon={<NextIcon />}
              onClick={nextMaterial}
              disabled={currentMaterialIndex === materials.length - 1 || submitLoading}
            >
              Next
            </Button>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: "pre-line" }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            {/* Date Field */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Request Date"
                type="date"
                size="small"
                value={currentMaterial.tanggal_permintaan}
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
                value={currentMaterial.nama_material}
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
                value={currentMaterial.deskripsi_material}
                onChange={handleInputChange("deskripsi_material")}
                required
              />
            </Grid>

            {/* Material Group - Required */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Material Group</InputLabel>
                <Select
                  value={currentMaterial.material_group}
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
                  value={currentMaterial.sub_material_group}
                  onChange={handleInputChange("sub_material_group")}
                  label="Sub Material Group"
                  disabled={!currentMaterial.material_group || loading}
                  displayEmpty
                  sx={{
                    opacity: !currentMaterial.material_group ? 0.6 : 1,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderStyle: !currentMaterial.material_group ? "dashed" : "solid",
                    },
                  }}
                >
                  {(subGroups[currentMaterialIndex] || []).map(subGroup => (
                    <MenuItem key={subGroup.id} value={subGroup.id}>
                      {subGroup.name}
                    </MenuItem>
                  ))}
                </Select>
                {!currentMaterial.material_group && (
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
                value={currentMaterial.uom}
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
                value={currentMaterial.register_number}
                onChange={handleInputChange("register_number")}
              />
            </Grid>

            {/* Aliases Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
                Aliases
              </Typography>
            </Grid>

            {/* Alias 1 */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Alias 1"
                placeholder="Enter alternative name or code"
                size="small"
                value={currentMaterial.alias1}
                onChange={handleInputChange("alias1")}
              />
            </Grid>

            {/* Alias 2 */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Alias 2"
                placeholder="Enter alternative name or code"
                size="small"
                value={currentMaterial.alias2}
                onChange={handleInputChange("alias2")}
              />
            </Grid>

            {/* Alias 3 */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Alias 3"
                placeholder="Enter alternative name or code"
                size="small"
                value={currentMaterial.alias3}
                onChange={handleInputChange("alias3")}
              />
            </Grid>

            {/* Technical Specifications Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, mt: 2, fontWeight: "bold" }}>
                Technical Specifications
              </Typography>
            </Grid>

            {/* Part Number */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Part Number"
                placeholder="e.g., 24102-062074"
                size="small"
                value={currentMaterial.part_number}
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
                value={currentMaterial.dimensi}
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
                value={currentMaterial.berat}
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
                value={currentMaterial.bahan}
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
                value={currentMaterial.type}
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
                value={currentMaterial.series}
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
                value={currentMaterial.power}
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
                value={currentMaterial.plant}
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
                value={currentMaterial.storage_location}
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
                value={currentMaterial.valuation_type}
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
                value={currentMaterial.other_specification}
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
                value={currentMaterial.catatan_tambahan}
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
                    onChange={handleFileChange()}
                  />
                </Button>
                <Typography variant="caption" display="block" color="text.secondary">
                  Allowed: PDF, DOC, DOCX, PNG, JPG, JPEG (Max 5MB each)
                </Typography>
              </Box>

              {currentMaterial.files.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {currentMaterial.files.map((file, fileIndex) => (
                    <Chip
                      key={fileIndex}
                      label={file.name}
                      onDelete={() => removeFile(fileIndex)}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
          <Button onClick={handleClose} disabled={submitLoading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitLoading}>
            {submitLoading ? <CircularProgress size={24} /> : ("Submit Request" + (materials.length > 1 ? "s" : ""))}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default MaterialRequestModal;