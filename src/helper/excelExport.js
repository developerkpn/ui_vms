// "Download Excel" for the My Request and My Approval lists.
//
// What is downloaded is what the list shows, across every page: the caller
// passes the rows after its tab, search, status filter and sort have been
// applied (filteredRequests / visibleRows / massVisibleRows), so a search for
// "bearing" downloads the bearing requests and nothing else. Columns and
// status text are the table's, so the sheet reads like the screen.

import * as XLSX from "xlsx";
import {
  getEffectiveApprovalStatusLabel,
  isPartialApprovalStatus,
} from "./adminApprovalView.js";
import { getSapStatusChip, getStagedMaterialCode } from "./sapStatus.js";

const text = value => (value === null || value === undefined ? "" : String(value));

/**
 * My Request's status cell: the SAP staging status once the request has been
 * pushed, the approval status before that, and "Partial" over both.
 */
export function requestStatusLabel(row) {
  const sapChip = getSapStatusChip(row?.sapPushStatus);
  if (!sapChip || isPartialApprovalStatus(row?.status)) {
    return text(row?.status);
  }
  return sapChip.label;
}

/** My Request rows → sheet rows. The mass tab shows the reason, not a description. */
export function buildMyRequestSheetRows(rows, tab) {
  const mass = tab === "mass";
  return (Array.isArray(rows) ? rows : []).map(row => ({
    "Ticket Number": text(row.ticketNumber),
    "Ticket Type": text(row.ticketType),
    "Material Code": text(getStagedMaterialCode(row)),
    [mass ? "Mass Request Reason" : "Material Description"]: text(
      mass ? row.massRequestReason : row.materialDescription
    ),
    UOM: text(row.uom),
    Status: requestStatusLabel(row),
    "Requested by": text(row.createdBy),
    "Requested at": text(row.createdAt),
    "Assigned to": text(row.assignedTo),
  }));
}

/** My Approval rows → sheet rows, one shape per tab, as the two tables differ. */
export function buildMyApprovalSheetRows(rows, tab) {
  const list = Array.isArray(rows) ? rows : [];
  if (tab === "mass") {
    return list.map(row => ({
      "Ticket Number": text(row.massRequestNo),
      "Ticket Type": text(row.ticketType),
      "Mass Request Reason": text(row.massRequestReason),
      Status: text(getEffectiveApprovalStatusLabel(row)),
      "Requested by": text(row.createdBy),
      "Requested at": text(row.createdAt),
      "Assigned to": text(row.assignedTo),
    }));
  }
  return list.map(row => ({
    "Ticket Number": text(row.ticketNumber),
    "Ticket Type": text(row.ticketType),
    "Material Code": text(getStagedMaterialCode(row)),
    "Material Description": text(row.materialDescription),
    UOM: text(row.uom),
    Status: text(getEffectiveApprovalStatusLabel(row)),
    "Requested by": text(row.createdBy),
    "Requested at": text(row.createdAt),
    "Assigned to": text(row.assignedTo),
  }));
}

/** "My Request - Single - 2026-10-07.xlsx" (local date). */
export function exportFileName(page, tab, now = new Date()) {
  const pad = number => String(number).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${page} - ${tab === "mass" ? "Mass" : "Single"} - ${date}.xlsx`;
}

/**
 * The workbook for a list of sheet rows. Columns are sized to their longest
 * value (capped) so the sheet opens readable. An empty list still gets its
 * header row.
 */
export function buildWorkbook(sheetRows, headers, sheetName) {
  const rows = Array.isArray(sheetRows) ? sheetRows : [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : headers || [];
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  worksheet["!cols"] = columns.map(column => ({
    wch: Math.min(
      60,
      Math.max(column.length, ...rows.map(row => text(row[column]).length)) + 2
    ),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
}

/** Builds and downloads the file. Returns how many rows went in. */
export function downloadListAsExcel({ sheetRows, fileName, sheetName }) {
  XLSX.writeFile(buildWorkbook(sheetRows, [], sheetName), fileName);
  return Array.isArray(sheetRows) ? sheetRows.length : 0;
}
