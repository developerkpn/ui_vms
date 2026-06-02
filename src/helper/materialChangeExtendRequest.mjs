const CHANGE_TEMPLATE_FIELD_DEFINITIONS = [
  { key: "part_number", label: "Part Number" },
  { key: "model", label: "Model" },
  { key: "size_dimension", label: "Size / Dimension" },
  { key: "type_bentuk", label: "Type / Bentuk" },
  { key: "bahan_warna_material", label: "Bahan / Warna Material" },
  { key: "brand", label: "Brand" },
];

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function readText(...values) {
  const match = values.find(value => value !== undefined && value !== null && `${value}`.trim() !== "");
  return match === undefined ? "" : String(match).trim();
}

function buildStorageOption(location = {}) {
  const value = readText(
    location?.sloc_code,
    location?.storage_location_code,
    location?.storage_location
  );
  const label = readText(location?.storage_location, value);

  if (!value) {
    return null;
  }

  return { value, label };
}

function normalizeTemplateValues(templateValues = {}) {
  if (!templateValues || typeof templateValues !== "object" || Array.isArray(templateValues)) {
    return {};
  }

  return Object.entries(templateValues).reduce((result, [key, value]) => {
    const normalizedValue = readText(value);
    if (normalizedValue) {
      result[key] = normalizedValue;
    }
    return result;
  }, {});
}

function readMaterialGroupId(material = {}) {
  return readText(material.groupId, material.material_group_id, material.materialGroupId);
}

function readMaterialSubGroupId(material = {}) {
  return readText(
    material.subGroupId,
    material.material_sub_group_id,
    material.materialSubGroupId,
    material.sub_material_group_id
  );
}

export function buildPlantOptions(locations = []) {
  return unique(
    locations.map(location => readText(location?.plant_code))
  );
}

export function buildStorageOptionsForPlant(locations = [], plantCode = "") {
  const selectedPlant = readText(plantCode);

  return locations
    .filter(location => readText(location?.plant_code) === selectedPlant)
    .map(buildStorageOption)
    .filter(Boolean)
    .filter(
      (option, index, options) =>
        options.findIndex(candidate => candidate.value === option.value) === index
    );
}

export function buildChangeTemplateFields(material = {}) {
  return CHANGE_TEMPLATE_FIELD_DEFINITIONS.reduce((fields, field) => {
    const value = readText(
      material?.[field.key],
      material?.templateValues?.[field.key],
      material?.template_values?.[field.key]
    );

    if (value) {
      fields.push({ ...field, value });
    }

    return fields;
  }, []);
}

export function extractChangeTemplateValues(material = {}) {
  return buildChangeTemplateFields(material).reduce((result, field) => {
    result[field.key] = field.value;
    return result;
  }, {});
}

export function buildChangeRequestPayload({ material = {}, draft = {} }) {
  return {
    ticketType: "Change",
    materialCode: readText(material.code),
    materialGroupId: readMaterialGroupId(material),
    materialSubGroupId: readMaterialSubGroupId(material),
    change_extend_reason: readText(draft.reason),
    requestFields: {
      material_description: readText(draft.materialName),
      base_uom: readText(draft.baseUom),
    },
    templateValues: normalizeTemplateValues(draft.templateValues),
  };
}

export function buildExtendRequestPayload({ material = {}, draft = {} }) {
  return {
    ticketType: "Extend",
    materialCode: readText(material.code),
    materialGroupId: readMaterialGroupId(material),
    materialSubGroupId: readMaterialSubGroupId(material),
    change_extend_reason: readText(draft.reason),
    requestFields: {
      material_description: readText(material.name, material.material_description),
      base_uom: readText(material.unit_of_measurement, material.base_uom, material.baseUom),
      plant: readText(draft.plantCode),
      storage_location: readText(draft.storageLocation),
    },
    templateValues: {},
  };
}
