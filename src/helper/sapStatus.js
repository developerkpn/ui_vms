// Maps mat_single_request.sap_push_status (the Oracle VMS_MATERIALDATA FLAG
// reconciled by the sync cron) to a user-facing SAP staging status shown to both
// requestors and approvers once a request has been approved and pushed.
//
//   PENDING / PUSHED  -> FLAG 'I' : waiting for SAP to pick up the row
//   SYNCED            -> FLAG 'S' : SAP created the material (success)
//   ERROR             -> FLAG 'E' : SAP rejected it (message in sap_error_msg)
//   null / ""                     : not pushed yet (still in the approval flow)

const SAP_STATUS_CHIPS = {
  PENDING: { label: "Waiting SAP", bgcolor: "#f59e0b", color: "#ffffff" },
  PUSHED: { label: "Waiting SAP", bgcolor: "#f59e0b", color: "#ffffff" },
  SYNCED: { label: "Done", bgcolor: "#16a34a", color: "#ffffff" },
  ERROR: { label: "SAP Error", bgcolor: "#dc2626", color: "#ffffff" },
};

export function normalizeSapPushStatus(sapPushStatus) {
  return String(sapPushStatus || "").trim().toUpperCase();
}

// Returns the chip descriptor for a pushed request, or null when the request has
// not been pushed yet (caller should fall back to the approval status).
export function getSapStatusChip(sapPushStatus) {
  return SAP_STATUS_CHIPS[normalizeSapPushStatus(sapPushStatus)] || null;
}

export function isSapError(sapPushStatus) {
  return normalizeSapPushStatus(sapPushStatus) === "ERROR";
}

// The SAP material code to show in list views, only once Master Data has
// submitted the request to the Oracle staging table:
//   Create        -> final_code (MDM typed the last 3 digits at approval, which
//                    is the same transaction that stages the row)
//   Change/Extend -> the existing material_code, but only after the push
//                    (sap_push_status set), so nothing shows mid-approval.
export function getStagedMaterialCode(row = {}) {
  const finalCode = row.finalCode ?? row.final_code ?? null;
  if (finalCode) return finalCode;
  const pushed = normalizeSapPushStatus(row.sapPushStatus ?? row.sap_push_status);
  if (!pushed) return null;
  return row.materialCode ?? row.material_code ?? null;
}

// Pull the sap_* fields off a raw API row into camelCase, tolerating either case.
export function pickSapFields(item = {}) {
  return {
    sapPushStatus: item.sap_push_status ?? item.sapPushStatus ?? null,
    sapErrorMsg: item.sap_error_msg ?? item.sapErrorMsg ?? null,
    sapPushedAt: item.sap_pushed_at ?? item.sapPushedAt ?? null,
  };
}
