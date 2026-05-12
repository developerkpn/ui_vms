const SPEC_FIELD_LABELS = {
  part_number: "Part Number",
  partNumber: "Part Number",
  model: "Model",
  size_dimension: "Size / Dimension",
  sizeDimension: "Size / Dimension",
  type_bentuk: "Type / Bentuk",
  typeBentuk: "Type / Bentuk",
  bahan_warna_material: "Bahan / Warna Material",
  bahanWarnaMaterial: "Bahan / Warna Material",
  brand: "Brand",
};

const SPEC_FIELD_ORDER = [
  "part_number",
  "model",
  "size_dimension",
  "type_bentuk",
  "bahan_warna_material",
  "brand",
];

export function buildApprovalDetail(row = {}) {
  const payload = parsePayload(row.templatePayload ?? row.template_payload);
  const requestFields = {
    ...(payload.requestFields || {}),
    ...(row.requestFields || row.request_fields || {}),
  };
  const templateValues = {
    ...(payload.templateValues || {}),
    ...(row.templateValues || row.template_values || {}),
  };

  const ticketNumber = pickText(row.ticketNumber, row.ticket_number, row.requestNo, row.request_no);
  const materialDescription = pickText(
    row.materialDescription,
    row.material_description,
    requestFields.material_description
  );
  const baseUom = pickText(
    row.uom,
    row.baseUom,
    row.base_uom,
    requestFields.base_unit_of_measure,
    requestFields.base_uom
  );

  return {
    id: row.id ?? null,
    title: "Form Material",
    ticketNumber,
    ticketType: pickText(row.ticketType, row.ticket_type, "Create"),
    status: pickText(row.status, "Waiting"),
    assignedTo: pickText(row.assignedTo, row.assigned_to),
    createdBy: pickText(row.createdBy, row.created_by),
    createdAt: pickText(row.createdAt, row.created_at),
    basicInfo: {
      materialGroup: formatCodeName(
        pickText(row.materialGroupCode, row.material_group_code),
        pickText(row.materialGroupName, row.material_group_name)
      ),
      subMaterialGroup: formatCodeName(
        pickText(
          row.subMaterialGroupCode,
          row.material_sub_group_code,
          row.sub_material_group_code
        ),
        pickText(row.subMaterialGroupName, row.material_sub_group_name, row.sub_material_group_name)
      ),
      materialDescription,
      baseUom,
      plant: pickText(row.plantCode, row.plant_code, requestFields.plant),
      storageLocation: pickText(
        row.slocCode,
        row.sloc_code,
        requestFields.storage_location,
        requestFields.storageLocation
      ),
    },
    longTextLines: buildLongTextLines(row, requestFields),
    specificationFields: buildSpecificationFields(templateValues),
    attachments: normalizeAttachments(row.attachments),
    approvalHistory: buildApprovalHistory(row),
  };
}

function buildLongTextLines(row, requestFields) {
  if (Array.isArray(row.longTextLines)) {
    return row.longTextLines.map(value => pickText(value)).filter(value => value !== "-");
  }

  return [
    row.longText1 ?? row.long_text_1 ?? requestFields.long_text_1,
    row.longText2 ?? row.long_text_2 ?? requestFields.long_text_2,
    row.longText3 ?? row.long_text_3 ?? requestFields.long_text_3,
  ]
    .map(value => pickText(value))
    .filter(value => value !== "-");
}

function buildSpecificationFields(templateValues) {
  const orderedKeys = [
    ...SPEC_FIELD_ORDER,
    ...Object.keys(templateValues || {}).filter(key => !SPEC_FIELD_ORDER.includes(key)),
  ];
  const seen = new Set();

  return orderedKeys.reduce((fields, key) => {
    if (seen.has(key)) {
      return fields;
    }

    seen.add(key);
    const value = pickText(templateValues?.[key]);
    if (value === "-") {
      return fields;
    }

    fields.push({
      key,
      label: SPEC_FIELD_LABELS[key] || titleize(key),
      value,
    });
    return fields;
  }, []);
}

function normalizeAttachments(attachments = []) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.map(attachment => ({
    id: attachment.id ?? null,
    name: pickText(attachment.name, attachment.file_name, attachment.fileName),
    path: pickText(attachment.path, attachment.file_path, attachment.filePath),
    type: pickText(attachment.type, attachment.file_type, attachment.fileType),
  }));
}

function buildApprovalHistory(row) {
  return [1, 2, 3].map(step => ({
    step,
    label: `Approval ${step}`,
    approver: pickText(
      row[`approval${step}UserId`],
      row[`approval_${step}_user_id`],
      row[`approval${step}UserName`],
      row[`approval_${step}_user_name`]
    ),
    status: pickText(
      row[`approval${step}Status`],
      row[`approval_${step}_status`],
      "WAITING"
    ).toUpperCase(),
    approvedAt: pickText(row[`approval${step}At`], row[`approval_${step}_at`]),
    remark: pickText(row[`approval${step}Remark`], row[`approval_${step}_remark`]),
  }));
}

function parsePayload(payload) {
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
}

function formatCodeName(code, name) {
  if (code === "-" && name === "-") {
    return "-";
  }

  if (code === "-") {
    return name;
  }

  if (name === "-") {
    return code;
  }

  return `${code} - ${name}`;
}

function pickText(...values) {
  const value = values.find(item => item !== undefined && item !== null && item !== "");
  return value === undefined ? "-" : String(value);
}

function titleize(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`);
}
