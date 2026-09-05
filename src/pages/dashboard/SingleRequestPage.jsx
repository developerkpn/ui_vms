import { useState, useEffect } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
  Breadcrumbs,
  Link as MuiLink,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";
import SingleMaterialForm from "../../components/request-material/SingleMaterialForm";
import MassMaterialForm from "../../components/request-material/MassMaterialForm";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

const DEFAULT_MATERIAL_TYPE = "SPAR - Non Trade Material";
const INDUSTRY_SECTOR = "C - Chemical Industry";
const PREFERENCE_KEY = "material_request_preferences";

// The locked fields on the initial screen are readOnly, not disabled, and MUI
// styles readOnly identically to an editable field. Switching them to disabled
// would not help either: theme/overrides/Input.jsx deliberately un-greys
// Mui-disabled. So the "this is not yours to change" signal has to be carried
// here, on the fields themselves.
const LOCKED_FIELD_SX = {
  "& .MuiInputBase-root": { bgcolor: "action.hover" },
  "& .MuiOutlinedInput-notchedOutline": { borderStyle: "dashed" },
};

const parseTemplatePayload = payload => {
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

const normalizeInitialLocations = rawLocations => {
  const seenLocations = new Set();

  return (Array.isArray(rawLocations) ? rawLocations : []).filter(location => {
    const plantCode = location?.plant_code?.trim?.() || "";
    const storageLocation = location?.storage_location?.trim?.() || "";

    if (!plantCode || !storageLocation) {
      return false;
    }

    const key = `${plantCode}::${storageLocation}`;
    if (seenLocations.has(key)) {
      return false;
    }

    seenLocations.add(key);
    return true;
  });
};

const resolveLocationSelection = ({ locations, plant, storageLocation }) => {
  const matchedByPlantAndStorage = locations.find(
    location =>
      location.plant_code === plant &&
      location.storage_location === storageLocation
  );
  const matchedByStorageOnly = locations.find(
    location => location.storage_location === storageLocation
  );
  const matchedPlant = locations.some(location => location.plant_code === plant)
    ? plant
    : matchedByStorageOnly?.plant_code || "";

  return {
    plant: matchedPlant,
    storageLocation:
      matchedByPlantAndStorage?.storage_location ||
      matchedByStorageOnly?.storage_location ||
      "",
  };
};

export default function SingleRequestPage({ mode = "single" }) {
  const { id: requestId } = useParams();
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const isMassMode = mode === "mass";
  const isReworkMode = mode === "rework";
  const isSingleCreateMode = mode === "single";
  const usesInitialScreen = isSingleCreateMode;
  const needsInitialData = isSingleCreateMode || isReworkMode;
  const [step, setStep] = useState(1);
  const [rememberPreference, setRememberPreference] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prefetching, setPrefetching] = useState(false);

  // Data Master dari Database (Mapping Plant <-> Location)
  const [allLocations, setAllLocations] = useState([]);

  // Pre-fetched schema cache: { [groupCode]: schemaData }
  const [schemaCache, setSchemaCache] = useState({});
  // Pre-fetched material groups list
  const [materialGroupsList, setMaterialGroupsList] = useState([]);

  const [formData, setFormData] = useState({
    plant: "",
    storageLocation: "",
    materialType: DEFAULT_MATERIAL_TYPE,
    materialGroup: "",
    subMaterialGroup: "",
    description: "",
    uom: "",
    longText: "",
    partNumber: "",
    model: "",
    size: "",
    type: "",
    material: "",
    brand: "",
  });

  useEffect(() => {
    if (!needsInitialData) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [initialResponse, reworkResponse] = await Promise.all([
          axiosPrivate.get("/material/initial-screen-data"),
          isReworkMode && requestId
            ? axiosPrivate.get(`/material/requests/single/${requestId}`)
            : Promise.resolve({ data: { data: null } }),
        ]);

        if (!active) {
          return;
        }

        if (initialResponse.data.success) {
          const locations = normalizeInitialLocations(
            initialResponse.data?.data?.locations || []
          );

          setAllLocations(locations);

          if (isReworkMode) {
            const row = reworkResponse.data?.data || {};
            const payload = parseTemplatePayload(row?.template_payload ?? row?.templatePayload);
            const requestFields = payload?.requestFields || {};
            const selection = resolveLocationSelection({
              locations,
              plant: row?.plant_code || row?.plantCode || requestFields.plant || "",
              storageLocation:
                row?.sloc_code ||
                row?.slocCode ||
                requestFields.storage_location ||
                requestFields.storageLocation ||
                "",
            });

            setFormData(prev => ({
              ...prev,
              plant: selection.plant,
              storageLocation: selection.storageLocation,
              materialType:
                requestFields.material_type ||
                requestFields.materialType ||
                DEFAULT_MATERIAL_TYPE,
            }));
            setRememberPreference(false);
            setStep(2);
            return;
          }

          const saved = localStorage.getItem(PREFERENCE_KEY);
          if (!saved) {
            setFormData(prev => ({
              ...prev,
              materialType: DEFAULT_MATERIAL_TYPE,
            }));
            setRememberPreference(false);
            return;
          }

          let parsed = {};
          try {
            parsed = JSON.parse(saved) || {};
          } catch (parseError) {
            localStorage.removeItem(PREFERENCE_KEY);
          }

          const savedPlant = typeof parsed.plant === "string" ? parsed.plant : "";
          const savedStorageLocation =
            typeof parsed.storageLocation === "string" ? parsed.storageLocation : "";
          const selection = resolveLocationSelection({
            locations,
            plant: savedPlant,
            storageLocation: savedStorageLocation,
          });

          setFormData(prev => ({
            ...prev,
            plant: selection.plant,
            storageLocation: selection.storageLocation,
            materialType: DEFAULT_MATERIAL_TYPE,
          }));
          setRememberPreference(Boolean(savedPlant || savedStorageLocation));
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, [axiosPrivate, isReworkMode, requestId, needsInitialData]);

  // 2. Logika Filtering

  // Daftar Plant yang unik untuk dropdown
  const plantOptions = [...new Set(allLocations.map(l => l.plant_code).filter(Boolean))].sort();
  const selectedPlantOption = plantOptions.find(code => code === formData.plant) || null;

  // Map kode plant -> deskripsi master data, untuk label "KODE - Deskripsi"
  const plantDescriptionByCode = new Map(
    allLocations.filter(l => l.plant_code).map(l => [l.plant_code, l.plant_description])
  );
  const formatPlantLabel = code => {
    const desc = plantDescriptionByCode.get(code);
    return desc ? `${code} - ${desc}` : code;
  };
  const formatSlocLabel = option => {
    const base = option.sloc_description
      ? `${option.storage_location} - ${option.sloc_description}`
      : option.storage_location;
    return formData.plant ? base : `${base} (Plant: ${option.plant_code})`;
  };

  // Daftar Storage Location yang ditampilkan (terfilter atau semua)
  const storageOptions = (
    formData.plant ? allLocations.filter(l => l.plant_code === formData.plant) : allLocations
  ).filter(l => l.storage_location);
  const selectedStorageOption =
    storageOptions.find(location => location.storage_location === formData.storageLocation) ||
    allLocations.find(
      location =>
        location.storage_location === formData.storageLocation &&
        (!formData.plant || location.plant_code === formData.plant)
    ) ||
    null;

  // Sales Organization is auto-filled from the selected plant's company (one
  // sales org per company). Read-only / derived, not chosen by the requester.
  const selectedSalesOrgLocation = formData.plant
    ? allLocations.find(l => l.plant_code === formData.plant && l.sales_org_code)
    : null;
  const selectedSalesOrg = selectedSalesOrgLocation
    ? selectedSalesOrgLocation.sales_org_description
      ? `${selectedSalesOrgLocation.sales_org_code} - ${selectedSalesOrgLocation.sales_org_description}`
      : selectedSalesOrgLocation.sales_org_code
    : "";

  // 3. Handler Perubahan

  const handlePlantChange = (_, selectedPlant) => {
    setFormData(prev => {
      const newData = { ...prev, plant: selectedPlant || "" };

      // Validasi: Jika Sloc yang dipilih sebelumnya tidak ada di Plant baru, kosongkan Sloc
      const isValidSloc = selectedPlant
        ? allLocations.some(
            l => l.plant_code === selectedPlant && l.storage_location === prev.storageLocation
          )
        : allLocations.some(l => l.storage_location === prev.storageLocation);
      if (!isValidSloc) newData.storageLocation = "";

      return newData;
    });
  };

  const handleSlocChange = (_, selectedOption) => {
    if (!selectedOption) {
      setFormData(prev => ({
        ...prev,
        storageLocation: "",
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      storageLocation: selectedOption.storage_location,
      plant: selectedOption.plant_code || prev.plant,
    }));
  };

  // Pre-fetch all material groups and their schemas when "Add" is clicked
  const handleNext = async () => {
    if (isSingleCreateMode) {
      if (rememberPreference) {
        localStorage.setItem(
          PREFERENCE_KEY,
          JSON.stringify({
            plant: formData.plant,
            storageLocation: formData.storageLocation,
            materialType: formData.materialType,
          })
        );
      } else {
        localStorage.removeItem(PREFERENCE_KEY);
      }
    }

    // Pre-fetch all material groups + all schemas in parallel
    setPrefetching(true);
    try {
      // Step 1: Fetch material groups dropdown
      const groupsResponse = await axiosPrivate.get("/material/groups/dropdown");
      const groups = groupsResponse.data?.success ? groupsResponse.data.data || [] : [];
      setMaterialGroupsList(groups);

      // Step 2: Fetch all form-schemas in parallel for every group
      const schemaPromises = groups.map(async group => {
        try {
          const res = await axiosPrivate.get(`/material/groups/${group.code}/form-schema`);
          return { code: group.code, data: res.data?.data || null };
        } catch {
          // Template not found for this group is OK
          return { code: group.code, data: null };
        }
      });

      const results = await Promise.all(schemaPromises);
      const cache = {};
      for (const result of results) {
        if (result.data) {
          cache[result.code] = result.data;
        }
      }
      setSchemaCache(cache);
    } catch (error) {
      console.error("Failed to pre-fetch schemas:", error);
    } finally {
      setPrefetching(false);
    }

    setStep(2);
  };

  const handleBack = () => (step === 2 ? setStep(1) : navigate("/dashboard/materials/request"));

  if (isMassMode) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button startIcon={<ArrowBack />} onClick={handleBack}>
            Back
          </Button>
          <Breadcrumbs>
            <MuiLink
              component={Link}
              to="/dashboard/materials/request"
              underline="hover"
              color="inherit"
            >
              My Request
            </MuiLink>
            <Typography color="text.primary">Mass Request Form</Typography>
          </Breadcrumbs>
        </Box>
        <MassMaterialForm onBack={handleBack} />
      </Box>
    );
  }

  const initialScreenTitle = isReworkMode ? "Revise Material Request" : "Create Material";
  const initialScreenSubtitle = isReworkMode
    ? "Select initial master data for your revised item."
    : "Select initial master data for your new item.";

  if (usesInitialScreen && step === 1) {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", mt: 8 }}>
        <Card elevation={0} sx={{ borderRadius: 0, border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#1a237e" }}>
              {initialScreenTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {initialScreenSubtitle}
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Stack spacing={3}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: -1 }}>
                  Initial Screen
                </Typography>

                {/* Dropdown Plant */}
                <Autocomplete
                  fullWidth
                  size="small"
                  options={plantOptions}
                  value={selectedPlantOption}
                  onChange={handlePlantChange}
                  noOptionsText="No plants found"
                  getOptionLabel={formatPlantLabel}
                  renderInput={params => <TextField {...params} label="Plant" />}
                />

                {/* Dropdown Storage Location (2-Way Filter) */}
                <Autocomplete
                  fullWidth
                  size="small"
                  options={storageOptions}
                  value={selectedStorageOption}
                  onChange={handleSlocChange}
                  noOptionsText="No storage locations found"
                  isOptionEqualToValue={(option, value) =>
                    option.storage_location === value.storage_location &&
                    option.plant_code === value.plant_code
                  }
                  getOptionLabel={formatSlocLabel}
                  renderInput={params => <TextField {...params} label="Storage Location" />}
                />

                {/* Dropdown Material Type (Hardcoded) */}
                <TextField
                  label="Material Type"
                  fullWidth
                  size="small"
                  value={formData.materialType}
                  InputProps={{ readOnly: true }}
                  sx={LOCKED_FIELD_SX}
                />

                {/* Industry Sector (single fixed value) */}
                <TextField
                  label="Industry Sector"
                  fullWidth
                  size="small"
                  value={INDUSTRY_SECTOR}
                  InputProps={{ readOnly: true }}
                  sx={LOCKED_FIELD_SX}
                />

                {/* Sales Organization (auto-filled from the selected plant's company) */}
                <TextField
                  label="Sales Organization"
                  fullWidth
                  size="small"
                  value={selectedSalesOrg}
                  placeholder="Auto-filled from Plant"
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                  sx={LOCKED_FIELD_SX}
                />

                {isSingleCreateMode && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={rememberPreference}
                        onChange={e => setRememberPreference(e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Remember my preference</Typography>}
                  />
                )}

                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Button
                    variant="contained"
                    disableElevation
                    onClick={handleNext}
                    disabled={!formData.plant || !formData.storageLocation || prefetching}
                    sx={{ px: 4, bgcolor: "#1976d2" }}
                  >
                    {prefetching ? <CircularProgress size={20} sx={{ color: "white" }} /> : "Add"}
                  </Button>
                  <Button variant="text" onClick={handleBack} sx={{ color: "text.secondary" }}>
                    Cancel
                  </Button>
                </Box>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button startIcon={<ArrowBack />} onClick={handleBack}>
          Back
        </Button>
        <Breadcrumbs>
          <MuiLink
            component={Link}
            to="/dashboard/materials/request"
            underline="hover"
            color="inherit"
          >
            My Request
          </MuiLink>
          <Typography color="text.primary">
            {isReworkMode ? "Revise Single Request" : "Single Request Form"}
          </Typography>
        </Breadcrumbs>
      </Box>
      <SingleMaterialForm
        onBack={handleBack}
        formData={formData}
        prefetchedGroups={materialGroupsList}
        schemaCache={schemaCache}
        mode={isReworkMode ? "rework" : "create"}
        requestId={requestId}
      />
    </Box>
  );
}
