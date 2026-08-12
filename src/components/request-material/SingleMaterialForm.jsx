import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Autocomplete,
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
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import { Delete, InfoOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import SearchableSelect from "../common/SearchableSelect";
import SectionLoadingSkeleton from "../common/SectionLoadingSkeleton";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { getValidationHint } from "./specFieldValidation.js";
import { formatIdrInput, parseIdrInput } from "../../helper/idrFormat.js";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE_MB,
  getAttachmentExtension,
  getAttachmentValidationError,
  normalizeAttachmentSelection,
} from "./attachmentValidation.js";
import {
  mapRequesterServerErrors,
  validateRequesterDraft,
  validateRequesterField,
  validateTemplateField,
} from "./singleMaterialFormValidation.js";


const DEFAULT_STATE = {
  materialGroup: "",
  subgroup: "",
  schema: null,
  visibleSections: [],
  subgroupOptions: [],
  // Price defaults to Rp 1 (not 0/blank) on a fresh Create form; it's a
  // persistent request field (STATIC_REQUEST_FIELD_KEYS) so it survives
  // material group changes, and the requester can still edit or clear it.
  requestFieldValues: { moving_avg_price: "1" },
  templateFieldValues: {},
};

const STATIC_REQUEST_FIELD_KEYS = ["moving_avg_price"];

const isVisibleField = field => !field?.isHidden;

const toFieldDefaultValue = field => {
  if (field?.defaultValue === null || field?.defaultValue === undefined) {
    return "";
  }

  return field.defaultValue;
};

const isTemplateField = field => field?.kind === "template_field";

const createSubgroupOptionLabel = subgroup => {
  const code = String(subgroup?.code || "").trim();
  const name = String(subgroup?.name || "").trim();

  if (code && name) {
    return `${code} - ${name}`;
  }

  return code || name;
};

const createSubgroupOptionValue = subgroup =>
  subgroup?.id ?? subgroup?.value ?? subgroup?.code ?? "";

const normalizeSections = sections =>
  (Array.isArray(sections) ? sections : [])
    .map(section => {
      const visibleFields = (Array.isArray(section?.fields) ? section.fields : []).filter(
        isVisibleField
      );

      return {
        ...section,
        fields: visibleFields,
      };
    })
    .filter(section => section.fields.length > 0);

const buildFieldValues = sections => {
  const requestFieldValues = {};
  const templateFieldValues = {};

  for (const section of sections) {
    for (const field of section.fields) {
      const target = isTemplateField(field) ? templateFieldValues : requestFieldValues;
      target[field.fieldKey] = toFieldDefaultValue(field);
    }
  }

  return {
    requestFieldValues,
    templateFieldValues,
  };
};

const pickStaticRequestFieldValues = currentState =>
  STATIC_REQUEST_FIELD_KEYS.reduce((values, fieldKey) => {
    const value = currentState?.requestFieldValues?.[fieldKey];
    if (value !== undefined) {
      values[fieldKey] = value;
    }

    return values;
  }, {});

const createDynamicFormState = overrides => ({
  ...DEFAULT_STATE,
  ...(overrides || {}),
});

const applyMaterialGroupSchema = (currentState, schemaPayload) => {
  const visibleSections = normalizeSections(schemaPayload?.sections);
  const { requestFieldValues, templateFieldValues } = buildFieldValues(visibleSections);
  const subgroups = Array.isArray(schemaPayload?.subgroups) ? schemaPayload.subgroups : [];

  return {
    ...createDynamicFormState(currentState),
    materialGroup:
      schemaPayload?.materialGroup?.code ??
      currentState?.materialGroup ??
      DEFAULT_STATE.materialGroup,
    schema: schemaPayload || null,
    visibleSections,
    subgroupOptions: subgroups.map(subgroup => ({
      value: createSubgroupOptionValue(subgroup),
      label: createSubgroupOptionLabel(subgroup),
      data: subgroup,
    })),
    requestFieldValues: {
      ...requestFieldValues,
      ...pickStaticRequestFieldValues(currentState),
    },
    templateFieldValues,
  };
};

const resetForMaterialGroupChange = currentState => ({
  ...createDynamicFormState(currentState),
  subgroup: "",
  templateFieldValues: {},
  requestFieldValues: {},
});

// Header order of the brand categories in the Sub Material Group dropdown.
const SUBGROUP_CATEGORY_ORDER = ["Acuator (Brand)", "Solenoid Valve (Brand)", "Other"];

/** Only material group 901* splits its subgroups into brand categories. */
const isBrandGroupedMaterialGroup = materialGroup =>
  Boolean(materialGroup) && String(materialGroup).startsWith("901");

/**
 * Resolve which brand category a subgroup option belongs to, by subgroup code
 * first and brand name second.
 *
 * @param {{ value: *, label: string, data?: object }} option
 * @returns {string} one of SUBGROUP_CATEGORY_ORDER
 */
const getSubgroupCategory = option => {
  const code = String(option?.data?.code || option?.value || "");
  const name = String(option?.data?.name || option?.label || "").toLowerCase();

  if (["002", "050"].includes(code) || name.includes("gestra") || name.includes("actiar")) {
    return "Acuator (Brand)";
  }

  if (["103", "105"].includes(code) || name.includes("danfoos") || name.includes("smc")) {
    return "Solenoid Valve (Brand)";
  }

  return "Other";
};

/**
 * Tag subgroup options with their brand category for SearchableSelect's grouping,
 * and sort them so each category renders under exactly one header.
 *
 * The sort is required, not cosmetic: SearchableSelect passes `group` to MUI's
 * groupBy, which starts a new header on every change of value as it walks the
 * list. Interleaved categories would repeat headers ("Acuator, Solenoid, Acuator").
 * Array.prototype.sort is stable, so options keep their API order within a category.
 *
 * Non-901 material groups are returned untouched — no `group` key, so the dropdown
 * stays a flat list.
 *
 * @param {{ value: *, label: string, data?: object }[]} subgroupOptions
 * @param {string} materialGroup - currently selected material group code
 * @returns {{ value: *, label: string, group?: string }[]}
 */
const buildSubgroupSelectOptions = (subgroupOptions, materialGroup) => {
  const options = Array.isArray(subgroupOptions) ? subgroupOptions : [];

  if (!isBrandGroupedMaterialGroup(materialGroup)) {
    return options;
  }

  return options
    .map(option => ({ ...option, group: getSubgroupCategory(option) }))
    .sort(
      (a, b) =>
        SUBGROUP_CATEGORY_ORDER.indexOf(a.group) - SUBGROUP_CATEGORY_ORDER.indexOf(b.group)
    );
};

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];
const isImageFile = fileName => {
  const ext = getAttachmentExtension(fileName).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
};

const parsePayload = payload => {
  if (!payload) {
    return {};
  }

  if (typeof payload === "object") {
    return payload;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return {};
  }
};

const normalizeExistingAttachment = attachment => ({
  id: attachment?.id ?? null,
  name: attachment?.file_name || attachment?.fileName || attachment?.name || "Existing file",
  type: attachment?.file_type || attachment?.fileType || attachment?.type || "",
  path: attachment?.file_path || attachment?.filePath || attachment?.path || "",
  existing: true,
});

const isExistingAttachment = attachment => Boolean(attachment?.existing);

const getAttachmentName = attachment => attachment?.name || attachment?.file_name || "Attachment";
const getAttachmentPreviewSrc = attachment =>
  attachment instanceof File
    ? URL.createObjectURL(attachment)
    : attachment?.path
      ? `${import.meta.env.VITE_URL_LOC}/material/file/${attachment.path}`
      : "";

const getRequestValue = (sources, ...keys) => {
  for (const key of keys) {
    for (const source of sources) {
      const value = source?.[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }

  return "";
};

const getPersistentRequestFields = (requestFieldValues, formData) => {
  const fields = {};
  const plant = requestFieldValues?.plant || formData?.plant || "";
  const storageLocation = requestFieldValues?.storage_location || formData?.storageLocation || "";
  const materialType = requestFieldValues?.material_type || formData?.materialType || "";
  const movingAvgPrice = requestFieldValues?.moving_avg_price || "";

  if (plant) {
    fields.plant = plant;
  }
  if (storageLocation) {
    fields.storage_location = storageLocation;
  }
  if (materialType) {
    fields.material_type = materialType;
  }
  if (movingAvgPrice) {
    fields.moving_avg_price = movingAvgPrice;
  }

  return fields;
};

const mergePersistentRequestFields = (nextRequestFieldValues, previousRequestFieldValues, formData) => ({
  ...nextRequestFieldValues,
  ...getPersistentRequestFields(previousRequestFieldValues, formData),
});

const buildReworkFormState = ({ row, schemaPayload, formData }) => {
  const payload = parsePayload(row?.template_payload ?? row?.templatePayload);
  const payloadRequestFields = payload?.requestFields || {};
  const payloadTemplateValues = payload?.templateValues || {};
  const rowRequestFields = row?.request_fields || row?.requestFields || {};
  const rowTemplateValues = row?.template_values || row?.templateValues || {};
  const formDataRequestFields = {
    plant: formData?.plant,
    storage_location: formData?.storageLocation,
    material_type: formData?.materialType,
  };
  const requestSources = [formDataRequestFields, rowRequestFields, payloadRequestFields, row];
  const materialGroupCode =
    row?.material_group_code || row?.materialGroupCode || payloadRequestFields.material_group || "";
  const baseState = applyMaterialGroupSchema(
    createDynamicFormState({
      materialGroup: materialGroupCode,
    }),
    schemaPayload || {}
  );

  return {
    ...baseState,
    subgroup:
      row?.material_sub_group_id ??
      row?.materialSubGroupId ??
      row?.sub_material_group_id ??
      row?.subgroup ??
      "",
    requestFieldValues: {
      ...baseState.requestFieldValues,
      plant: getRequestValue(requestSources, "plant", "plant_code", "plantCode"),
      storage_location: getRequestValue(
        requestSources,
        "storage_location",
        "storageLocation",
        "sloc_code",
        "slocCode"
      ),
      material_type: getRequestValue(requestSources, "material_type", "materialType"),
      material_group: materialGroupCode,
      material_description:
        row?.material_description ||
        row?.materialDescription ||
        getRequestValue(requestSources, "material_description"),
      base_unit_of_measure:
        row?.uom ||
        row?.base_uom ||
        row?.baseUom ||
        getRequestValue(requestSources, "base_unit_of_measure", "base_uom"),
      moving_avg_price: getRequestValue(
        requestSources,
        "moving_avg_price",
        "movingAvgPrice",
        "MOVING_AVG_PRICE"
      ),
      long_text_1:
        row?.long_text_1 || row?.longText1 || getRequestValue(requestSources, "long_text_1"),
      long_text_2:
        row?.long_text_2 || row?.longText2 || getRequestValue(requestSources, "long_text_2"),
      long_text_3:
        row?.long_text_3 || row?.longText3 || getRequestValue(requestSources, "long_text_3"),
    },
    templateFieldValues: {
      ...baseState.templateFieldValues,
      ...payloadTemplateValues,
      ...rowTemplateValues,
    },
  };
};

const SingleMaterialForm = ({
  onBack,
  formData,
  prefetchedGroups = [],
  schemaCache = {},
  mode = "create",
  requestId = "",
  ticketNumber = "",
}) => {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const isReworkMode = mode === "rework";
  // Read-only: same layout as the request form, loads an existing request like
  // rework, but every input is disabled and there is no Save action.
  const isViewMode = mode === "view";
  const isExistingRequestMode = isReworkMode || isViewMode;
  const [materialGroups, setMaterialGroups] = useState([]);
  const [formState, setFormState] = useState(() => createDynamicFormState());
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [loadingExistingRequest, setLoadingExistingRequest] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const fileInputRef = useRef(null);
  const latestSchemaRequestRef = useRef(0);
  const activeMaterialGroupRef = useRef("");

  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");

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

  useEffect(() => {
    if (!isExistingRequestMode || !requestId) {
      return undefined;
    }

    let active = true;

    const loadExistingRequest = async () => {
      try {
        setLoadingExistingRequest(true);
        setSubmitError("");
        const detailResponse = await axiosPrivate.get(`/material/requests/single/${requestId}`);
        const row = detailResponse.data?.data || {};
        const payload = parsePayload(row?.template_payload ?? row?.templatePayload);
        const materialGroupCode =
          row?.material_group_code || row?.materialGroupCode || payload?.requestFields?.material_group || "";

        const [groupsResponse, schemaResponse] = await Promise.all([
          prefetchedGroups.length > 0
            ? Promise.resolve({ data: { success: true, data: prefetchedGroups } })
            : axiosPrivate.get("/material/groups/dropdown"),
          materialGroupCode
            ? axiosPrivate.get(`/material/groups/${materialGroupCode}/form-schema`)
            : Promise.resolve({ data: { data: null } }),
        ]);

        if (!active) {
          return;
        }

        const groups = groupsResponse.data?.success
          ? groupsResponse.data.data || []
          : Array.isArray(groupsResponse.data?.data)
            ? groupsResponse.data.data
            : [];

        setMaterialGroups(groups);
        activeMaterialGroupRef.current = materialGroupCode;
        setFormState(
          buildReworkFormState({
            row,
            schemaPayload: schemaResponse.data?.data || {},
            formData,
          })
        );
        setAttachments(
          Array.isArray(row?.attachments) ? row.attachments.map(normalizeExistingAttachment) : []
        );
        setFieldErrors({});
      } catch (error) {
        console.error("Failed to load existing single request", error);
        if (active) {
          setSubmitError("Failed to load existing request data.");
        }
      } finally {
        if (active) {
          setLoadingExistingRequest(false);
        }
      }
    };

    loadExistingRequest();

    return () => {
      active = false;
    };
  }, [axiosPrivate, formData, isExistingRequestMode, prefetchedGroups, requestId]);

  const [uomOptions, setUomOptions] = useState([]);

  useEffect(() => {
    let active = true;
    axiosPrivate.get("/material/uom").then(res => {
      if (active && res.data?.success) {
        setUomOptions(res.data.data || []);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [axiosPrivate]);

  const applySchemaFromCache = useCallback(
    groupCode => {
      const cachedSchema = schemaCache[groupCode];
      if (cachedSchema) {
        if (activeMaterialGroupRef.current !== groupCode) {
          return false;
        }
        setFormState(prev => {
          const nextState = applyMaterialGroupSchema(prev, cachedSchema);
          return {
            ...nextState,
            requestFieldValues: mergePersistentRequestFields(
              nextState.requestFieldValues,
              prev.requestFieldValues,
              formData
            ),
          };
        });
        setFieldErrors({});
        return true;
      }
      return false;
    },
    [formData, schemaCache]
  );

  const loadSchemaFromApi = useCallback(
    async groupCode => {
      const requestSequence = latestSchemaRequestRef.current + 1;
      latestSchemaRequestRef.current = requestSequence;

      try {
        const response = await axiosPrivate.get(`/material/groups/${groupCode}/form-schema`);
        if (
          response.data?.data &&
          latestSchemaRequestRef.current === requestSequence &&
          activeMaterialGroupRef.current === groupCode
        ) {
          setFormState(prev => {
            const nextState = applyMaterialGroupSchema(prev, response.data.data);
            return {
              ...nextState,
              requestFieldValues: mergePersistentRequestFields(
                nextState.requestFieldValues,
                prev.requestFieldValues,
                formData
              ),
            };
          });
          setFieldErrors({});
        }
      } catch (err) {
        console.error("Failed to load schema", err);
      }
    },
    [axiosPrivate, formData]
  );

  const handleGroupChange = newGroup => {
    activeMaterialGroupRef.current = newGroup;
    setFormState(prev => {
      const nextState = resetForMaterialGroupChange(prev);
      return {
        ...nextState,
        materialGroup: newGroup,
        requestFieldValues: mergePersistentRequestFields(
          nextState.requestFieldValues,
          prev.requestFieldValues,
          formData
        ),
      };
    });
    setFieldErrors({});

    if (newGroup) {
      const fromCache = applySchemaFromCache(newGroup);
      if (!fromCache) {
        loadSchemaFromApi(newGroup);
      }
    }
  };

  const handleSubgroupChange = newSubgroup => {
    setFormState(prev => ({ ...prev, subgroup: newSubgroup }));
    setFieldErrors(prev => ({
      ...prev,
      subgroup: validateRequesterField("subgroup", newSubgroup),
    }));
  };

  const handleRequestFieldChange = (fieldKey, value) => {
    setFormState(prev => ({
      ...prev,
      requestFieldValues: { ...prev.requestFieldValues, [fieldKey]: value },
    }));
    setFieldErrors(prev => ({
      ...prev,
      [fieldKey]: validateRequesterField(fieldKey, value),
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
    setSubmitError("");

    const result = normalizeAttachmentSelection(files, attachments);
    setAttachments(result.files);
    setAttachmentError(result.error || "");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
        plant: formState.requestFieldValues.plant || formData?.plant || "",
        storage_location:
          formState.requestFieldValues.storage_location || formData?.storageLocation || "",
        material_type: formState.requestFieldValues.material_type || formData?.materialType || "",
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

    const nextFieldErrors = validateRequesterDraft({ formState });
    if (isReworkMode) {
      if (!formState.requestFieldValues.plant) {
        nextFieldErrors.plant = { error: true, message: "Plant wajib diisi" };
      }
      if (!formState.requestFieldValues.storage_location) {
        nextFieldErrors.storage_location = {
          error: true,
          message: "Storage Location wajib diisi",
        };
      }
    }
    if (Object.values(nextFieldErrors).some(error => error?.error)) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = buildRequestPayload();
      const formPayload = new FormData();
      const keepAttachmentIds = attachments
        .filter(isExistingAttachment)
        .map(attachment => attachment.id)
        .filter(id => id !== null && id !== undefined);
      const newAttachments = attachments.filter(attachment => !isExistingAttachment(attachment));

      formPayload.append("materialGroupCode", payload.materialGroupCode);
      formPayload.append("subgroup", String(formState.subgroup));
      formPayload.append("requestFields", JSON.stringify(payload.requestFields));
      formPayload.append("templateValues", JSON.stringify(payload.templateValues));
      formPayload.append("attachments", JSON.stringify({ keepAttachmentIds }));

      newAttachments.forEach(file => {
        formPayload.append("files", file);
      });

      if (isReworkMode) {
        await axiosPrivate.put(`/material/requests/single/${requestId}/rework`, formPayload, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        await axiosPrivate.post("/material/requests/single", formPayload, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      setSaveSuccessOpen(true);
    } catch (error) {
      const mappedFieldErrors = mapRequesterServerErrors(error?.response?.data?.errors);
      const message =
        error?.response?.data?.errors?.[0]?.message ||
        error?.response?.data?.message ||
        `Failed to ${isReworkMode ? "save revised" : "save"} single material request.`;
      if (Object.keys(mappedFieldErrors).length > 0) {
        setFieldErrors(prev => ({
          ...prev,
          ...mappedFieldErrors,
        }));
      }
      setSubmitError(Object.keys(mappedFieldErrors).length > 0 ? "" : message);
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

  // Memoized so unrelated re-renders (typing in Price, editing a spec field) don't
  // rebuild and re-sort both option lists on every keystroke.
  const materialGroupOptions = useMemo(
    () =>
      materialGroups.map(group => ({
        value: group.code,
        label: `${group.code} - ${group.name}`,
      })),
    [materialGroups]
  );
  const subgroupSelectOptions = useMemo(
    () => buildSubgroupSelectOptions(formState.subgroupOptions, formState.materialGroup),
    [formState.subgroupOptions, formState.materialGroup]
  );

  const specificationFields = (formState.visibleSections || [])
    .flatMap(section => section.fields || [])
    .filter(field => field.kind === "template_field");
  const hasSelectedMaterialGroup = Boolean(formState.materialGroup);
  const showSpecificationSection = !hasSelectedMaterialGroup || specificationFields.length > 0;
  const handleSpecFieldChange = (field, rawValue) => {
    const value = rawValue.toUpperCase();

    handleTemplateFieldChange(field.fieldKey, value);

    // Typing only ever *clears* an error the user is in the middle of fixing;
    // raising one is the blur path's job. Clearing goes through the full
    // validator so a whitespace-only value can no longer wipe a required error.
    setFieldErrors(prev => {
      if (!prev[field.fieldKey]?.error) {
        return prev;
      }

      return { ...prev, [field.fieldKey]: validateTemplateField(value, field) };
    });
  };

  const renderSpecField = field => {
    const value = formState.templateFieldValues[field.fieldKey] || "";
    const validation = fieldErrors[field.fieldKey] || { error: false, message: "" };
    const hintText = getValidationHint(field);

    const handleChange = e => {
      handleSpecFieldChange(field, e.target.value);
    };

    const handleBlur = () => {
      const result = validateTemplateField(value, field);
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
            disabled={isViewMode}
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

  const selectedUomOption = uomOptions.find(
    opt => opt.uom_code === formState.requestFieldValues.base_unit_of_measure
  ) || null;

  if (loadingExistingRequest) {
    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 0,
          border: "1px solid",
          borderColor: "divider",
          width: "100%",
          maxWidth: 1000,
          mx: "auto",
          mb: 4,
        }}
      >
        {/* This form is the whole body of the read-only detail modal opened
            from a ticket number, so it loads the way every other late-fetched
            section of those modals does: skeleton lines shaped like the two
            field groups that are about to arrive, in the card that will hold
            them — not a spinner in an empty box. */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            minHeight: 320,
            px: 3,
            py: 5,
          }}
        >
          <SectionLoadingSkeleton lines={2} height={44} spacing={2} />
          <SectionLoadingSkeleton lines={4} height={44} spacing={2} />
        </Box>
      </Card>
    );
  }

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
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#455a64" }}>
            {isViewMode ? "Request Detail" : "Form Material"}
          </Typography>
          {isViewMode && ticketNumber && (
            <Typography variant="caption" color="text.secondary">
              {ticketNumber}
            </Typography>
          )}
        </Box>
      </Box>

      <CardContent sx={{ p: 4 }}>
        <Grid container spacing={4}>
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
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Material Group <span style={{ color: "red" }}>*</span>
                </Typography>
                <SearchableSelect
                  options={materialGroupOptions}
                  value={formState.materialGroup}
                  onChange={handleGroupChange}
                  disabled={isViewMode}
                  error={Boolean(fieldErrors.materialGroup?.error)}
                  helperText={fieldErrors.materialGroup?.message || ""}
                  noOptionsText="No material group found"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Sub Material Group
                </Typography>
                <SearchableSelect
                  options={subgroupSelectOptions}
                  value={formState.subgroup}
                  onChange={handleSubgroupChange}
                  disabled={isViewMode || !formState.materialGroup}
                  error={Boolean(fieldErrors.subgroup?.error)}
                  helperText={fieldErrors.subgroup?.message || ""}
                  noOptionsText="No sub material group found"
                  sx={{
                    backgroundColor: !formState.materialGroup ? "#f5f5f5" : "white",
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Base UoM <span style={{ color: "red" }}>*</span>
                </Typography>
                <Autocomplete
                  fullWidth
                  size="small"
                  disabled={isViewMode}
                  options={uomOptions}
                  value={selectedUomOption}
                  onChange={(_, val) => handleRequestFieldChange("base_unit_of_measure", val?.uom_code || "")}
                  noOptionsText="No UoM found"
                  isOptionEqualToValue={(opt, val) => opt?.uom_code === val?.uom_code}
                  getOptionLabel={opt => opt?.uom_code ? `${opt.uom_code} - ${opt.description}` : ""}
                  renderInput={params => (
                    <TextField
                      {...params}
                      error={Boolean(fieldErrors.base_unit_of_measure?.error)}
                      helperText={fieldErrors.base_unit_of_measure?.message || ""}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Price
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  disabled={isViewMode}
                  // State keeps the plain numeric string ("1500000.5") so
                  // validation and the SAP payload are untouched; only the
                  // rendered input shows the rupiah form ("1.500.000,5").
                  value={formatIdrInput(formState.requestFieldValues.moving_avg_price || "")}
                  onChange={e => {
                    const next = parseIdrInput(e.target.value);
                    // Numbers only (optional single decimal). Ignore any
                    // keystroke that would make it non-numeric.
                    if (next === "" || /^\d*\.?\d*$/.test(next)) {
                      handleRequestFieldChange("moving_avg_price", next);
                    }
                  }}
                  placeholder="Input price"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
                  }}
                  inputProps={{ maxLength: 50, inputMode: "decimal" }}
                  error={Boolean(fieldErrors.moving_avg_price?.error)}
                  helperText={fieldErrors.moving_avg_price?.message || ""}
                />
              </Grid>
            </Grid>
          </Grid>

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

          <Grid item xs={12}>
            <Divider sx={{ mb: 4 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
              Attachment {!isViewMode && <span style={{ color: "red" }}>*</span>}
            </Typography>
            {!isViewMode && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  supported formats: PDF, DOC, DOCX, PNG, JPG, JPEG
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  ukuran file maksimal {MAX_ATTACHMENT_SIZE_MB}MB per attachment
                </Typography>

                <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
                  <Button
                    variant="outlined"
                    onClick={handleBrowseClick}
                    disabled={attachments.length >= MAX_ATTACHMENTS}
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
                </Box>
              </>
            )}

            {attachmentError && (
              <Typography variant="subtitle2" component="p" color="error" sx={{ mb: 2 }}>
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
                  key={file.id || `${getAttachmentName(file)}-${i}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  <Box
                    component="a"
                    href={getAttachmentPreviewSrc(file)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Preview ${getAttachmentName(file)}`}
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: "#eeeeee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 1,
                      overflow: "hidden",
                      position: "relative",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                  >
                    {isImageFile(getAttachmentName(file)) && (
                      <Box
                        component="img"
                        src={getAttachmentPreviewSrc(file)}
                        onError={e => {
                          e.target.style.opacity = "0.15";
                          e.target.style.filter = "grayscale(100%)";
                        }}
                        sx={{
                          width: 44,
                          height: 44,
                          objectFit: "cover",
                          position: "absolute",
                          top: 0,
                          left: 0,
                        }}
                      />
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: "#757575",
                        position: "absolute",
                        lineHeight: 1,
                      }}
                    >
                      {getAttachmentExtension(getAttachmentName(file)).toUpperCase() || "FILE"}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      component="a"
                      href={getAttachmentPreviewSrc(file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: "block",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "inherit",
                        textDecoration: "none",
                        cursor: "pointer",
                        "&:hover": { textDecoration: "underline", color: "primary.main" },
                      }}
                    >
                      {getAttachmentName(file)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                      {isExistingAttachment(file)
                        ? "Existing file"
                        : formatAttachmentSize(file.size)}
                    </Typography>
                  </Box>
                  {!isViewMode && (
                    <IconButton size="small" color="error" onClick={() => handleRemoveAttachment(i)} sx={{ flexShrink: 0 }}>
                      <Delete />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>

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
        {!isViewMode && (
          <Button
            variant="contained"
            disableElevation
            onClick={handleSave}
            disabled={submitting || (isReworkMode && !requestId)}
            sx={{ bgcolor: "#1976d2", textTransform: "none", minWidth: 100 }}
          >
            {submitting ? "Saving..." : isReworkMode ? "Save Revision" : "Save"}
          </Button>
        )}
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
          <Typography>
            {isReworkMode ? "Revised request saved successfully" : "Saved successfully"}
          </Typography>
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
