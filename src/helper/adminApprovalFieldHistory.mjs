const COLUMN_FIELD_READERS = {
  material_sub_group_id: row =>
    row?.material_sub_group_id ?? row?.sub_material_group_id ?? row?.materialSubGroupId ?? null,
  plant_code: row => row?.plant_code ?? row?.plantCode ?? null,
  sloc_code: row => row?.sloc_code ?? row?.slocCode ?? null,
  material_description: row => row?.material_description ?? row?.materialDescription ?? null,
  base_uom: row => row?.base_uom ?? row?.baseUom ?? row?.uom ?? null,
  long_text_1: row => row?.long_text_1 ?? row?.longText1 ?? null,
  long_text_2: row => row?.long_text_2 ?? row?.longText2 ?? null,
  long_text_3: row => row?.long_text_3 ?? row?.longText3 ?? null,
};

export function buildApprovalFieldHistory({ fieldKey, currentRow } = {}) {
  if (!fieldKey || !currentRow) {
    return [];
  }

  const historyRows = getSortedHistoryRows(currentRow);
  const sections = [];
  let previousChangedBy = pickText(currentRow.created_by, currentRow.createdBy);

  historyRows.forEach((snapshot, index) => {
    const beforeValue = toDisplayValue(readFieldValue(snapshot, fieldKey));
    const nextSnapshot = historyRows[index + 1];
    const afterValue = toDisplayValue(
      nextSnapshot ? readFieldValue(nextSnapshot, fieldKey) : readFieldValue(currentRow, fieldKey)
    );

    if (toComparableValue(beforeValue) === toComparableValue(afterValue)) {
      return;
    }

    const changedBy = pickText(
      snapshot.approved_by_user_id,
      snapshot.approvedByUserId,
      snapshot.changed_by,
      snapshot.changedBy
    );

    sections.push({
      stage: pickText(snapshot.approval_stage, snapshot.approvalStage),
      beforeValue,
      afterValue,
      sourceBy: previousChangedBy,
      changedBy,
      approvedAt: pickText(snapshot.approved_at, snapshot.approvedAt),
    });

    if (changedBy !== "-") {
      previousChangedBy = changedBy;
    }
  });

  return sections.sort(compareApprovedAtDesc);
}

export function buildTemplatePayloadFieldKey(specKey) {
  const normalizedSpecKey = normalizeSpecKey(specKey);
  return normalizedSpecKey ? `template_payload.templateValues.${normalizedSpecKey}` : "";
}

function getSortedHistoryRows(currentRow) {
  const rawHistory = currentRow.edit_history ?? currentRow.editHistory;
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  return [...rawHistory].sort(compareApprovedAtAsc);
}

function readFieldValue(row, fieldKey) {
  const normalizedFieldKey = String(fieldKey || "").trim();
  const columnReader = COLUMN_FIELD_READERS[normalizedFieldKey];
  if (columnReader) {
    return columnReader(row);
  }

  const normalizedSpecKey = normalizeSpecKey(normalizedFieldKey);
  if (!normalizedSpecKey) {
    return null;
  }

  const templateValues = getTemplateValues(row);
  return templateValues[normalizedSpecKey] ?? null;
}

function getTemplateValues(row) {
  const payload = parsePayload(row?.template_payload ?? row?.templatePayload);
  return {
    ...(payload.templateValues || {}),
    ...(row?.templateValues || row?.template_values || {}),
  };
}

function normalizeSpecKey(fieldKey) {
  const normalizedFieldKey = String(fieldKey || "").trim();
  if (!normalizedFieldKey) {
    return "";
  }

  if (normalizedFieldKey.startsWith("template_payload.templateValues.")) {
    return normalizedFieldKey.slice("template_payload.templateValues.".length);
  }

  if (normalizedFieldKey.startsWith("templatePayload.templateValues.")) {
    return normalizedFieldKey.slice("templatePayload.templateValues.".length);
  }

  if (normalizedFieldKey.startsWith("template_payload.")) {
    return normalizedFieldKey.slice("template_payload.".length);
  }

  if (normalizedFieldKey.startsWith("templateValues.")) {
    return normalizedFieldKey.slice("templateValues.".length);
  }

  if (normalizedFieldKey.startsWith("template_values.")) {
    return normalizedFieldKey.slice("template_values.".length);
  }

  if (normalizedFieldKey in COLUMN_FIELD_READERS) {
    return "";
  }

  return normalizedFieldKey;
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

function toDisplayValue(value) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return String(value);
}

function toComparableValue(value) {
  return value === "-" ? "" : String(value).trim();
}

function pickText(...values) {
  const value = values.find(item => item !== undefined && item !== null && item !== "");
  return value === undefined ? "-" : String(value);
}

function compareApprovedAtAsc(left, right) {
  return getSortableTimestamp(left?.approved_at ?? left?.approvedAt) -
    getSortableTimestamp(right?.approved_at ?? right?.approvedAt);
}

function compareApprovedAtDesc(left, right) {
  return getSortableTimestamp(right?.approvedAt ?? right?.approved_at) -
    getSortableTimestamp(left?.approvedAt ?? left?.approved_at);
}

function getSortableTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
