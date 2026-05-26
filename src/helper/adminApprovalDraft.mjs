function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
}

function cloneTemplatePayload(templatePayload) {
  if (!templatePayload || typeof templatePayload !== "object" || Array.isArray(templatePayload)) {
    return {};
  }

  return {
    ...templatePayload,
    requestFields:
      templatePayload.requestFields &&
      typeof templatePayload.requestFields === "object" &&
      !Array.isArray(templatePayload.requestFields)
        ? { ...templatePayload.requestFields }
        : templatePayload.requestFields,
    templateValues:
      templatePayload.templateValues &&
      typeof templatePayload.templateValues === "object" &&
      !Array.isArray(templatePayload.templateValues)
        ? { ...templatePayload.templateValues }
        : templatePayload.templateValues,
  };
}

export function createApprovalDraft(detail = {}) {
  const raw = detail.rawRow || {};
  const requestFields = raw.requestFields ?? raw.request_fields ?? {};

  return {
    material_sub_group_id: firstDefined(
      raw.material_sub_group_id,
      raw.materialSubGroupId,
      raw.sub_material_group_id,
      null
    ),
    plant_code: firstDefined(
      raw.plant_code,
      raw.plantCode,
      raw.plant,
      requestFields.plant,
      null
    ),
    sloc_code: firstDefined(
      raw.sloc_code,
      raw.slocCode,
      raw.storage_location,
      raw.storageLocation,
      requestFields.storage_location,
      requestFields.storageLocation,
      null
    ),
    material_description:
      firstDefined(
        raw.material_description,
        raw.materialDescription,
        detail.basicInfo?.materialDescription,
        ""
      ) || "",
    base_uom:
      firstDefined(raw.base_uom, raw.baseUom, raw.uom, detail.basicInfo?.baseUom, "") || "",
    long_text_1: firstDefined(raw.long_text_1, raw.longText1, "") || "",
    long_text_2: firstDefined(raw.long_text_2, raw.longText2, "") || "",
    long_text_3: firstDefined(raw.long_text_3, raw.longText3, "") || "",
    template_payload: cloneTemplatePayload(
      firstDefined(raw.template_payload, raw.templatePayload, {})
    ),
  };
}
