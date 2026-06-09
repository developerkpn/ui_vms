import {
  getValidationHint,
  validateSpecField,
} from "../components/request-material/specFieldValidation.js";

const REQUEST_FIELD_UI_KEY_MAP = {
  base_unit_of_measure: "base_uom",
  plant: "plant_code",
  storage_location: "sloc_code",
};

const UI_TO_REQUEST_FIELD_KEY_MAP = {
  base_uom: "base_unit_of_measure",
  plant_code: "plant",
  sloc_code: "storage_location",
};

const APPROVAL_EDITABLE_REQUEST_FIELD_KEYS = new Set([
  "material_description",
  "base_uom",
  "plant_code",
  "sloc_code",
]);

const MATERIAL_DESCRIPTION_MAX_LENGTH = 40;
const LONG_TEXT_MAX_LENGTH = 40;

function toTrimmedString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function getSections(formSchema = {}) {
  return Array.isArray(formSchema?.sections) ? formSchema.sections : [];
}

function getAllSchemaFields(formSchema = {}) {
  return getSections(formSchema).flatMap(section =>
    Array.isArray(section?.fields) ? section.fields : []
  );
}

function getRequestRuleFields(formSchema = {}) {
  return getAllSchemaFields(formSchema).filter(
    field => field?.kind === "request_rule"
  );
}

function getTemplateFields(formSchema = {}) {
  return getAllSchemaFields(formSchema).filter(
    field => field?.kind === "template_field"
  );
}

function toUiFieldKey(fieldKey = "") {
  return REQUEST_FIELD_UI_KEY_MAP[fieldKey] || fieldKey;
}

function buildSchemaTemplateFieldMap(formSchema = {}) {
  return getTemplateFields(formSchema).reduce((map, field) => {
    map.set(field.fieldKey, field);
    return map;
  }, new Map());
}

export function normalizeApprovalInputValue(field = {}, rawValue = "") {
  const value = toTrimmedString(rawValue);
  return value.toUpperCase();
}

export function buildApprovalSpecificationFields({
  detailFields = [],
  formSchema = {},
} = {}) {
  const schemaFieldMap = buildSchemaTemplateFieldMap(formSchema);
  const seen = new Set();
  const fields = [];

  getTemplateFields(formSchema).forEach(field => {
    seen.add(field.fieldKey);
    fields.push({
      key: field.fieldKey,
      label: field.label || field.fieldNameId || field.fieldKey,
      historyKey: field.fieldKey,
      historySections: [],
      value: "",
      ...field,
    });
  });

  (Array.isArray(detailFields) ? detailFields : []).forEach(field => {
    const schemaField = schemaFieldMap.get(field.key) || {};
    const nextField = {
      key: field.key,
      historyKey: field.historyKey || field.key,
      historySections: field.historySections || [],
      value: field.value ?? "",
      ...schemaField,
      ...field,
      label:
        field.label ||
        schemaField.label ||
        schemaField.fieldNameId ||
        field.key,
    };

    if (seen.has(field.key)) {
      const index = fields.findIndex(item => item.key === field.key);
      if (index >= 0) {
        fields[index] = nextField;
      }
      return;
    }

    seen.add(field.key);
    fields.push(nextField);
  });

  return fields.sort((left, right) => {
    const leftOrder = Number(left.displayOrder ?? Number.MAX_SAFE_INTEGER);
    const rightOrder = Number(right.displayOrder ?? Number.MAX_SAFE_INTEGER);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.label || left.key).localeCompare(
      String(right.label || right.key)
    );
  });
}

export function validateApprovalDraft({
  draftValues = {},
  formSchema = {},
} = {}) {
  const fieldErrors = {};
  const requestRuleFields = getRequestRuleFields(formSchema);
  const templateFields = getTemplateFields(formSchema);
  const templateValues = draftValues?.template_payload?.templateValues || {};

  const addError = (fieldKey, message) => {
    if (!fieldKey || !message || fieldErrors[fieldKey]) {
      return;
    }

    fieldErrors[fieldKey] = {
      error: true,
      message,
    };
  };

  if (!draftValues?.material_sub_group_id) {
    addError("material_sub_group_id", "Sub material group is required");
  }

  const materialDescription = toTrimmedString(
    draftValues?.material_description
  );
  if (!materialDescription.trim()) {
    addError("material_description", "Material Description wajib diisi");
  } else if (materialDescription.length > MATERIAL_DESCRIPTION_MAX_LENGTH) {
    addError(
      "material_description",
      `Material Description maksimal ${MATERIAL_DESCRIPTION_MAX_LENGTH} karakter`
    );
  }

  if (!toTrimmedString(draftValues?.base_uom).trim()) {
    addError("base_uom", "Base UoM wajib diisi");
  }

  ["long_text_1", "long_text_2", "long_text_3"].forEach(fieldKey => {
    const value = toTrimmedString(draftValues?.[fieldKey]);
    if (value.length > LONG_TEXT_MAX_LENGTH) {
      addError(
        fieldKey,
        `Long Text maksimal ${LONG_TEXT_MAX_LENGTH} karakter`
      );
    }
  });

  requestRuleFields.forEach(field => {
    const uiFieldKey = toUiFieldKey(field.fieldKey);
    if (!APPROVAL_EDITABLE_REQUEST_FIELD_KEYS.has(uiFieldKey)) {
      return;
    }

    const requestValueKey = uiFieldKey;
    const value = toTrimmedString(draftValues?.[requestValueKey]);

    if (field.isRequired && !value.trim()) {
      addError(
        uiFieldKey,
        `${field.label || field.fieldLabel || uiFieldKey} wajib diisi`
      );
    }
  });

  templateFields.forEach(field => {
    const value = toTrimmedString(templateValues?.[field.fieldKey]);
    const label = field.label || field.fieldNameId || field.fieldKey;

    if (field.isRequired && !value.trim()) {
      addError(field.fieldKey, `${label} wajib diisi`);
      return;
    }

    const result = validateSpecField(value, field);
    if (result.error) {
      addError(field.fieldKey, result.message);
    }
  });

  return fieldErrors;
}

export function mapApprovalServerErrors(errors = []) {
  return (Array.isArray(errors) ? errors : []).reduce((mapped, error) => {
    const rawFieldKey = error?.fieldKey || error?.field_key;
    const fieldKey = toUiFieldKey(rawFieldKey);
    const message = error?.message || error?.detail || "";

    if (!fieldKey || !message || mapped[fieldKey]) {
      return mapped;
    }

    mapped[fieldKey] = {
      error: true,
      message,
    };
    return mapped;
  }, {});
}

export function buildApprovalFieldHints(formSchema = {}) {
  const hints = {};

  getRequestRuleFields(formSchema).forEach(field => {
    const uiFieldKey = toUiFieldKey(field.fieldKey);
    if (field.notes) {
      hints[uiFieldKey] = field.notes;
    }
  });

  getTemplateFields(formSchema).forEach(field => {
    const hint = getValidationHint(field);
    if (hint) {
      hints[field.fieldKey] = hint;
    }
  });

  if (!hints.material_description) {
    hints.material_description =
      "Wajib diisi, maksimal 40 karakter.";
  }

  return hints;
}

export function toRequestFieldKey(fieldKey = "") {
  return UI_TO_REQUEST_FIELD_KEY_MAP[fieldKey] || fieldKey;
}
