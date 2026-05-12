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
import { Link, useNavigate } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";
import SingleMaterialForm from "../../components/request-material/SingleMaterialForm";
import MassMaterialForm from "../../components/request-material/MassMaterialForm";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

const DEFAULT_MATERIAL_TYPE = "SARS - Non Trade Material";
const PREFERENCE_KEY = "material_request_preferences";

export default function SingleRequestPage({ mode = "single" }) {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
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

  // 1. Ambil Data Master saat halaman dibuka
  useEffect(() => {
    if (mode !== "single") {
      setLoading(false);
      return undefined;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axiosPrivate.get("/material/initial-screen-data");
        if (response.data.success) {
          const rawLocations = response.data?.data?.locations || [];
          const seenLocations = new Set();
          const locations = rawLocations.filter(location => {
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

          setAllLocations(locations);

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

          const matchedByPlantAndStorage = locations.find(
            location =>
              location.plant_code === savedPlant &&
              location.storage_location === savedStorageLocation
          );
          const matchedByStorageOnly = locations.find(
            location => location.storage_location === savedStorageLocation
          );
          const matchedPlant = locations.some(location => location.plant_code === savedPlant)
            ? savedPlant
            : matchedByStorageOnly?.plant_code || "";

          setFormData(prev => ({
            ...prev,
            plant: matchedPlant,
            storageLocation:
              matchedByPlantAndStorage?.storage_location ||
              matchedByStorageOnly?.storage_location ||
              "",
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
  }, [axiosPrivate, mode]);

  // 2. Logika Filtering

  // Daftar Plant yang unik untuk dropdown
  const plantOptions = [...new Set(allLocations.map(l => l.plant_code).filter(Boolean))].sort();
  const selectedPlantOption = plantOptions.find(code => code === formData.plant) || null;

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

  if (mode === "mass") {
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
        <MassMaterialForm onBack={handleBack} formData={formData} />
      </Box>
    );
  }

  if (step === 1) {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", mt: 8 }}>
        <Card elevation={0} sx={{ borderRadius: 0, border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#1a237e" }}>
              Create Material
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select initial master data for your new item.
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
                  getOptionLabel={option =>
                    formData.plant
                      ? option.storage_location
                      : `${option.storage_location} (Plant: ${option.plant_code})`
                  }
                  renderInput={params => <TextField {...params} label="Storage Location" />}
                />

                {/* Dropdown Material Type (Hardcoded) */}
                <TextField
                  label="Material Type"
                  fullWidth
                  size="small"
                  value={formData.materialType}
                  InputProps={{ readOnly: true }}
                />

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
          <Typography color="text.primary">Single Request Form</Typography>
        </Breadcrumbs>
      </Box>
      <SingleMaterialForm
        onBack={handleBack}
        formData={formData}
        prefetchedGroups={materialGroupsList}
        schemaCache={schemaCache}
      />
    </Box>
  );
}
