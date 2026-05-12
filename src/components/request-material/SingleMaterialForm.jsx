import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
  Tooltip,
  MenuItem,
  ListSubheader,
  Select,
} from "@mui/material";
import { Delete, InfoOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  createDynamicFormState,
  applyMaterialGroupSchema,
  resetForMaterialGroupChange,
} from "./materialRequestSchema.js";
import { validateSpecField, getValidationHint } from "./specFieldValidation.js";
import {
  MAX_ATTACHMENTS,
  getAttachmentExtension,
  getAttachmentValidationError,
  normalizeAttachmentSelection,
} from "./attachmentValidation.mjs";

const SingleMaterialForm = ({ onBack, formData, prefetchedGroups = [], schemaCache = {} }) => {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const [materialGroups, setMaterialGroups] = useState([]);
  const [formState, setFormState] = useState(() => createDynamicFormState());
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);

  // Track per-field validation errors: { [fieldKey]: { error, message } }
  const [fieldErrors, setFieldErrors] = useState({});
  const fileInputRef = useRef(null);
  const latestSchemaRequestRef = useRef(0);
  const activeMaterialGroupRef = useRef("");

  const [attachments, setAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");

  const compactDropdownMenuProps = {
    anchorOrigin: {
      vertical: "bottom",
      horizontal: "left",
    },
    transformOrigin: {
      vertical: "top",
      horizontal: "left",
    },
    variant: "menu",
    PaperProps: {
      sx: {
        maxHeight: 260,
        mt: 0.5,
      },
    },
  };

  // Use pre-fetched groups if available, otherwise fetch on mount
  useEffect(() => {
    if (prefetchedGroups.length > 0) {
      setMaterialGroups(prefetchedGroups);
      return;
    }

    const fetchGroups = async () => {
      try {
        const response = await axiosPrivate.get("/material/groups/dropdown");
        if (response.data?.success) {
          setMaterialGroups(response.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load material groups", err);
      }
    };
    fetchGroups();
  }, [axiosPrivate, prefetchedGroups]);

  // Apply schema from cache instantly when material group changes
  const applySchemaFromCache = useCallback(
    groupCode => {
      const cachedSchema = schemaCache[groupCode];
      if (cachedSchema) {
        if (activeMaterialGroupRef.current !== groupCode) {
          return false;
        }
        setFormState(prev => applyMaterialGroupSchema(prev, cachedSchema));
        // Clear field errors when changing groups
        setFieldErrors({});
        return true;
      }
      return false;
    },
    [schemaCache]
  );

  const loadSchemaFromApi = useCallback(
    async groupCode => {
      const requestId = latestSchemaRequestRef.current + 1;
      latestSchemaRequestRef.current = requestId;

      try {
        const response = await axiosPrivate.get(`/material/groups/${groupCode}/form-schema`);
        if (
          response.data?.data &&
          latestSchemaRequestRef.current === requestId &&
          activeMaterialGroupRef.current === groupCode
        ) {
          setFormState(prev => applyMaterialGroupSchema(prev, response.data.data));
          setFieldErrors({});
        }
      } catch (err) {
        console.error("Failed to load schema", err);
      }
    },
    [axiosPrivate]
  );

  const handleGroupChange = e => {
    const newGroup = e.target.value;
    activeMaterialGroupRef.current = newGroup;
    setFormState(prev => resetForMaterialGroupChange(prev));
    setFormState(prev => ({ ...prev, materialGroup: newGroup }));
    setFieldErrors({});

    if (newGroup) {
      // Try cache first (instant), fallback to API
      const fromCache = applySchemaFromCache(newGroup);
      if (!fromCache) {
        loadSchemaFromApi(newGroup);
      }
    }
  };

  const handleSubgroupChange = e => {
    const newSubgroup = e.target.value;
    setFormState(prev => ({ ...prev, subgroup: newSubgroup }));
  };

  const handleRequestFieldChange = (fieldKey, value) => {
    setFormState(prev => ({
      ...prev,
      requestFieldValues: { ...prev.requestFieldValues, [fieldKey]: value },
    }));
  };

  const handleTemplateFieldChange = (fieldKey, value) => {
    setFormState(prev => ({
      ...prev,
      templateFieldValues: { ...prev.templateFieldValues, [fieldKey]: value },
    }));
  };

  const formatAttachmentSize = size => `${(size / 1024 / 1024).toFixed(2)}MB`;

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = event => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setAttachmentError("");
    setSubmitError("");
  };

  const handleUploadAttachments = () => {
    const result = normalizeAttachmentSelection(selectedFiles, attachments);
    setAttachments(result.files);
    setAttachmentError(result.error || "");

    if (!result.error) {
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAttachment = indexToRemove => {
    const nextAttachments = attachments.filter((_, index) => index !== indexToRemove);
    setAttachments(nextAttachments);
    setAttachmentError("");
    setSubmitError("");
  };

  const buildRequestPayload = useCallback(
    () => ({
      materialGroupCode: formState.materialGroup,
      requestFields: {
        ...formState.requestFieldValues,
        plant: formData?.plant || "",
        storage_location: formData?.storageLocation || "",
        material_type: formData?.materialType || "",
        material_group: formState.materialGroup || "",
      },
      templateValues: formState.templateFieldValues,
    }),
    [formData, formState.materialGroup, formState.requestFieldValues, formState.templateFieldValues]
  );

  const handleSave = async () => {
    const validationMessage = getAttachmentValidationError(attachments);
    setAttachmentError(validationMessage);
    setSubmitError("");

    if (validationMessage) {
      return;
    }

    if (!formState.materialGroup) {
      setSubmitError("Material group wajib dipilih.");
      return;
    }

    if (!formState.subgroup) {
      setSubmitError("Sub material group wajib dipilih.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = buildRequestPayload();
      const formPayload = new FormData();

      formPayload.append("materialGroupCode", payload.materialGroupCode);
      formPayload.append("subgroup", String(formState.subgroup));
      formPayload.append("requestFields", JSON.stringify(payload.requestFields));
      formPayload.append("templateValues", JSON.stringify(payload.templateValues));

      attachments.forEach(file => {
        formPayload.append("files", file);
      });

      await axiosPrivate.post("/material/requests/single", formPayload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSaveSuccessOpen(true);
    } catch (error) {
      const message =
        error?.response?.data?.errors?.[0]?.message ||
        error?.response?.data?.message ||
        "Failed to save single material request.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessDialogClose = (_, reason) => {
    if (reason === "backdropClick" || reason === "escapeKeyDown") {
      return;
    }
  };

  const handleSuccessConfirm = () => {
    setSaveSuccessOpen(false);
    navigate("/dashboard/materials/request");
  };

  // Extract only the specification fields (template_field kind) from the schema
  const specificationFields = (formState.visibleSections || [])
    .flatMap(section => section.fields || [])
    .filter(field => field.kind === "template_field");
  const hasSelectedMaterialGroup = Boolean(formState.materialGroup);
  const showSpecificationSection = !hasSelectedMaterialGroup || specificationFields.length > 0;

  // Real-time validation handler for specification fields
  const handleSpecFieldChange = (field, rawValue) => {
    // Auto-uppercase for relevant rules
    const ruleType = (
      field.validationRuleType ||
      field.validation_rule_type ||
      "NONE"
    ).toUpperCase();
    const shouldUppercase = [
      "CAPITAL_NO_SPECIAL_CHARS",
      "ALPHANUMERIC_CAPITAL",
      "CAPITAL_ONLY",
    ].includes(ruleType);

    const value = shouldUppercase ? rawValue.toUpperCase() : rawValue;

    handleTemplateFieldChange(field.fieldKey, value);

    // Run validation
    const result = validateSpecField(value, field);
    setFieldErrors(prev => ({
      ...prev,
      [field.fieldKey]: result,
    }));
  };

  const renderSpecField = field => {
    const value = formState.templateFieldValues[field.fieldKey] || "";
    const validation = fieldErrors[field.fieldKey] || { error: false, message: "" };
    const hintText = getValidationHint(field);

    const handleChange = e => {
      handleSpecFieldChange(field, e.target.value);
    };

    const handleBlur = () => {
      // Re-validate on blur (catch empty mandatory, etc.)
      const result = validateSpecField(value, field);
      setFieldErrors(prev => ({
        ...prev,
        [field.fieldKey]: result,
      }));
    };

    return (
      <Grid item xs={12} md={6} key={field.fieldKey}>
        <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
          {field.label} {field.isRequired && <span style={{ color: "red" }}>*</span>}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            error={validation.error}
            helperText={validation.error ? validation.message : ""}
            placeholder={field.placeholder || ""}
            inputProps={{ maxLength: field.maxLength || undefined }}
            sx={{
              "& .MuiOutlinedInput-notchedOutline": {
                borderStyle: "dashed",
              },
            }}
          />
          {hintText && (
            <Tooltip
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Notes
                  </Typography>
                  <Typography variant="caption">{hintText}</Typography>
                </Box>
              }
              arrow
              placement="right"
            >
              <IconButton size="small" sx={{ color: "#3f51b5" }}>
                <InfoOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Grid>
    );
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 0,
        border: "1px solid",
        borderColor: "divider",
        maxWidth: 1000,
        mx: "auto",
        mb: 4,
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#455a64" }}>
          Form Material
        </Typography>
      </Box>

      <CardContent sx={{ p: 4 }}>
        <Grid container spacing={4}>
          {/* ========== BASIC INFO (Static) ========== */}
          <Grid item xs={12}>
            <Box
              sx={{
                display: "inline-block",
                px: 2,
                py: 0.5,
                bgcolor: "#4caf50",
                borderRadius: 5,
                mb: 3,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "white" }}>
                Basic Info
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Material Group */}
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Material Group <span style={{ color: "red" }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  select
                  value={formState.materialGroup}
                  onChange={handleGroupChange}
                  SelectProps={{
                    displayEmpty: true,
                    MenuProps: compactDropdownMenuProps,
                  }}
                >
                  <MenuItem value="" disabled>
                    Choose
                  </MenuItem>
                  {materialGroups.map(group => (
                    <MenuItem key={group.code} value={group.code}>
                      {group.code} - {group.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Sub Material Group */}
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Sub Material Group <span style={{ color: "red" }}>*</span>
                </Typography>
                <Select
                  value={formState.subgroup}
                  onChange={handleSubgroupChange}
                  disabled={!formState.materialGroup}
                  fullWidth
                  displayEmpty
                  MenuProps={compactDropdownMenuProps}
                  size="small"
                  sx={{
                    backgroundColor: !formState.materialGroup ? "#f5f5f5" : "white",
                  }}
                >
                  <MenuItem value="" disabled>
                    Choose
                  </MenuItem>
                  {(() => {
                    try {
                      const grouped = {};
                      const is901 =
                        formState.materialGroup &&
                        String(formState.materialGroup).startsWith("901");

                      (formState.subgroupOptions || []).forEach(opt => {
                        let cat = "";
                        if (is901) {
                          const code = String(opt.data?.code || opt.value || "");
                          const name = String(opt.data?.name || opt.label || "");
                          const nameLower = name.toLowerCase();
                          if (
                            ["002", "050"].includes(code) ||
                            nameLower.includes("gestra") ||
                            nameLower.includes("actiar")
                          ) {
                            cat = "Acuator (Brand)";
                          } else if (
                            ["103", "105"].includes(code) ||
                            nameLower.includes("danfoos") ||
                            nameLower.includes("smc")
                          ) {
                            cat = "Solenoid Valve (Brand)";
                          } else {
                            cat = "Other";
                          }
                        }

                        if (!grouped[cat]) grouped[cat] = [];
                        grouped[cat].push(opt);
                      });

                      const elements = [];
                      Object.entries(grouped).forEach(([groupName, opts]) => {
                        if (groupName) {
                          elements.push(
                            <ListSubheader
                              key={`header-${groupName}`}
                              sx={{ fontWeight: "bold", color: "#1976d2", lineHeight: "36px" }}
                            >
                              {groupName}
                            </ListSubheader>
                          );
                        }
                        opts.forEach(opt => {
                          elements.push(
                            <MenuItem
                              key={String(opt.value)}
                              value={opt.value}
                              sx={groupName ? { pl: 4 } : {}}
                            >
                              {opt.label}
                            </MenuItem>
                          );
                        });
                      });

                      return elements;
                    } catch (err) {
                      console.error("Error in subgroup optgroup rendering", err);
                      return formState.subgroupOptions?.map(opt => (
                        <MenuItem key={String(opt.value)} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ));
                    }
                  })()}
                </Select>
              </Grid>

              {/* Material Description */}
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Material Description <span style={{ color: "red" }}>*</span>
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={formState.requestFieldValues.material_description || ""}
                    onChange={e => handleRequestFieldChange("material_description", e.target.value)}
                    inputProps={{ maxLength: 40 }}
                    sx={{ "& .MuiOutlinedInput-notchedOutline": { borderStyle: "dashed" } }}
                  />
                  <Tooltip
                    title={
                      <Box sx={{ p: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          Notes
                        </Typography>
                        <Typography variant="caption">
                          Field length &le; 40 characters; only alphanumeric characters (A-Z, 0-9)
                          are permitted; spaces, special characters, and emojis are not allowed.
                        </Typography>
                      </Box>
                    }
                    arrow
                    placement="right"
                  >
                    <IconButton size="small" sx={{ color: "#3f51b5" }}>
                      <InfoOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>

              {/* Base UoM */}
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Base UoM <span style={{ color: "red" }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={formState.requestFieldValues.base_unit_of_measure || ""}
                  onChange={e => handleRequestFieldChange("base_unit_of_measure", e.target.value)}
                />
              </Grid>

              {/* Long Text (3 fields, 40 char each) */}
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Long Text
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={formState.requestFieldValues.long_text_1 || ""}
                  onChange={e => handleRequestFieldChange("long_text_1", e.target.value)}
                  inputProps={{ maxLength: 40 }}
                  sx={{ mb: 1, "& .MuiOutlinedInput-notchedOutline": { borderStyle: "dashed" } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  value={formState.requestFieldValues.long_text_2 || ""}
                  onChange={e => handleRequestFieldChange("long_text_2", e.target.value)}
                  inputProps={{ maxLength: 40 }}
                  sx={{ mb: 1, "& .MuiOutlinedInput-notchedOutline": { borderStyle: "dashed" } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  value={formState.requestFieldValues.long_text_3 || ""}
                  onChange={e => handleRequestFieldChange("long_text_3", e.target.value)}
                  inputProps={{ maxLength: 40 }}
                  sx={{ "& .MuiOutlinedInput-notchedOutline": { borderStyle: "dashed" } }}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* ========== SPECIFICATION (Dynamic — from pre-fetched template rules) ========== */}
          {showSpecificationSection && (
            <Grid item xs={12}>
              <Divider sx={{ mb: 4 }} />
              <Box
                sx={{
                  display: "inline-block",
                  px: 2,
                  py: 0.5,
                  bgcolor: "#4caf50",
                  borderRadius: 5,
                  mb: 3,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "white" }}>
                  Specification
                </Typography>
              </Box>
              {!hasSelectedMaterialGroup ? (
                <Typography variant="body2" color="text.secondary">
                  Pilih Material Group terlebih dahulu untuk menampilkan field specification.
                </Typography>
              ) : (
                <Grid container spacing={3}>
                  {specificationFields.map(renderSpecField)}
                </Grid>
              )}
            </Grid>
          )}

          {/* ========== ATTACHMENT ========== */}
          <Grid item xs={12}>
            <Divider sx={{ mb: 4 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
              Attachment <span style={{ color: "red" }}>*</span>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              supported formats: PDF, DOC, DOCX, PNG, JPG, JPEG
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              minimal 1 attachment, maksimal {MAX_ATTACHMENTS} attachments
            </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
              <Button
                variant="outlined"
                onClick={handleBrowseClick}
                sx={{ textTransform: "none", borderColor: "#1976d2", color: "#1976d2", px: 3 }}
              >
                Browsing File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleFileChange}
              />
              <Button
                variant="contained"
                disableElevation
                onClick={handleUploadAttachments}
                disabled={selectedFiles.length === 0 || attachments.length >= MAX_ATTACHMENTS}
                sx={{ textTransform: "none", bgcolor: "#1976d2", px: 4 }}
              >
                Upload
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file dipilih`
                : `${attachments.length}/${MAX_ATTACHMENTS} attachment terpasang`}
            </Typography>

            {attachmentError && (
              <Typography variant="caption" color="error" sx={{ display: "block", mb: 2 }}>
                {attachmentError}
              </Typography>
            )}

            {submitError && (
              <Typography variant="caption" color="error" sx={{ display: "block", mb: 2 }}>
                {submitError}
              </Typography>
            )}

            <Stack spacing={1}>
              {attachments.map((file, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    maxWidth: 400,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        bgcolor: "#eeeeee",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#757575" }}>
                        {getAttachmentExtension(file.name).toUpperCase() || "FILE"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatAttachmentSize(file.size)}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleRemoveAttachment(i)}>
                    <Delete />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>

      {/* Footer */}
      <Box
        sx={{
          p: 2.5,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
        }}
      >
        <Button
          variant="contained"
          sx={{
            bgcolor: "#546e7a",
            "&:hover": { bgcolor: "#455a64" },
            textTransform: "none",
            minWidth: 100,
          }}
          onClick={onBack}
        >
          Close
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={handleSave}
          disabled={submitting}
          sx={{ bgcolor: "#1976d2", textTransform: "none", minWidth: 100 }}
        >
          {submitting ? "Saving..." : "Save"}
        </Button>
      </Box>

      <Dialog
        open={saveSuccessOpen}
        onClose={handleSuccessDialogClose}
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Success</DialogTitle>
        <DialogContent>
          <Typography>Saved successfully</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleSuccessConfirm}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default SingleMaterialForm;
