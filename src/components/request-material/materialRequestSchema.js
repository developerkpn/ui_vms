const DEFAULT_STATE = {
  materialGroup: "",
  subgroup: "",
  schema: null,
  visibleSections: [],
  subgroupOptions: [],
  requestFieldValues: {},
  templateFieldValues: {},
};

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
    requestFieldValues,
    templateFieldValues,
  };
};

const resetForMaterialGroupChange = currentState => ({
  ...createDynamicFormState(currentState),
  subgroup: "",
  templateFieldValues: {},
  requestFieldValues: {},
});

export { createDynamicFormState, applyMaterialGroupSchema, resetForMaterialGroupChange };
