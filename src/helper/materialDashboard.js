export const MATERIAL_WORKFLOW_STATUSES = [
  { key: "awaitingApproval", label: "Awaiting Approval", color: "#2065D1" },
  { key: "masterData", label: "Master Data Processing", color: "#1890FF" },
  { key: "rework", label: "Rework", color: "#9c27b0" },
  { key: "waitingSap", label: "Waiting SAP", color: "#B78103" },
  { key: "done", label: "Done", color: "#229A16" },
  { key: "sapError", label: "SAP Error", color: "#B72136" },
  { key: "rejected", label: "Rejected", color: "#dc2626" },
  { key: "cancelled", label: "Cancelled", color: "#637381" },
  { key: "approved", label: "Approved", color: "#1B4C48" },
  { key: "waitingPickup", label: "Waiting Pickup", color: "#2065D1" },
  { key: "waitingOtherApproval", label: "Waiting for Other Approvals", color: "#637381" },
  { key: "other", label: "Other", color: "#919EAB" },
];

export const getMaterialWorkflowStatuses = approvalRole =>
  MATERIAL_WORKFLOW_STATUSES.map(status =>
    approvalRole === "masterData" && status.key === "awaitingApproval"
      ? { ...status, label: "Waiting Pickup" }
      : status
  );

export const formatDashboardCount = value => Number(value || 0).toLocaleString("en-US");

export function buildMaterialGroupChartRows(groups, limit = 6) {
  const sorted = [...groups].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const visible = sorted.slice(0, limit);
  const remaining = sorted.slice(limit);
  if (remaining.length) {
    visible.push({
      label: "Other groups",
      count: remaining.reduce((sum, row) => sum + row.count, 0),
    });
  }
  return visible;
}

export function buildMonthlyChartScale(rows) {
  const maximum = Math.max(1, ...rows.map(row => row.singleItems + row.massItems));
  const rawStep = maximum / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = Math.max(1, [1, 2, 5, 10].find(value => value * magnitude >= rawStep) * magnitude);
  const top = Math.ceil(maximum / step) * step;
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, index) => index * step) };
}

export function formatDashboardMonth(month) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}
