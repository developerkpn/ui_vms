import { getSapStatusChip, pickSapFields } from "./sapStatus.js";

// MDM_MATERIAL membership is derived from the session store (role / groupid /
// dept_id). The backend uses the "MDM_MATERIAL" group name; logins for that
// group surface as MDM_MAT / MATERIAL on dept_id, so we match any of them.
const MDM_MATERIAL_IDENTIFIERS = ["MDM_MATERIAL", "MDM_MAT", "MATERIAL"];

export function isMdmMaterialUser(session = {}) {
  return [session.role, session.groupid, session.dept_id]
    .map(value => String(value ?? "").trim().toUpperCase())
    .some(value => MDM_MATERIAL_IDENTIFIERS.includes(value));
}

export const APPROVAL_STATUS_FILTER_OPTIONS = [
  { value: "All", label: "All" },
  { value: "Submit", label: "Submit" },
  { value: "Rework", label: "Rework" },
  { value: "Cancel", label: "Cancel" },
  { value: "Done", label: "Done" },
  { value: "Waiting SAP", label: "Waiting SAP" },
  { value: "SAP Error", label: "SAP Error" },
];

export function isAllStatusFilter(statusFilter) {
  return String(statusFilter || "").trim().toUpperCase() === "ALL";
}

// The status shown to the user (and therefore what to filter on): once a request
// is pushed, the SAP staging state — "Waiting SAP" / "Done" (created in SAP) /
// "SAP Error" — replaces the bare approval "Done", matching the table chip. This
// is why filtering "Done" no longer sweeps in waiting/errored requests.
export function getEffectiveApprovalStatusLabel(row) {
  const sapChip = getSapStatusChip(row?.sapPushStatus);
  if (sapChip) {
    return sapChip.label;
  }
  return normalizeApprovalStatusForFilter(row?.status);
}

export function normalizeApprovalStatusForFilter(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (normalized === "REWORK") {
    return "Rework";
  }

  if (["REJECT", "REJECTED", "CANCEL", "CANCELLED"].includes(normalized)) {
    return "Cancel";
  }

  if (normalized === "DONE") {
    return "Done";
  }

  return "Submit";
}

export function filterApprovalRowsByStatus(rows = [], statusFilter = "All") {
  if (isAllStatusFilter(statusFilter)) {
    return rows;
  }
  return rows.filter(row => getEffectiveApprovalStatusLabel(row) === statusFilter);
}

export function paginateApprovalRows(rows = [], page = 0, rowsPerPage = 10) {
  const safePage = Math.max(0, Number(page) || 0);
  const safeRowsPerPage = Math.max(1, Number(rowsPerPage) || 10);
  const startIndex = safePage * safeRowsPerPage;
  return rows.slice(startIndex, startIndex + safeRowsPerPage);
}

export const APPROVAL_FALLBACK_ROWS = [
  {
    id: 1,
    ticketNumber: "1000000001",
    ticketType: "Create",
    materialDescription: "PUMP, CENTRIFUGAL INVESTA STR 1X1.5-8",
    uom: "PC",
    status: "Done",
    createdBy: "admin admin",
    createdAt: "2026-01-10 16:30",
    assignedTo: "Completed",
    approvalStage: "Completed",
    finalCode: "901.002.123",
    materialGroupCode: "901",
    materialGroupName: "Actuator & Solenoid Valve",
    subMaterialGroupCode: "002",
    subMaterialGroupName: "Actiar",
    plantCode: "KPN1",
    slocCode: "A001",
    longText1: "SQ50 AMRI KSB II 2GDC IIC TX X PMAX 8100BAR",
    templateValues: {
      part_number: "P/N 404830243243",
      model: "SQ50 AMRI",
      size_dimension: "90X100X450MM",
      type_bentuk: "NG160",
      bahan_warna_material: "SS304",
      brand: "ACTIAR",
    },
    attachments: [
      { id: 1, file_name: "image1.jpg", file_type: "image/jpeg" },
      { id: 2, file_name: "image2.jpg", file_type: "image/jpeg" },
      { id: 3, file_name: "image3.jpg", file_type: "image/jpeg" },
    ],
    approval1Status: "APPROVED",
    approval1UserId: "Approval 1",
    approval1At: "2026-01-10 16:45",
    approval2Status: "APPROVED",
    approval2UserId: "Approval 2",
    approval2At: "2026-01-10 17:05",
    approval3Status: "APPROVED",
    approval3UserId: "master data",
    approval3At: "2026-01-10 17:05",
  },
];

// Normalize the N-stage approval steps the backend now sends.
// Accepts either camelCase `approvalSteps` or snake_case `approval_steps`.
export function normalizeApprovalSteps(row = {}) {
  const rawSteps = row.approvalSteps ?? row.approval_steps;
  if (!Array.isArray(rawSteps)) {
    return [];
  }

  return rawSteps.map((step, index) => {
    const level = step.level ?? step.stage_level ?? index + 1;
    const label =
      stringOrUndefined(step.label, step.stage_label) ?? `Approval ${level}`;
    const approverName = stringOrUndefined(step.approverName, step.approver_name) ?? null;
    const status = String(step.status ?? "WAITING").toUpperCase();
    const actedAt = step.actedAt ?? step.acted_at ?? null;
    const claimedAt = step.claimedAt ?? step.claimed_at ?? null;
    const remark = stringOrUndefined(step.remark) ?? null;

    return {
      level,
      kind: stringOrUndefined(step.kind, step.stage_kind) ?? null,
      label,
      approverUserId: step.approverUserId ?? step.approver_user_id ?? null,
      approverName,
      status,
      claimedAt,
      actedAt,
      remark,
      // Aliases so consumers that read the older step shape (buildApprovalDetail)
      // keep working without per-step field-name knowledge.
      step: Number.isInteger(Number(level)) ? Number(level) : index + 1,
      title: label,
      approver: approverName,
      approvedAt: actedAt ?? claimedAt,
    };
  });
}

export function normalizeApprovalRows(rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(row => {
    const approvalSteps = normalizeApprovalSteps(row);
    const normalized = {
      id: row.id,
      ticketNumber: stringOrFallback(row.ticket_number, row.ticketNumber, "-"),
      ticketType: stringOrFallback(row.ticket_type, row.ticketType, "Create"),
      materialDescription: stringOrFallback(row.material_description, row.materialDescription, "-"),
      uom: stringOrFallback(row.uom, row.base_uom, row.baseUom, "-"),
      status: normalizeApprovalStatusForFilter(row.status || "Submit"),
      ...pickSapFields(row),
      createdBy: stringOrFallback(row.created_by, row.createdBy, "-"),
      createdAt: formatDateTime(row.created_at || row.createdAt),
      approvalStage: resolveApprovalStage(row),
      assignedTo: computeAssignedToDisplay(row),
      // Pass the N-stage data straight through for downstream consumers.
      approvalSteps,
    };

    addRawProp(
      normalized,
      "currentStageLevel",
      row.currentStageLevel,
      row.current_stage_level
    );
    addStringProp(
      normalized,
      "currentStageLabel",
      row.currentStageLabel,
      row.current_stage_label
    );
    addStringProp(
      normalized,
      "currentStageKind",
      row.currentStageKind,
      row.current_stage_kind
    );
    addRawProp(normalized, "isFinalStage", row.isFinalStage, row.is_final_stage);
    addRawProp(normalized, "totalStages", row.totalStages, row.total_stages);

    addStringProp(normalized, "materialCode", row.material_code, row.materialCode);
    addStringProp(normalized, "finalCode", row.final_code, row.finalCode);
    addStringProp(
      normalized,
      "changeExtendReason",
      row.change_extend_reason,
      row.changeExtendReason
    );
    addStringProp(normalized, "materialGroupCode", row.material_group_code, row.materialGroupCode);
    addStringProp(normalized, "materialGroupName", row.material_group_name, row.materialGroupName);
    addRawProp(normalized, "materialGroupId", row.material_group_id, row.materialGroupId);
    addStringProp(
      normalized,
      "subMaterialGroupCode",
      row.material_sub_group_code,
      row.sub_material_group_code,
      row.subMaterialGroupCode
    );
    addStringProp(
      normalized,
      "subMaterialGroupName",
      row.material_sub_group_name,
      row.sub_material_group_name,
      row.subMaterialGroupName
    );
    addRawProp(normalized, "materialSubGroupId", row.material_sub_group_id, row.materialSubGroupId);
    addStringProp(normalized, "plantCode", row.plant_code, row.plantCode);
    addStringProp(normalized, "slocCode", row.sloc_code, row.slocCode);
    addStringProp(normalized, "longText1", row.long_text_1, row.longText1);
    addStringProp(normalized, "longText2", row.long_text_2, row.longText2);
    addStringProp(normalized, "longText3", row.long_text_3, row.longText3);
    addRawProp(normalized, "templatePayload", row.template_payload, row.templatePayload);
    addRawProp(normalized, "requestFields", row.request_fields, row.requestFields);
    addRawProp(normalized, "templateValues", row.template_values, row.templateValues);
    addRawProp(normalized, "editHistory", row.edit_history, row.editHistory);
    addRawProp(normalized, "attachments", row.attachments);
    addStringProp(normalized, "reworkStage", row.rework_stage, row.reworkStage);
    addStringProp(normalized, "reworkByUserId", row.rework_by_user_id, row.reworkByUserId);
    addStringProp(normalized, "reworkByUsername", row.rework_by_username, row.reworkByUsername);
    addStringProp(
      normalized,
      "reworkAt",
      row.rework_at ? formatDateTime(row.rework_at) : undefined,
      row.reworkAt ? formatDateTime(row.reworkAt) : undefined
    );
    addStringProp(normalized, "reworkReason", row.rework_reason, row.reworkReason);

    // Iterate the N approval steps when present, deriving the flat
    // approval{n}* fields so downstream consumers that still read them keep
    // working. Fall back to the legacy approval_1/2/3_* fields otherwise.
    if (approvalSteps.length > 0) {
      approvalSteps.forEach(step => {
        const level = Number(step.level);
        if (!Number.isInteger(level) || level < 1) {
          return;
        }
        addStringProp(normalized, `approval${level}UserId`, step.approverUserId);
        addStringProp(normalized, `approval${level}UserName`, step.approverName);
        addStringProp(normalized, `approval${level}Status`, step.status);
        addStringProp(
          normalized,
          `approval${level}At`,
          step.actedAt,
          step.claimedAt
        );
        addStringProp(normalized, `approval${level}Remark`, step.remark);
      });
    } else {
      [1, 2, 3].forEach(step => {
        addStringProp(
          normalized,
          `approval${step}UserId`,
          row[`approval_${step}_user_id`],
          row[`approval${step}UserId`]
        );
        addStringProp(
          normalized,
          `approval${step}UserName`,
          row[`approval_${step}_user_name`],
          row[`approval_${step}_username`],
          row[`approval${step}UserName`],
          row[`approval${step}Username`]
        );
        addStringProp(
          normalized,
          `approval${step}Status`,
          row[`approval_${step}_status`],
          row[`approval${step}Status`]
        );
        addStringProp(
          normalized,
          `approval${step}At`,
          row[`approval_${step}_at`],
          row[`approval${step}At`]
        );
        addStringProp(
          normalized,
          `approval${step}Remark`,
          row[`approval_${step}_remark`],
          row[`approval${step}Remark`]
        );
      });
    }

    return normalized;
  });
}

export function filterApprovalRows(rows = [], query = "") {
  const normalizedQuery = String(query).trim().toLowerCase();

  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter(row =>
    [
      row.ticketNumber,
      row.ticketType,
      row.materialDescription,
      row.uom,
      row.status,
      row.createdBy,
      row.assignedTo,
    ]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(normalizedQuery))
  );
}

function resolveApprovalStage(row = {}) {
  const normalizedStatus = String(row.status || "")
    .trim()
    .toUpperCase();

  if (["REJECT", "REJECTED", "CANCEL", "CANCELLED"].includes(normalizedStatus)) {
    return "Cancelled";
  }

  // Prefer the server-provided N-stage view when available.
  const serverStageLabel = stringOrUndefined(row.currentStageLabel, row.current_stage_label);
  const isFinalStage = row.isFinalStage ?? row.is_final_stage;
  const steps = normalizeApprovalSteps(row);

  if (steps.length > 0 || serverStageLabel !== undefined) {
    const allApproved =
      steps.length > 0 && steps.every(step => step.status === "APPROVED");
    if (allApproved && (isFinalStage === true || serverStageLabel === undefined)) {
      return "Completed";
    }
    // The active stage is the first non-approved/non-rejected step.
    const activeStep = steps.find(
      step => step.status !== "APPROVED" && step.status !== "REJECTED"
    );
    if (serverStageLabel !== undefined) {
      return allApproved ? "Completed" : serverStageLabel;
    }
    if (activeStep) {
      return activeStep.label;
    }
    return "Completed";
  }

  const ticketType = String(row.ticketType || row.ticket_type || "")
    .trim()
    .toUpperCase();
  const isChange = ticketType === "CHANGE";
  const isExtend = ticketType === "EXTEND";
  const approval1 = String(row.approval_1_status || "").toUpperCase();
  const approval2 = String(row.approval_2_status || "").toUpperCase();
  const approval3 = String(row.approval_3_status || "").toUpperCase();

  if (isExtend) {
    if (approval3 !== "APPROVED") {
      return "Approval 3";
    }
    return "Completed";
  }

  if (isChange) {
    if (!approval1 || approval1 === "WAITING") {
      return "Approval 1";
    }
    if (approval1 === "APPROVED" && approval3 !== "APPROVED") {
      return "Approval 3";
    }
    return "Completed";
  }

  if (!approval1 || approval1 === "WAITING") {
    return "Approval 1";
  }

  if (approval1 === "APPROVED" && (!approval2 || approval2 === "WAITING")) {
    return "Approval 2";
  }

  if (approval1 === "APPROVED" && approval2 === "APPROVED" && approval3 !== "APPROVED") {
    return "Approval 3";
  }

  return "Completed";
}

export function computeAssignedToDisplay(row = {}) {
  const normalizedStatus = String(row.status || "")
    .trim()
    .toUpperCase();
  const rawAssignedTo = String(row.assigned_to || row.assignedTo || "").trim();

  if (["REJECT", "REJECTED", "CANCEL", "CANCELLED"].includes(normalizedStatus)) {
    return "-";
  }

  if (rawAssignedTo === "Requester") {
    return stringOrFallback(row.created_by, row.createdBy, "-");
  }

  // Prefer the server-provided N-stage view when available.
  const steps = normalizeApprovalSteps(row);
  const serverStageKind = stringOrUndefined(row.currentStageKind, row.current_stage_kind);
  if (steps.length > 0 || serverStageKind !== undefined) {
    const stage = resolveApprovalStage(row);
    if (stage === "Completed" || stage === "Cancelled") {
      return "-";
    }

    const activeStep = steps.find(
      step => step.status !== "APPROVED" && step.status !== "REJECTED"
    );

    // An unclaimed Master Data (MDM) step is a grab queue: nobody is assigned
    // yet, so show the stage name itself as the assignee.
    if (activeStep) {
      if (activeStep.kind === "MDM" && !activeStep.approverUserId) {
        return "Master Data";
      }
      if (activeStep.approverName) {
        return activeStep.approverName;
      }
    }

    // assigned_to may be a human name from the backend; show it when present.
    if (rawAssignedTo && rawAssignedTo !== "Requester") {
      return rawAssignedTo;
    }
    return "-";
  }

  const stage = resolveApprovalStage(row);

  if (stage === "Completed") {
    return "-";
  }

  if (stage === "Approval 1") {
    return stringOrFallback(
      row.approval_1_user_name,
      row.approval1UserName,
      row.approval1Username,
      "-"
    );
  }

  if (stage === "Approval 2") {
    return stringOrFallback(
      row.approval_2_user_name,
      row.approval2UserName,
      row.approval2Username,
      "-"
    );
  }

  if (stage === "Approval 3") {
    return stringOrFallback(
      row.approval_3_user_name,
      row.approval3UserName,
      row.approval3Username,
      "-"
    );
  }

  return rawAssignedTo || "-";
}

const JAKARTA_TZ = "Asia/Jakarta";

// Render an absolute instant as "YYYY-MM-DD HH:MM" wall-clock time in WIB.
function formatWibWallClock(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  // Timestamps are stored as UTC in the DB; only the display is converted to WIB.
  // A bare "YYYY-MM-DD HH:MM" string with no timezone marker is already WIB
  // wall-clock time from the backend (TO_CHAR) — show it as-is so it is not
  // double-shifted. Anything carrying timezone info (trailing "Z" or a ±offset)
  // or a Date object is an absolute instant and is converted to WIB.
  if (typeof value === "string") {
    const trimmed = value.trim();
    const hasTimezone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
    const bareMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/);
    if (bareMatch && !hasTimezone) {
      return `${bareMatch[1]} ${bareMatch[2]}:${bareMatch[3]}`;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return formatWibWallClock(date);
}

// Like formatDateTime, but preserves null/undefined instead of falling back to "-".
// Use for fields where the absence of a value must remain nullish for downstream
// nullish-coalescing chains (e.g. picking the active stage's timestamp).
export function formatOptionalDateTime(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return formatDateTime(value);
}

function stringOrFallback(...values) {
  const value = values.find(item => item !== undefined && item !== null && item !== "");
  return value === undefined ? "-" : String(value);
}

// Like stringOrFallback but returns undefined (not "-") when nothing is present,
// so callers can distinguish "absent" from a literal "-".
function stringOrUndefined(...values) {
  const value = values.find(item => item !== undefined && item !== null && item !== "");
  return value === undefined ? undefined : String(value);
}

function addStringProp(target, key, ...values) {
  const value = values.find(item => item !== undefined && item !== null && item !== "");
  if (value !== undefined) {
    target[key] = String(value);
  }
}

function addRawProp(target, key, ...values) {
  const value = values.find(item => item !== undefined && item !== null && item !== "");
  if (value !== undefined) {
    target[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Mass request approval helpers
// ---------------------------------------------------------------------------

export function normalizeMassApprovalRows(rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(row => {
    const approvalSteps = normalizeApprovalSteps(row);
    const normalized = {
      id: row.id,
      massRequestNo: stringOrFallback(row.mass_request_no, row.massRequestNo, "-"),
      itemCount: row.item_count ?? row.itemCount ?? 1,
      massRequestReason: stringOrFallback(row.mass_request_reason, row.massRequestReason, "-"),
      status: normalizeApprovalStatusForFilter(row.first_item_status || "Submit"),
      createdBy: stringOrFallback(row.created_by_username, row.created_by, row.createdBy, "-"),
      createdAt: formatDateTime(row.created_at || row.createdAt),
      approvalStage: resolveMassApprovalStage(row),
      assignedTo: computeMassAssignedToDisplay(row),
      ticketType: "Create",
      // Pass the N-stage data straight through for downstream consumers.
      approvalSteps,
      // First item approval fields (shared by all items in batch)
      // Approval 1
      firstItemApproval1Status: row.first_item_approval_1_status || null,
      firstItemApproval1UserId: row.first_item_approval_1_user_id || null,
      firstItemApproval1UserName: row.first_item_approval_1_user_name || null,
      firstItemApproval1At: formatOptionalDateTime(row.first_item_approval_1_at ?? row.firstItemApproval1At),
      firstItemApproval1Remark: row.first_item_approval_1_remark || null,
      // Approval 2
      firstItemApproval2Status: row.first_item_approval_2_status || null,
      firstItemApproval2UserId: row.first_item_approval_2_user_id || null,
      firstItemApproval2UserName: row.first_item_approval_2_user_name || null,
      firstItemApproval2At: formatOptionalDateTime(row.first_item_approval_2_at ?? row.firstItemApproval2At),
      firstItemApproval2Remark: row.first_item_approval_2_remark || null,
      // Approval 3
      firstItemApproval3Status: row.first_item_approval_3_status || null,
      firstItemApproval3UserId: row.first_item_approval_3_user_id || null,
      firstItemApproval3UserName: row.first_item_approval_3_user_name || null,
      firstItemApproval3At: formatOptionalDateTime(row.first_item_approval_3_at ?? row.firstItemApproval3At),
      firstItemApproval3Remark: row.first_item_approval_3_remark || null,
      // Items placeholder (populated by massApprovalDetail)
      items: [],
    };

    addStringProp(normalized, "firstItemApproval1UserName", row.first_item_approval_1_user_name);
    addStringProp(normalized, "firstItemApproval2UserName", row.first_item_approval_2_user_name);
    addStringProp(normalized, "firstItemApproval3UserName", row.first_item_approval_3_user_name);

    addRawProp(
      normalized,
      "currentStageLevel",
      row.currentStageLevel,
      row.current_stage_level
    );
    addStringProp(
      normalized,
      "currentStageLabel",
      row.currentStageLabel,
      row.current_stage_label
    );
    addStringProp(
      normalized,
      "currentStageKind",
      row.currentStageKind,
      row.current_stage_kind
    );
    addRawProp(normalized, "isFinalStage", row.isFinalStage, row.is_final_stage);
    addRawProp(normalized, "totalStages", row.totalStages, row.total_stages);

    return normalized;
  });
}

export function filterMassApprovalRowsByStatus(rows = [], statusFilter = "All") {
  if (isAllStatusFilter(statusFilter)) {
    return rows;
  }
  // Mass requests are never pushed to SAP, so this resolves to the approval
  // status; the SAP-only filter values simply match nothing here.
  return rows.filter(row => getEffectiveApprovalStatusLabel(row) === statusFilter);
}

export function filterMassApprovalRows(rows = [], query = "") {
  const normalizedQuery = String(query).trim().toLowerCase();

  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter(row => {
    const fields = [row.massRequestNo, row.massRequestReason, row.createdBy, row.assignedTo];
    return fields.some(field =>
      String(field || "")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  });
}

export function paginateMassApprovalRows(rows = [], page = 0, rowsPerPage = 10) {
  const start = page * rowsPerPage;
  return rows.slice(start, start + rowsPerPage);
}

export function resolveMassApprovalStage(row = {}) {
  const normalizedStatus = String(row.first_item_status || row.status || "")
    .trim()
    .toUpperCase();

  if (["REJECT", "REJECTED", "CANCEL", "CANCELLED"].includes(normalizedStatus)) {
    return "Cancelled";
  }

  // Prefer the server-provided N-stage view when available.
  const serverStageLabel = stringOrUndefined(row.currentStageLabel, row.current_stage_label);
  const steps = normalizeApprovalSteps(row);
  if (steps.length > 0 || serverStageLabel !== undefined) {
    const allApproved =
      steps.length > 0 && steps.every(step => step.status === "APPROVED");
    if (allApproved) {
      return "Completed";
    }
    if (serverStageLabel !== undefined) {
      return serverStageLabel;
    }
    const activeStep = steps.find(
      step => step.status !== "APPROVED" && step.status !== "REJECTED"
    );
    return activeStep ? activeStep.label : "Completed";
  }

  const approval1 = String(
    row.first_item_approval_1_status || row.firstItemApproval1Status || ""
  ).toUpperCase();
  const approval2 = String(
    row.first_item_approval_2_status || row.firstItemApproval2Status || ""
  ).toUpperCase();
  const approval3 = String(
    row.first_item_approval_3_status || row.firstItemApproval3Status || ""
  ).toUpperCase();

  if (!approval1 || approval1 === "WAITING") {
    return "Approval 1";
  }

  if (approval1 === "APPROVED" && (!approval2 || approval2 === "WAITING")) {
    return "Approval 2";
  }

  if (approval1 === "APPROVED" && approval2 === "APPROVED" && approval3 !== "APPROVED") {
    return "Approval 3";
  }

  return "Completed";
}

export function computeMassAssignedToDisplay(row = {}) {
  const normalizedStatus = String(row.first_item_status || row.status || "")
    .trim()
    .toUpperCase();
  const rawAssignedTo = String(row.first_item_assigned_to || row.firstItemAssignedTo || "").trim();

  if (["REJECT", "REJECTED", "CANCEL", "CANCELLED"].includes(normalizedStatus)) {
    return "-";
  }

  if (rawAssignedTo === "Requester") {
    return stringOrFallback(row.created_by_username, row.created_by, row.createdBy, "-");
  }

  // Prefer the server-provided N-stage view when available.
  const steps = normalizeApprovalSteps(row);
  const serverStageKind = stringOrUndefined(row.currentStageKind, row.current_stage_kind);
  if (steps.length > 0 || serverStageKind !== undefined) {
    const stage = resolveMassApprovalStage(row);
    if (stage === "Completed" || stage === "Cancelled") {
      return "-";
    }
    const activeStep = steps.find(
      step => step.status !== "APPROVED" && step.status !== "REJECTED"
    );
    if (activeStep) {
      if (activeStep.kind === "MDM" && !activeStep.approverUserId) {
        return "Master Data";
      }
      if (activeStep.approverName) {
        return activeStep.approverName;
      }
    }
    if (rawAssignedTo && rawAssignedTo !== "Requester") {
      return rawAssignedTo;
    }
    return "-";
  }

  const stage = resolveMassApprovalStage(row);

  if (stage === "Completed") {
    return "-";
  }

  if (stage === "Approval 1") {
    return stringOrFallback(
      row.first_item_approval_1_user_name,
      row.firstItemApproval1UserName,
      "-"
    );
  }

  if (stage === "Approval 2") {
    return stringOrFallback(
      row.first_item_approval_2_user_name,
      row.firstItemApproval2UserName,
      "-"
    );
  }

  if (stage === "Approval 3") {
    return stringOrFallback(
      row.first_item_approval_3_user_name,
      row.firstItemApproval3UserName,
      "-"
    );
  }

  return rawAssignedTo || "-";
}
