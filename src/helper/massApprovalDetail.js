import { pickSapFields } from "./sapStatus.js";

/**
 * Build dialog detail data for a mass approval request.
 *
 * Transforms a normalized mass approval row into the shape
 * consumed by MassApprovalFormDialog.
 *
 * @param {object} row - Normalized mass approval row (from normalizeMassApprovalRows).
 * @param {object[]} [items=[]] - Item-level detail rows from API (item_no, request_no,
 *   material_description, base_uom, status, assigned_to, etc.).
 * @returns {object} Dialog detail object.
 */
export function buildMassApprovalDetail(row = {}, items = []) {
  const hasItems = Array.isArray(items) && items.length > 0;

  return {
    massRequestNo: row.massRequestNo ?? "-",
    massRequestReason: row.massRequestReason ?? "-",
    itemCount: row.itemCount ?? (hasItems ? items.length : 0),
    status: row.status ?? "Submit",
    assignedTo: row.assignedTo ?? "-",
    createdBy: row.createdBy ?? "-",
    createdAt: row.createdAt ?? "-",
    approvalStage: row.approvalStage ?? "",

    // Current stage info (read from first item, shared by all items)
    approval1Status: row.firstItemApproval1Status ?? null,
    approval1UserId: row.firstItemApproval1UserId ?? null,
    approval1UserName: row.firstItemApproval1UserName ?? null,
    approval1At: row.firstItemApproval1At ?? null,
    approval1Remark: row.firstItemApproval1Remark ?? null,
    approval2Status: row.firstItemApproval2Status ?? null,
    approval2UserId: row.firstItemApproval2UserId ?? null,
    approval2At: row.firstItemApproval2At ?? null,
    approval2Remark: row.firstItemApproval2Remark ?? null,
    approval3Status: row.firstItemApproval3Status ?? null,
    approval3UserId: row.firstItemApproval3UserId ?? null,
    approval3At: row.firstItemApproval3At ?? null,
    approval3Remark: row.firstItemApproval3Remark ?? null,

    // Items for the read-only table in the dialog
    items: hasItems
      ? items.map(normalizeMassRequestItem)
      : [],
  };
}

/**
 * Build a Rework summary for a mass request.
 *
 * Since all items share the same approval chain, the rework metadata
 * is read from the first item's active/previous approval stage.
 *
 * @param {object} row - Normalized mass approval row.
 * @returns {object|null} Rework summary or null if no rework data.
 */
export function buildMassReworkSummary(row = {}) {
  // For mass requests, rework info is stored per-item on the active stage.
  // Read from the normalized row's first item fields.
  const reworkStage = row.approvalStage;
  const remark =
    row.firstItemApproval1Remark ??
    row.firstItemApproval2Remark ??
    row.firstItemApproval3Remark;
  const approver =
    row.firstItemApproval1UserName ??
    row.firstItemApproval2UserName ??
    null;
  const atTime =
    row.firstItemApproval1At ??
    row.firstItemApproval2At ??
    row.firstItemApproval3At;

  if (!remark && !atTime) {
    return null;
  }

  return {
    massRequestNo: row.massRequestNo ?? "-",
    reason: remark ?? "",
    approver: approver ?? "",
    at: atTime ?? "",
  };
}

/**
 * Normalize a single mass request item for dialog display.
 */
function normalizeMassRequestItem(item = {}) {
  return {
    id: item.id ?? null,
    itemNo: item.item_no ?? item.itemNo ?? 0,
    requestNo: item.request_no ?? item.requestNo ?? "-",
    ticketType: item.ticket_type ?? item.ticketType ?? "Create",
    materialDescription: String(
      item.material_description ?? item.materialDescription ?? ""
    ).trim() || "-",
    uom: String(item.base_uom ?? item.uom ?? item.baseUom ?? "").trim() || "-",
    plantCode: item.plant_code ?? item.plantCode ?? "",
    slocCode: item.sloc_code ?? item.slocCode ?? "",
    materialGroup: item.material_group ?? item.materialGroup ?? "",
    materialSubGroup: item.material_sub_group ?? item.materialSubGroup ?? "",
    poText: item.po_text ?? item.poText ?? "",
    spesifikasiTambahan: item.spesifikasi_tambahan ?? item.spesifikasiTambahan ?? "",
    status: item.status ?? "Submit",
    assignedTo: item.assigned_to ?? item.assignedTo ?? "-",
    // SAP staging, filled once Master Data approved the batch: the composed
    // material code plus the Oracle write-back status/message per item.
    finalCode: item.final_code ?? item.finalCode ?? null,
    attachments: normalizeItemAttachments(item.attachments),
    ...pickSapFields(item),
  };
}

/**
 * Normalize an item's attachment list — mirrors adminApprovalDetail.js's
 * normalizeAttachments so the single and mass dialogs read the same shape.
 * Attachments belong to the item, not the batch, so this runs per item.
 *
 * Exported because the requester's mass detail dialog reads the raw item rows
 * straight from the API rather than through buildMassApprovalDetail, but still
 * needs the same attachment shape.
 *
 * @param {object[]} [attachments=[]] - raw attachment rows from the API
 * @returns {object[]} attachments as { id, name, path, type, uploadedBy }
 */
export function normalizeItemAttachments(attachments = []) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.map(attachment => ({
    id: attachment.id ?? null,
    name: String(
      attachment.name ?? attachment.file_name ?? attachment.fileName ?? ""
    ).trim() || "Attachment",
    path: String(attachment.path ?? attachment.file_path ?? attachment.filePath ?? "").trim(),
    type: String(attachment.type ?? attachment.file_type ?? attachment.fileType ?? "").trim(),
    // Absent on most attachments today — see adminApprovalDetail.js for why.
    uploadedBy: String(
      attachment.uploadedByName ??
        attachment.uploaded_by_name ??
        attachment.uploadedBy ??
        attachment.uploaded_by ??
        attachment.actorName ??
        attachment.actor_name ??
        ""
    ).trim(),
  }));
}
