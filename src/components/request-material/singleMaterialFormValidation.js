import { validateSpecField } from "./specFieldValidation.js";

const SERVER_FIELD_KEY_MAP = {
  material_group: "materialGroup",
  materialGroup: "materialGroup",
  materialGroupCode: "materialGroup",
  subgroup: "subgroup",
  material_sub_group_id: "subgroup",
  materialSubGroupId: "subgroup",
  sub_material_group_id: "subgroup",
  base_uom: "base_unit_of_measure",
  MOVING_AVG_PRICE: "moving_avg_price",
  movingAvgPrice: "moving_avg_price",
};

function toStringValue(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function toFieldError(message = "") {
  return {
    error: true,
    message,
  };
}

function addFieldError(fieldErrors, fieldKey, message) {
  if (!fieldKey || !message || fieldErrors[fieldKey]) {
    return;
  }

  fieldErrors[fieldKey] = toFieldError(message);
}

function getTemplateFields(visibleSections = []) {
  return (Array.isArray(visibleSections) ? visibleSections : []).flatMap(section =>
    Array.isArray(section?.fields) ? section.fields : []
  );
}

export function validateRequesterField(fieldKey = "", rawValue = "") {
  const value = toStringValue(rawValue);
  const trimmedValue = value.trim();

  switch (fieldKey) {
    case "materialGroup":
      if (!trimmedValue) {
        return toFieldError("Material group wajib dipilih.");
      }
      break;
    case "base_unit_of_measure":
      if (!trimmedValue) {
        return toFieldError("Base UoM wajib diisi.");
      }
      break;
    case "moving_avg_price":
      // Optional, but when filled it must be numeric (no DB constraint; the
      // value is pushed straight to SAP moving price).
      if (trimmedValue && !/^\d+(\.\d+)?$/.test(trimmedValue)) {
        return toFieldError("Price harus berupa angka.");
      }
      break;
    default:
      break;
  }

  return { error: false, message: "" };
}

/**
 * Validate one template (specification) field the way submit does.
 *
 * validateSpecField early-returns "valid" for an empty value and has no
 * isRequired check at all, so it can never raise the required error on its own.
 * Callers that validate while the user is still editing must go through here,
 * otherwise a keystroke reports a field clean that submit will reject.
 *
 * @param {*} rawValue - the current input value
 * @param {object} field - the field definition from the schema
 * @returns {{ error: boolean, message: string }}
 */
export function validateTemplateField(rawValue, field) {
  const value = toStringValue(rawValue);
  const label = field?.label || field?.fieldNameId || field?.fieldKey;

  // Whitespace-only counts as empty: trim before the required check so "   "
  // cannot satisfy a required field.
  if (field?.isRequired && !value.trim()) {
    return toFieldError(`${label} wajib diisi`);
  }

  return validateSpecField(value, field);
}

export function validateRequesterDraft({ formState = {} } = {}) {
  const fieldErrors = {};
  const requestFieldValues = formState?.requestFieldValues || {};
  const templateFieldValues = formState?.templateFieldValues || {};

  [
    ["materialGroup", formState?.materialGroup],
    ["subgroup", formState?.subgroup],
    ["base_unit_of_measure", requestFieldValues.base_unit_of_measure],
    ["moving_avg_price", requestFieldValues.moving_avg_price],
  ].forEach(([fieldKey, value]) => {
    const result = validateRequesterField(fieldKey, value);
    if (result.error) {
      addFieldError(fieldErrors, fieldKey, result.message);
    }
  });

  getTemplateFields(formState?.visibleSections)
    .filter(field => field?.kind === "template_field")
    .forEach(field => {
      const validation = validateTemplateField(templateFieldValues[field.fieldKey], field);
      if (validation.error) {
        addFieldError(fieldErrors, field.fieldKey, validation.message);
      }
    });

  return fieldErrors;
}

export function mapRequesterServerErrors(errors = []) {
  return (Array.isArray(errors) ? errors : []).reduce((mapped, error) => {
    const rawFieldKey = error?.fieldKey || error?.field_key;
    const fieldKey = SERVER_FIELD_KEY_MAP[rawFieldKey] || rawFieldKey;
    const message = error?.message || error?.detail || "";

    if (!fieldKey || !message || mapped[fieldKey]) {
      return mapped;
    }

    mapped[fieldKey] = toFieldError(message);
    return mapped;
  }, {});
}
