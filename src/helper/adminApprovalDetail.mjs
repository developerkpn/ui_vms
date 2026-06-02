import {
  buildApprovalFieldHistory,
  buildTemplatePayloadFieldKey,
} from "./adminApprovalFieldHistory.mjs";

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

const APPROVAL_STEP_LABELS = {
  1: "Approval 1",
  2: "Approval 2",
  3: "Master Data",
};

const TICKET_TYPE_APPROVAL_SKIPPED_STEPS = {
  CHANGE: [2],
  EXTEND: [1, 2],
};

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
  const editHistory = Array.isArray(row.editHistory ?? row.edit_history)
    ? row.editHistory ?? row.edit_history
    : [];
  const fieldHistory = buildFieldHistoryIndex(row, templateValues);

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
  const approvalHistory = buildApprovalHistory(row);

  return {
    id: row.id ?? null,
    rawRow: row,
    editHistory,
    fieldHistory,
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
    specificationFields: buildSpecificationFields(templateValues, fieldHistory),
    attachments: normalizeAttachments(row.attachments),
    approvalHistory,
    reworkSummary: buildReworkSummary(approvalHistory, row),
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

function buildSpecificationFields(templateValues, fieldHistory = {}) {
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
      historyKey: buildTemplatePayloadFieldKey(key),
      historySections: fieldHistory[buildTemplatePayloadFieldKey(key)] || [],
      label: SPEC_FIELD_LABELS[key] || titleize(key),
      value,
    });
    return fields;
  }, []);
}

function buildFieldHistoryIndex(row, templateValues) {
  const index = {};
  const historicalTemplateKeys = collectHistoricalTemplateKeys(row);
  const templateFieldKeys = [...new Set([...Object.keys(templateValues || {}), ...historicalTemplateKeys])];
  const trackedFieldKeys = [
    "material_sub_group_id",
    "plant_code",
    "sloc_code",
    "material_description",
    "base_uom",
    "long_text_1",
    "long_text_2",
    "long_text_3",
    ...templateFieldKeys.map(buildTemplatePayloadFieldKey),
  ];

  trackedFieldKeys.forEach(fieldKey => {
    if (!fieldKey || index[fieldKey]) {
      return;
    }

    index[fieldKey] = buildApprovalFieldHistory({
      fieldKey,
      currentRow: row,
    });
  });

  templateFieldKeys.forEach(specKey => {
    const historyKey = buildTemplatePayloadFieldKey(specKey);
    if (historyKey && !index[specKey]) {
      index[specKey] = index[historyKey] || [];
    }
  });

  return index;
}

function collectHistoricalTemplateKeys(row) {
  const rawHistory = row.editHistory ?? row.edit_history;
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  const keys = new Set();

  rawHistory.forEach(snapshot => {
    const payload = parsePayload(snapshot?.template_payload ?? snapshot?.templatePayload);
    Object.keys(payload.templateValues || {}).forEach(key => {
      keys.add(key);
    });
    Object.keys(snapshot?.templateValues || snapshot?.template_values || {}).forEach(key => {
      keys.add(key);
    });
  });

  return [...keys];
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
  const ticketType = String(row.ticketType || row.ticket_type || "").trim().toUpperCase();
  const skippedSteps = TICKET_TYPE_APPROVAL_SKIPPED_STEPS[ticketType] || [];
  const allSteps = [1, 2, 3];

  if (Array.isArray(row.approvalSteps) && row.approvalSteps.length > 0) {
    return allSteps.map(step => {
      if (skippedSteps.includes(step)) {
        return {
          step,
          label: APPROVAL_STEP_LABELS[step] || `Approval ${step}`,
          approver: "-",
          status: "SKIPPED",
          approvedAt: "-",
          remark: "Not required for this request type",
        };
      }

      const source =
        row.approvalSteps.find(item => resolveApprovalStepNumber(item) === step) ||
        row.approvalSteps[step - 1] ||
        {};

      return {
        step,
        label: APPROVAL_STEP_LABELS[step] || `Approval ${step}`,
        approver: pickText(source.approver, source.owner, source.user, source.username),
        status: normalizeApprovalStatus(source.status),
        approvedAt: pickText(source.approvedAt, source.date, source.time, source.actionAt),
        remark: pickText(source.remark, source.reason, source.note),
      };
    });
  }

  return allSteps.map(step => {
    if (skippedSteps.includes(step)) {
      return {
        step,
        label: APPROVAL_STEP_LABELS[step] || `Approval ${step}`,
        approver: "-",
        status: "SKIPPED",
        approvedAt: "-",
        remark: "Not required for this request type",
      };
    }

    return {
      step,
      label: APPROVAL_STEP_LABELS[step] || `Approval ${step}`,
      approver: pickText(
        row[`approval${step}UserName`],
        row[`approval${step}Username`],
        row[`approval_${step}_user_name`],
        row[`approval_${step}_username`],
        row[`approval${step}UserId`],
        row[`approval_${step}_user_id`]
      ),
      status: normalizeApprovalStatus(
        pickText(row[`approval${step}Status`], row[`approval_${step}_status`], "WAITING")
      ),
      approvedAt: pickText(row[`approval${step}At`], row[`approval_${step}_at`]),
      remark: pickText(row[`approval${step}Remark`], row[`approval_${step}_remark`]),
    };
  });
}

function buildReworkSummary(approvalHistory, row) {
  const reworkLabel = pickText(row.reworkStage, row.rework_stage);
  const reworkApprover = pickText(
    row.reworkByUsername,
    row.rework_by_username,
    row.reworkByUserId,
    row.rework_by_user_id
  );
  const reworkAt = pickText(row.reworkAt, row.rework_at);
  const reworkReason = pickText(row.reworkReason, row.rework_reason);

  if (reworkLabel !== "-" || reworkApprover !== "-" || reworkAt !== "-" || reworkReason !== "-") {
    return {
      step: null,
      label: reworkLabel,
      approver: reworkApprover,
      status: "REWORK",
      approvedAt: reworkAt,
      remark: reworkReason,
      reason: reworkReason,
    };
  }

  const matchedStep = approvalHistory.find(item => item.status === "REWORK");

  if (matchedStep) {
    return {
      ...matchedStep,
      reason: pickText(matchedStep.remark),
    };
  }

  return {
    step: null,
    label: "-",
    approver: "-",
    status: "-",
    approvedAt: "-",
    remark: reworkReason,
    reason: reworkReason,
  };
}

function resolveApprovalStepNumber(item = {}) {
  const rawStep = item.step ?? item.index;
  const parsedStep = Number.parseInt(rawStep, 10);

  if (Number.isInteger(parsedStep) && parsedStep >= 1 && parsedStep <= 3) {
    return parsedStep;
  }

  const title = String(item.title || item.label || "").trim().toLowerCase();

  if (title.includes("master")) {
    return 3;
  }

  if (title.includes("approval 2")) {
    return 2;
  }

  return 1;
}

function normalizeApprovalStatus(value) {
  const normalizedValue = String(value || "")
    .trim()
    .toUpperCase();

  if (normalizedValue === "SKIPPED") {
    return "SKIPPED";
  }

  if (
    normalizedValue === "APPROVE" ||
    normalizedValue === "APPROVED" ||
    normalizedValue === "DONE" ||
    normalizedValue === "COMPLETED"
  ) {
    return "APPROVED";
  }

  if (normalizedValue === "REWORK") {
    return "REWORK";
  }

  if (
    normalizedValue === "REJECT" ||
    normalizedValue === "REJECTED" ||
    normalizedValue === "CANCEL" ||
    normalizedValue === "CANCELLED"
  ) {
    return "REJECTED";
  }

  return "WAITING";
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
