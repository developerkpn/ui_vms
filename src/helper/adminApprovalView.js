import { getSapStatusChip, pickSapFields } from "./sapStatus.js";

// MDM_MATERIAL membership is the backend's call alone: /user/getsess derives
// is_mdm_material from the user's mst_page_access group names and the session
// store carries it through verbatim.
//
// Nothing is inferred from role / groupid / dept_id any more. Those were matched
// against MDM_MATERIAL / MDM_MAT / MATERIAL, and since *every* material user has
// role "MATERIAL", the whole department read as Master Data — approvers and
// requesters were shown the two assignment-scoped Status options and the Pickup
// button, and "Assigned To Me" then filtered on a step they had never grabbed,
// so it only ever rendered an empty table.
//
// There is deliberately no fallback to the old matching: a session that predates
// the flag is one where the answer is unknown, and unknown must read as "not
// Master Data" rather than as the permissive guess. Both sides ship together and
// the dashboard repopulates the store from /user/getsess on every load.
export function isMdmMaterialUser(session = {}) {
  return session?.is_mdm_material === true;
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

// Two extra Status-dropdown options, offered to MDM_MATERIAL users only. They cut
// the inbox by *who picked up the Master Data step* rather than by request status —
// neither one narrows to a status, so both span the whole lifecycle. The labels
// say "Picked Up" because that is the word the button uses; the values stay on
// their original strings, which are compared internally and never displayed.
export const ASSIGNMENT_FILTER_ASSIGNED_TO_ME = "Assigned To Me";
export const ASSIGNMENT_FILTER_REQUEST_ALL = "Request All";

export const MDM_ASSIGNMENT_FILTER_OPTIONS = [
  { value: ASSIGNMENT_FILTER_ASSIGNED_TO_ME, label: "Picked Up By Me" },
  { value: ASSIGNMENT_FILTER_REQUEST_ALL, label: "Picked Up By Anyone" },
];

export function isAssignmentFilter(value) {
  const normalized = String(value || "").trim();
  return MDM_ASSIGNMENT_FILTER_OPTIONS.some(option => option.value === normalized);
}

// Namespaced to this page, matching mst_user_preference.pref_key, so a future
// page's preference cannot collide with this one.
export const STATUS_FILTER_PREFERENCE_KEY = "my_approval.status_filter";

// A stored value is only ever applied after being checked against the options
// actually offered to this user, falling back to All otherwise. Master Data
// users see two extra options that other roles do not, so a value that was
// valid when it was saved can stop being valid when access changes — that
// reads the same as a user who has never saved anything.
export function resolveStoredStatusFilter(storedValue, isMdmUser = false) {
  const value = String(storedValue ?? "").trim();
  if (!value) {
    return "All";
  }

  const validOptions = isMdmUser
    ? [...APPROVAL_STATUS_FILTER_OPTIONS, ...MDM_ASSIGNMENT_FILTER_OPTIONS]
    : APPROVAL_STATUS_FILTER_OPTIONS;

  return validOptions.some(option => option.value === value) ? value : "All";
}

/**
 * Every MDM step this row has ever had grabbed, whatever its status. Backs both
 * assignment filters.
 *
 * A grab is never released — rework, reject and approval all keep it — so this mirrors
 * the backend's hasGrabbedMdmStep predicate (materialService.js). Neither the step's
 * status nor which step is currently active is consulted, on purpose: keying off the
 * active step would drop completed requests entirely (their MDM step is APPROVED, so
 * there is no active step) and would keep rework rows only by accident. MANUAL steps
 * are excluded, same as the backend: the Approval 1/2 queues stay private.
 *
 * @param {object} row - Normalized approval row.
 * @returns {object[]} The grabbed MDM steps, empty when no MDM user ever grabbed this row.
 */
function findGrabbedMdmSteps(row = {}) {
  return normalizeApprovalSteps(row).filter(
    step => step.kind === "MDM" && step.approverUserId
  );
}

/**
 * Both Master Data options select from the same set — every request an MDM user has
 * ever grabbed, at any status — and differ only in whose grab counts: "Request All"
 * takes anyone's, "Assigned To Me" takes only this actor's.
 *
 * "Assigned To Me" needs no widened fetch to see its terminal rows the way "Request
 * All" does. The backend already keeps a row visible to anyone who has acted on any of
 * its steps whatever that step's status (isStepRowVisibleForActor in materialService.js),
 * so the actor's own grabs are in the default inbox at every status.
 */
export function matchesAssignmentFilter(row = {}, assignmentFilter, currentUserId) {
  const grabbedSteps = findGrabbedMdmSteps(row);
  if (grabbedSteps.length === 0) {
    return false;
  }

  if (String(assignmentFilter || "").trim() === ASSIGNMENT_FILTER_REQUEST_ALL) {
    return true;
  }

  const actorUserId = String(currentUserId ?? "").trim();
  return (
    actorUserId !== "" &&
    grabbedSteps.some(step => String(step.approverUserId).trim() === actorUserId)
  );
}

// A request is rewound when it carries rework metadata *and* the Master Data
// step — the only stage that can send a request backwards, per IBE-025 — sits
// at a level higher than the request's currently active step. Comparing
// against the active step, rather than reading the rework columns alone, is
// what makes the predicate turn itself off the moment the receiving stage
// re-approves: those columns record the most recent rework and are never
// cleared, so a predicate reading them in isolation would stay true forever.
//
// Single source of truth for both the request-level label below and the
// step-level rendering in adminApprovalDetail.js, so the two can never
// disagree.
//
// @param {object} row - Normalized approval row.
// @returns {{ senderLevel: number, receiverLevel: number } | null}
function resolveRewind(row) {
  const hasReworkTimestamp = Boolean(row?.reworkAt ?? row?.rework_at);
  if (!hasReworkTimestamp) {
    return null;
  }

  const steps = normalizeApprovalSteps(row);
  const mdmStep = steps.find(step => step.kind === "MDM");
  const activeStep = findActiveStep(steps);

  if (!mdmStep || !activeStep) {
    return null;
  }

  const senderLevel = Number(mdmStep.level);
  const receiverLevel = Number(activeStep.level);

  return senderLevel > receiverLevel ? { senderLevel, receiverLevel } : null;
}

export function isRewoundRequest(row) {
  return resolveRewind(row) !== null;
}

// The two step levels a rewound request should render as "Rework": the
// Master Data step that sent it back, and the step it landed back on. Neither
// level is written anywhere — this is a display derivation only.
export function getRewindStepLevels(row) {
  return resolveRewind(row);
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
  if (isRewoundRequest(row)) {
    return "Rework";
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

export function filterApprovalRowsByStatus(rows = [], statusFilter = "All", currentUserId = null) {
  if (isAllStatusFilter(statusFilter)) {
    return rows;
  }
  if (isAssignmentFilter(statusFilter)) {
    return rows.filter(row => matchesAssignmentFilter(row, statusFilter, currentUserId));
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
      // Optional: present only where the API joins the approver's email in.
      approverEmail: stringOrUndefined(step.approverEmail, step.approver_email) ?? null,
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
      // Replies the picked approver sent back on a "via email" rework; 0 when
      // the request never had one, and on a deployment still missing the
      // rework-email tables (the query falls back to a constant 0 there).
      emailReplyCount: row.email_reply_count ?? row.emailReplyCount ?? 0,
      createdBy: stringOrFallback(row.created_by, row.createdBy, "-"),
      createdAt: formatDateTime(row.created_at || row.createdAt),
      approvalStage: resolveApprovalStage(row),
      assignedTo: computeAssignedToDisplay(row),
      assignmentCaption: computeAssignmentCaption(row),
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

// Caption shown under the status pill while a request is still in the approval
// flow. The "Assigned To" column already carries this information, but it
// collapses two different states into one name: an unclaimed Master Data (MDM)
// step is a grab queue nobody owns yet, while any other name is a step waiting
// on that person to act. Spelling it out saves scrolling to the far right of
// the table to infer it.
//
// Returns { kind, text } or null when there is nothing to wait for.
//   GRAB       - MDM queue, not yet claimed by an MDM_MATERIAL user
//   APPROVAL   - a named owner has to approve (a manual stage's approver, or
//                the MDM user who already grabbed the step)
//   UNASSIGNED - the stage has no approver assigned; the approval dialog flags
//                this same state with a warning icon.
function buildAssignmentCaption(activeStep, stage, assignedToDisplay) {
  if (activeStep) {
    // Mirrors computeAssignedToDisplay: an MDM step with no approver_user_id is
    // the grab queue, and shows as "Master Data" rather than a person.
    if (activeStep.kind === "MDM" && !activeStep.approverUserId) {
      return { kind: "GRAB", text: "Waiting pickup by Master Data" };
    }
    if (activeStep.approverName) {
      return { kind: "APPROVAL", text: `Waiting approval from ${activeStep.approverName}` };
    }
    return {
      kind: "UNASSIGNED",
      text: `Waiting approver assignment on ${activeStep.label || stage}`,
    };
  }

  // Legacy rows carry no approval_steps, only the flat approval_{n}_* fields, so
  // the assignee name computed from them is all there is to go on.
  if (assignedToDisplay && assignedToDisplay !== "-") {
    if (assignedToDisplay === "Master Data") {
      return { kind: "GRAB", text: "Waiting pickup by Master Data" };
    }
    return { kind: "APPROVAL", text: `Waiting approval from ${assignedToDisplay}` };
  }

  return { kind: "UNASSIGNED", text: `Waiting approver assignment on ${stage}` };
}

function findActiveStep(steps = []) {
  return steps.find(step => step.status !== "APPROVED" && step.status !== "REJECTED");
}

export function computeAssignmentCaption(row = {}) {
  const stage = resolveApprovalStage(row);
  if (stage === "Completed" || stage === "Cancelled") {
    return null;
  }

  // Assigned back to the requester (rework): the pill already says Rework, and
  // the requester is not waiting on anyone else.
  if (String(row.assigned_to || row.assignedTo || "").trim() === "Requester") {
    return null;
  }

  return buildAssignmentCaption(
    findActiveStep(normalizeApprovalSteps(row)),
    stage,
    computeAssignedToDisplay(row)
  );
}

export function computeMassAssignmentCaption(row = {}) {
  const stage = resolveMassApprovalStage(row);
  if (stage === "Completed" || stage === "Cancelled") {
    return null;
  }

  if (String(row.first_item_assigned_to || row.firstItemAssignedTo || "").trim() === "Requester") {
    return null;
  }

  return buildAssignmentCaption(
    findActiveStep(normalizeApprovalSteps(row)),
    stage,
    computeMassAssignedToDisplay(row)
  );
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
      // Batch-level SAP staging status: the backend rolls the per-item
      // sap_push_status up worst-first, so the row reads like a single one.
      ...pickSapFields(row),
      // Replies counted across the whole batch's rework mail thread.
      emailReplyCount: row.email_reply_count ?? row.emailReplyCount ?? 0,
      createdBy: stringOrFallback(row.created_by_username, row.created_by, row.createdBy, "-"),
      createdAt: formatDateTime(row.created_at || row.createdAt),
      approvalStage: resolveMassApprovalStage(row),
      assignedTo: computeMassAssignedToDisplay(row),
      assignmentCaption: computeMassAssignmentCaption(row),
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

    // Requester identity, kept only when the payload carries it: the rework
    // destination list needs it to label the Requestor row and to keep a
    // hand-picked approver from being the requester themselves.
    addStringProp(normalized, "requesterUserId", row.created_by, row.requester_user_id);
    addStringProp(normalized, "requesterEmail", row.created_by_email, row.requester_email);

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

export function filterMassApprovalRowsByStatus(
  rows = [],
  statusFilter = "All",
  currentUserId = null
) {
  if (isAllStatusFilter(statusFilter)) {
    return rows;
  }
  // A mass request carries the same step rows as a single one, so the Master
  // Data assignment filters read identically here.
  if (isAssignmentFilter(statusFilter)) {
    return rows.filter(row => matchesAssignmentFilter(row, statusFilter, currentUserId));
  }
  // A staged batch carries a rolled-up sap_push_status, so the SAP status
  // labels ("Waiting SAP" / "Done" / "SAP Error") filter here exactly like they
  // do for single requests; everything else falls back to the approval status.
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
