import { normalizeApprovalStatusForFilter } from "./adminApprovalView.js";
import { getSapStatusChip } from "./sapStatus.js";

// Status filter for My Request, mirroring the one on My Approval.
//
// The options match, but the label a row filters under deliberately does NOT
// come from getEffectiveApprovalStatusLabel. That helper reports a rewound
// request as "Rework"; this page shows such a request as "Submit", because a
// rewind between approval steps is not the requester's to act on. Filtering has
// to agree with the pill the requester is looking at, so it reads the raw status
// and lets the SAP staging state override it exactly as the pill does.

export const REQUEST_STATUS_FILTER_OPTIONS = [
  { value: "All", label: "All" },
  { value: "Submit", label: "Submit" },
  { value: "Rework", label: "Rework" },
  { value: "Cancel", label: "Cancel" },
  { value: "Done", label: "Done" },
  { value: "Waiting SAP", label: "Waiting SAP" },
  { value: "SAP Error", label: "SAP Error" },
];

// Namespaced to this page, matching mst_user_preference.pref_key, so it cannot
// collide with my_approval.status_filter.
export const REQUEST_STATUS_FILTER_PREFERENCE_KEY = "my_request.status_filter";

export const ALL_REQUEST_STATUS_FILTER = "All";

export function isAllRequestStatusFilter(statusFilter) {
  return String(statusFilter || "").trim().toUpperCase() === "ALL";
}

/**
 * The status this row shows on My Request: the SAP staging state once it has one,
 * otherwise the plain approval status.
 */
export function getRequestStatusLabel(row) {
  const sapChip = getSapStatusChip(row?.sapPushStatus);
  if (sapChip) {
    return sapChip.label;
  }
  return normalizeApprovalStatusForFilter(row?.status);
}

export function filterRequestRowsByStatus(rows = [], statusFilter = ALL_REQUEST_STATUS_FILTER) {
  if (!Array.isArray(rows)) {
    return [];
  }
  if (isAllRequestStatusFilter(statusFilter)) {
    return rows;
  }
  return rows.filter(row => getRequestStatusLabel(row) === statusFilter);
}

/**
 * A stored preference is only applied when it still names an option on offer.
 *
 * Anything else — a value from an older build, a hand-edited row, a failed fetch
 * — falls back to All rather than leaving the page filtered by something the
 * dropdown cannot even display.
 */
export function resolveStoredRequestStatusFilter(storedValue) {
  const candidate = String(storedValue ?? "").trim();
  const match = REQUEST_STATUS_FILTER_OPTIONS.find(option => option.value === candidate);
  return match ? match.value : ALL_REQUEST_STATUS_FILTER;
}
