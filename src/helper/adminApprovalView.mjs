export const APPROVAL_GROUP_OPTIONS = [
  { value: "none", label: "Group by" },
  { value: "status", label: "Status" },
  { value: "ticketType", label: "Ticket Type" },
  { value: "assignedTo", label: "Assigned To" },
];

export const APPROVAL_STATUS_FILTER_OPTIONS = [
  { value: "Submit", label: "Submit" },
  { value: "Rework", label: "Rework" },
  { value: "Cancel", label: "Cancel" },
  { value: "Done", label: "Done" },
];

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

export function filterApprovalRowsByStatus(rows = [], statusFilter = "Submit") {
  const normalizedFilter = normalizeApprovalStatusForFilter(statusFilter);
  return rows.filter(row => normalizeApprovalStatusForFilter(row.status) === normalizedFilter);
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

export function normalizeApprovalRows(rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(row => {
    const normalized = {
      id: row.id,
      ticketNumber: stringOrFallback(row.ticket_number, row.ticketNumber, "-"),
      ticketType: stringOrFallback(row.ticket_type, row.ticketType, "Create"),
      materialDescription: stringOrFallback(row.material_description, row.materialDescription, "-"),
      uom: stringOrFallback(row.uom, row.base_uom, row.baseUom, "-"),
      status: normalizeApprovalStatusForFilter(row.status || "Submit"),
      createdBy: stringOrFallback(row.created_by, row.createdBy, "-"),
      createdAt: formatDateTime(row.created_at || row.createdAt),
      assignedTo: stringOrFallback(row.assigned_to, row.assignedTo, "-"),
      approvalStage: resolveApprovalStage(row),
    };

    addStringProp(normalized, "materialCode", row.material_code, row.materialCode);
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

export function summarizeApprovalGroups(rows = [], groupBy = "none") {
  if (!groupBy || groupBy === "none") {
    return [];
  }

  const counts = rows.reduce((acc, row) => {
    const key = row[groupBy] || "Unassigned";
    acc.set(key, (acc.get(key) || 0) + 1);
    return acc;
  }, new Map());

  return Array.from(counts.entries()).map(([key, count]) => ({ key, count }));
}

export function sortApprovalRows(rows = [], groupBy = "none") {
  if (!groupBy || groupBy === "none") {
    return rows;
  }

  return [...rows].sort((left, right) =>
    String(left[groupBy] || "").localeCompare(String(right[groupBy] || ""))
  );
}

function resolveApprovalStage(row = {}) {
  const normalizedStatus = String(row.status || "")
    .trim()
    .toUpperCase();
  const ticketType = String(row.ticketType || row.ticket_type || "")
    .trim()
    .toUpperCase();
  const isChange = ticketType === "CHANGE";
  const isExtend = ticketType === "EXTEND";
  const approval1 = String(row.approval_1_status || "").toUpperCase();
  const approval2 = String(row.approval_2_status || "").toUpperCase();
  const approval3 = String(row.approval_3_status || "").toUpperCase();

  if (["REJECT", "REJECTED", "CANCEL", "CANCELLED"].includes(normalizedStatus)) {
    return "Cancelled";
  }

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

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  if (typeof value === "string") {
    const isoLikeMatch = value.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/);
    if (isoLikeMatch) {
      return `${isoLikeMatch[1]} ${isoLikeMatch[2]}:${isoLikeMatch[3]}`;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function stringOrFallback(...values) {
  const value = values.find(item => item !== undefined && item !== null && item !== "");
  return value === undefined ? "-" : String(value);
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
    const normalized = {
      id: row.id,
      massRequestNo: stringOrFallback(row.mass_request_no, row.massRequestNo, "-"),
      itemCount: row.item_count ?? row.itemCount ?? 1,
      massRequestReason: stringOrFallback(row.mass_request_reason, row.massRequestReason, "-"),
      status: normalizeApprovalStatusForFilter(row.first_item_status || "Submit"),
      createdBy: stringOrFallback(row.created_by_username, row.created_by, row.createdBy, "-"),
      createdAt: formatDateTime(row.created_at || row.createdAt),
      assignedTo: stringOrFallback(row.first_item_assigned_to, row.firstItemAssignedTo, "-"),
      approvalStage: resolveMassApprovalStage(row),
      ticketType: "Create",
      // First item approval fields (shared by all items in batch)
      // Approval 1
      firstItemApproval1Status: row.first_item_approval_1_status || null,
      firstItemApproval1UserId: row.first_item_approval_1_user_id || null,
      firstItemApproval1UserName: row.first_item_approval_1_user_name || null,
      firstItemApproval1At: row.first_item_approval_1_at || null,
      firstItemApproval1Remark: row.first_item_approval_1_remark || null,
      // Approval 2
      firstItemApproval2Status: row.first_item_approval_2_status || null,
      firstItemApproval2UserId: row.first_item_approval_2_user_id || null,
      firstItemApproval2At: row.first_item_approval_2_at || null,
      firstItemApproval2Remark: row.first_item_approval_2_remark || null,
      // Approval 3
      firstItemApproval3Status: row.first_item_approval_3_status || null,
      firstItemApproval3UserId: row.first_item_approval_3_user_id || null,
      firstItemApproval3At: row.first_item_approval_3_at || null,
      firstItemApproval3Remark: row.first_item_approval_3_remark || null,
      // Items placeholder (populated by massApprovalDetail)
      items: [],
    };

    addStringProp(normalized, "firstItemApproval1UserName", row.first_item_approval_1_user_name);

    return normalized;
  });
}

export function filterMassApprovalRowsByStatus(rows = [], statusFilter = "Submit") {
  const filter = normalizeApprovalStatusForFilter(statusFilter);
  return rows.filter(row => row.status === filter);
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

export function sortMassApprovalRows(rows = [], groupBy = "none") {
  return [...rows].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

export function summarizeMassApprovalGroups(rows = [], groupBy = "none") {
  if (groupBy === "none" || !Array.isArray(rows) || rows.length === 0) {
    return { "": rows };
  }

  const groups = {};

  rows.forEach(row => {
    let key;

    if (groupBy === "status") {
      key = row.status || "Submit";
    } else if (groupBy === "assignedTo") {
      key = row.assignedTo || "-";
    } else {
      key = "General";
    }

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(row);
  });

  return groups;
}

export function resolveMassApprovalStage(row = {}) {
  const normalizedStatus = String(row.first_item_status || row.status || "")
    .trim()
    .toUpperCase();
  const approval1 = String(
    row.first_item_approval_1_status || row.firstItemApproval1Status || ""
  ).toUpperCase();
  const approval2 = String(
    row.first_item_approval_2_status || row.firstItemApproval2Status || ""
  ).toUpperCase();
  const approval3 = String(
    row.first_item_approval_3_status || row.firstItemApproval3Status || ""
  ).toUpperCase();

  if (["REJECT", "REJECTED", "CANCEL", "CANCELLED"].includes(normalizedStatus)) {
    return "Cancelled";
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
