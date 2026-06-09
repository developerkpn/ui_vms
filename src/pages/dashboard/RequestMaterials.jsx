import { Add, Close, Download, MoreHoriz } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  Pagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApprovalDetail } from "src/helper/adminApprovalDetail.mjs";
import {
  computeAssignedToDisplay,
  computeMassAssignedToDisplay,
  formatOptionalDateTime,
} from "src/helper/adminApprovalView.mjs";
import {
  buildPlantOptions,
  buildStorageOptionsForPlant,
} from "src/helper/materialChangeExtendRequest.mjs";
import MassReworkForm from "src/components/request-material/MassReworkForm";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import PageHeader from "src/components/common/PageHeader";
import PageTablePaper, { PAGE_TABLE_HEADER_SX } from "src/components/common/PageTablePaper";
import PageSearchField from "src/components/common/PageSearchField";
import PageTabs from "src/components/common/PageTabs";

const APPROVAL_STATUS_BADGES = {
  APPROVED: { label: "Approve", bgcolor: "#2146d8", color: "#ffffff" },
  REWORK: { label: "Rework", bgcolor: "#f59e0b", color: "#ffffff" },
  REJECTED: { label: "Reject", bgcolor: "#d93025", color: "#ffffff" },
  WAITING: { label: "Waiting", bgcolor: "#8a9099", color: "#ffffff" },
  SKIPPED: { label: "Skipped", bgcolor: "#e5e7eb", color: "#6b7280" },
  "-": { label: "-", bgcolor: "#eceff3", color: "#546e7a" },
};

const GROUP_OPTIONS = [
  { value: "none", label: "Group By" },
  { value: "status", label: "Status" },
  { value: "ticketType", label: "Ticket Type" },
  { value: "assignedTo", label: "Assigned To" },
];

const isChangeExtendRequest = row =>
  ["CHANGE", "EXTEND"].includes(String(row?.ticketType || row?.ticket_type || "").toUpperCase());

function StatusPill({ status }) {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  const styleMap = {
    SUBMIT: { bgcolor: "#2f62d6", color: "#ffffff" },
    APPROVE: { bgcolor: "#2f62d6", color: "#ffffff" },
    APPROVED: { bgcolor: "#2f62d6", color: "#ffffff" },
    REWORK: { bgcolor: "#f59e0b", color: "#ffffff" },
    REJECT: { bgcolor: "#dc2626", color: "#ffffff" },
    REJECTED: { bgcolor: "#dc2626", color: "#ffffff" },
    CANCEL: { bgcolor: "#dc2626", color: "#ffffff" },
    CANCELLED: { bgcolor: "#dc2626", color: "#ffffff" },
    DONE: { bgcolor: "#16a34a", color: "#ffffff" },
    WAITING: { bgcolor: "#8f96a3", color: "#ffffff" },
    default: { bgcolor: "#eceff3", color: "#546e7a" },
  };

  return (
    <Chip
      label={status}
      size="small"
      sx={{
        fontWeight: 700,
        ...(styleMap[normalizedStatus] || styleMap.default),
      }}
    />
  );
}

function TicketTypePill({ value }) {
  return <Chip label={value} variant="outlined" size="small" />;
}

function ApprovalStatusCard({ item }) {
  const badge = APPROVAL_STATUS_BADGES[item.status] || APPROVAL_STATUS_BADGES["-"];
  const isSkipped = item.status === "SKIPPED";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 0,
        border: "1px solid",
        borderColor: isSkipped ? "#e5e7eb" : "divider",
        borderRadius: 2,
        overflow: "hidden",
        opacity: isSkipped ? 0.65 : 1,
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} alignItems="stretch">
        <Box
          sx={{
            flex: 1,
            px: 2,
            py: 1.75,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 0.75,
            minHeight: 92,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
            {item.label || "-"}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary" }}>
            {item.approver || "-"}
          </Typography>
        </Box>

        <Box
          sx={{
            width: { xs: "100%", sm: 188 },
            px: 2,
            py: 1.75,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "flex-end" },
            gap: 1,
            borderTop: { xs: "1px solid", sm: "none" },
            borderLeft: { xs: "none", sm: "1px solid" },
            borderColor: "divider",
            bgcolor: "#fbfcfe",
            minHeight: 92,
          }}
        >
          <Box
            sx={{
              minWidth: 128,
              px: 2.25,
              py: 1,
              borderRadius: 1.5,
              textAlign: "center",
              fontWeight: 900,
              fontSize: "0.95rem",
              lineHeight: 1.1,
              ...badge,
            }}
          >
            {badge.label}
          </Box>
          {isSkipped ? (
            <Typography variant="caption" sx={{ fontStyle: "italic", color: "#9ca3af" }}>
              {item.remark || "Not required"}
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              {item.approvedAt || "-"}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function RequestActionDialog({ open, mode, request, onClose, onReviseRequest }) {
  const detail = useMemo(() => buildApprovalDetail(request || {}), [request]);
  const isReworkMode = mode === "rework";
  const rows = isReworkMode ? [detail.reworkSummary] : detail.approvalHistory;
  const dialogTitle = isReworkMode ? "Rework Status" : "Approval Status";
  const canReviseRequest =
    isReworkMode && String(detail.status || "").trim().toUpperCase() === "REWORK" && detail.id;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
            {dialogTitle}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#455a64", lineHeight: 1.1 }}>
            {detail.ticketNumber}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mt: 0.75, fontWeight: 600, color: "text.secondary" }}
          >
            {detail.basicInfo.materialDescription || "-"}
          </Typography>
        </Box>

        <IconButton onClick={onClose} aria-label="Close request status dialog">
          <Close />
        </IconButton>
      </Box>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack spacing={1.5}>
          {rows.map((item, index) => (
            <ApprovalStatusCard key={`${item.step || "rework"}-${index}`} item={item} />
          ))}

          {isReworkMode && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "#fbfcfe",
              }}
            >
              <Typography variant="caption" sx={{ display: "block", mb: 0.75, fontWeight: 800 }}>
                Reason
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                {detail.reworkSummary.reason || "-"}
              </Typography>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        {canReviseRequest ? (
          <Button
            variant="contained"
            onClick={() => onReviseRequest?.(detail)}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            Revise Request
          </Button>
        ) : null}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function ChangeExtendReworkForm({
  row,
  locations = [],
  onSubmit,
  onCancel,
  submitting = false,
}) {
  const isExtend = String(row?.ticketType || "").toUpperCase() === "EXTEND";
  const [draft, setDraft] = useState({
    materialName: row?.materialDescription || "",
    baseUom: row?.baseUom || row?.uom || "",
    plantCode: row?.plantCode || "",
    storageLocation: row?.slocCode || "",
  });

  useEffect(() => {
    setDraft({
      materialName: row?.materialDescription || "",
      baseUom: row?.baseUom || row?.uom || "",
      plantCode: row?.plantCode || "",
      storageLocation: row?.slocCode || "",
    });
  }, [row]);

  const plantOptions = useMemo(() => buildPlantOptions(locations), [locations]);
  const storageOptions = useMemo(
    () => buildStorageOptionsForPlant(locations, draft.plantCode),
    [draft.plantCode, locations]
  );

  const originalReason = row?.changeExtendReason || row?.reworkReason || "";

  const submit = () => {
    onSubmit({
      editedRequest: isExtend
        ? {
            plant_code: draft.plantCode,
            sloc_code: draft.storageLocation,
            change_extend_reason: originalReason,
          }
        : {
            material_description: draft.materialName,
            base_uom: draft.baseUom,
            change_extend_reason: originalReason,
          },
    });
  };

  return (
    <Stack spacing={2}>
      {isExtend ? (
        <>
          <TextField
            select
            label="Plant"
            value={draft.plantCode}
            onChange={event =>
              setDraft(current => ({
                ...current,
                plantCode: event.target.value,
                storageLocation: "",
              }))
            }
          >
            {plantOptions.map(option => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Storage Location"
            value={draft.storageLocation}
            disabled={storageOptions.length === 0}
            onChange={event =>
              setDraft(current => ({ ...current, storageLocation: event.target.value }))
            }
          >
            {storageOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </>
      ) : (
        <>
          <TextField
            label="Material Name"
            value={draft.materialName}
            onChange={event =>
              setDraft(current => ({ ...current, materialName: event.target.value }))
            }
          />
          <TextField
            label="Base UoM"
            value={draft.baseUom}
            onChange={event => setDraft(current => ({ ...current, baseUom: event.target.value }))}
          />
        </>
      )}
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={submit} disabled={submitting}>
          {submitting ? "Saving..." : "Submit"}
        </Button>
        <Button onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}

export default function RequestMaterials() {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("single");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState("none");
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [actionDialogMode, setActionDialogMode] = useState(null);
  const [scopedReworkSubmitting, setScopedReworkSubmitting] = useState(false);
  const [reviseChangeExtendOpen, setReviseChangeExtendOpen] = useState(false);
  const [initialLocations, setInitialLocations] = useState([]);
  const [reviseMassOpen, setReviseMassOpen] = useState(false);
  const [massReworkItems, setMassReworkItems] = useState([]);
  const [massReworkSubmitting, setMassReworkSubmitting] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchSingleRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const response = await axiosPrivate.get("/material/requests/single");
      const singleRequests = Array.isArray(response.data?.data)
        ? response.data.data.map(item => ({
            id: item.id,
            mode: "single",
            requestKey: `single:${item.id}`,
            ticketNumber: item.ticket_number,
            ticketType: item.ticket_type,
            materialCode: item.material_code,
            finalCode: item.final_code,
            materialDescription: item.material_description,
            uom: item.uom,
            baseUom: item.base_uom || item.uom,
            plantCode: item.plant_code,
            slocCode: item.sloc_code,
            changeExtendReason: item.change_extend_reason || "",
            status: item.status,
            createdBy: item.created_by,
            createdAt: item.created_at,
            assignedTo: computeAssignedToDisplay(item),
            reworkStage: item.rework_stage,
            reworkByUserId: item.rework_by_user_id,
            reworkByUsername: item.rework_by_username,
            reworkAt: formatOptionalDateTime(item.rework_at),
            reworkReason: item.rework_reason || "",
            approval_1_user_id: item.approval_1_user_id,
            approval_1_user_name: item.approval_1_user_name,
            approval_1_status: item.approval_1_status,
            approval_1_at: item.approval_1_at,
            approval_1_remark: item.approval_1_remark,
            approval_2_user_id: item.approval_2_user_id,
            approval_2_user_name: item.approval_2_user_name,
            approval_2_status: item.approval_2_status,
            approval_2_at: item.approval_2_at,
            approval_2_remark: item.approval_2_remark,
            approval_3_user_id: item.approval_3_user_id,
            approval_3_user_name: item.approval_3_user_name,
            approval_3_status: item.approval_3_status,
            approval_3_at: item.approval_3_at,
            approval_3_remark: item.approval_3_remark,
          }))
        : [];

      setRequests(prev => [...singleRequests, ...prev.filter(item => item.mode === "mass")]);
    } catch (error) {
      console.error("Failed to fetch single requests:", error);
      openSnackbar("Failed to load single requests. Showing fallback data.", "warning");
    } finally {
      setRequestsLoading(false);
    }
  }, [axiosPrivate]);

  const fetchMassRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const response = await axiosPrivate.get("/material/requests/mass");
      const massRequests = Array.isArray(response.data?.data)
        ? response.data.data.map(item => {
            // Detect reworks from preserved remarks (not status, which is reset on revision)
            const reworkApproval1 = String(item.first_item_approval_1_remark || "").trim() !== "";
            const reworkApproval2 = String(item.first_item_approval_2_remark || "").trim() !== "";
            const reworkApproval3 = String(item.first_item_approval_3_remark || "").trim() !== "";
            // Build rework entry per approval stage that has a remark
            const reworks = [];
            if (reworkApproval1) {
              reworks.push({
                stage: "Approval 1",
                by_username: item.first_item_approval_1_user_name,
                at: formatOptionalDateTime(item.first_item_approval_1_at),
                reason: item.first_item_approval_1_remark,
              });
            }
            if (reworkApproval2) {
              reworks.push({
                stage: "Approval 2",
                by_username: item.first_item_approval_2_user_name,
                at: formatOptionalDateTime(item.first_item_approval_2_at),
                reason: item.first_item_approval_2_remark,
              });
            }
            if (reworkApproval3) {
              reworks.push({
                stage: "Approval 3",
                by_username: item.first_item_approval_3_user_name,
                at: formatOptionalDateTime(item.first_item_approval_3_at),
                reason: item.first_item_approval_3_remark,
              });
            }
            // Build legacy rework metadata for buildReworkSummary (latest rework)
            const latestRework = reworks.length > 0 ? reworks[reworks.length - 1] : null;
            return {
              id: item.id,
              mode: "mass",
              requestKey: `mass:${item.id}`,
              ticketNumber: item.mass_request_no,
              ticketType: "Create",
              materialDescription: item.first_item_material_description,
              uom: item.first_item_uom,
              status: item.first_item_status,
              createdBy: item.created_by_username || item.created_by,
              createdAt: item.created_at,
              assignedTo: computeMassAssignedToDisplay(item),
              massRequestReason: item.mass_request_reason,
              itemCount: item.item_count,
              // Approval chain fields for buildApprovalDetail
              approval_1_status: item.first_item_approval_1_status,
              approval_1_user_name: item.first_item_approval_1_user_name,
              approval_1_at: formatOptionalDateTime(item.first_item_approval_1_at),
              approval_1_remark: item.first_item_approval_1_remark,
              approval_2_status: item.first_item_approval_2_status,
              approval_2_user_name: item.first_item_approval_2_user_name,
              approval_2_at: formatOptionalDateTime(item.first_item_approval_2_at),
              approval_2_remark: item.first_item_approval_2_remark,
              approval_3_status: item.first_item_approval_3_status,
              approval_3_user_name: item.first_item_approval_3_user_name,
              approval_3_at: formatOptionalDateTime(item.first_item_approval_3_at),
              approval_3_remark: item.first_item_approval_3_remark,
              // Rework metadata for buildReworkSummary (latest rework)
              rework_stage: latestRework?.stage ?? null,
              rework_by_username: latestRework?.by_username ?? null,
              rework_at: latestRework?.at ?? null,
              rework_reason: latestRework?.reason ?? null,
              // All reworks for multi-rework display
              reworks,
            };
          })
        : [];

      setRequests(prev => [...prev.filter(item => item.mode === "single"), ...massRequests]);
    } catch (error) {
      console.error("Failed to fetch mass requests:", error);
      openSnackbar("Failed to load mass requests.", "warning");
    } finally {
      setRequestsLoading(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    fetchSingleRequests();
    fetchMassRequests();
  }, [fetchSingleRequests, fetchMassRequests]);
  useEffect(() => {
    const firstRowForActiveTab = requests.find(item => item.mode === activeTab);

    if (!firstRowForActiveTab) {
      setActiveRequestId(null);
      return;
    }

    const activeRow = requests.find(item => item.requestKey === activeRequestId);
    if (!activeRow || activeRow.mode !== activeTab) {
      setActiveRequestId(firstRowForActiveTab.requestKey);
    }
  }, [activeRequestId, activeTab, requests]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage - 1); // Pagination component is 1-indexed, but our state is 0-indexed
  };

  const selectedRequest = useMemo(
    () => requests.find(item => item.requestKey === activeRequestId) || null,
    [activeRequestId, requests]
  );

  useEffect(() => {
    if (!isChangeExtendRequest(selectedRequest)) {
      return;
    }

    if (actionDialogMode !== "rework" && !reviseChangeExtendOpen) {
      return;
    }

    let active = true;

    const loadInitialLocations = async () => {
      try {
        const response = await axiosPrivate.get("/material/initial-screen-data");
        if (active) {
          setInitialLocations(response.data?.data?.locations || []);
        }
      } catch (error) {
        if (active) {
          setInitialLocations([]);
        }
      }
    };

    loadInitialLocations();

    return () => {
      active = false;
    };
  }, [actionDialogMode, reviseChangeExtendOpen, axiosPrivate, selectedRequest]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizeSearchValue = value => String(value || "").toLowerCase();

    const nextRows = requests.filter(item => {
      const matchesTab = item.mode === activeTab;
      const matchesSearch =
        query === "" ||
        normalizeSearchValue(item.ticketNumber).includes(query) ||
        normalizeSearchValue(item.ticketType).includes(query) ||
        normalizeSearchValue(item.materialDescription).includes(query) ||
        normalizeSearchValue(item.status).includes(query) ||
        normalizeSearchValue(item.assignedTo).includes(query);

      return matchesTab && matchesSearch;
    });

    if (groupBy === "none") {
      return nextRows;
    }

    return [...nextRows].sort((left, right) => {
      const leftValue = String(left[groupBy] || "").toLowerCase();
      const rightValue = String(right[groupBy] || "").toLowerCase();
      return leftValue.localeCompare(rightValue);
    });
  }, [activeTab, groupBy, requests, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage));

  const groupedSummary = useMemo(() => {
    if (groupBy === "none") {
      return [];
    }

    return filteredRequests.reduce((acc, item) => {
      const key = item[groupBy] || "Unassigned";
      const existing = acc.find(entry => entry.key === key);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ key, count: 1 });
      }
      return acc;
    }, []);
  }, [filteredRequests, groupBy]);

  function openSnackbar(message, severity = "success") {
    setSnackbar({ open: true, message, severity });
  }

  const handleMenuOpen = (event, request) => {
    setMenuAnchorEl(event.currentTarget);
    setActiveRequestId(request.requestKey);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleOpenActionDialog = mode => {
    setActionDialogMode(mode);
    handleMenuClose();
  };

  const handleCreateRequest = () => {
    const routeByTab = {
      single: "/dashboard/materials/request/single",
      mass: "/dashboard/materials/request/mass",
    };

    navigate(routeByTab[activeTab] || routeByTab.single);
  };

  const handleReviseRequest = async detail => {
    setActionDialogMode(null);

    if (selectedRequest?.mode === "mass") {
      try {
        const response = await axiosPrivate.get(
          `/material/requests/mass/${selectedRequest.id}/items`
        );
        setMassReworkItems(response.data?.data ?? []);
        setReviseMassOpen(true);
      } catch (error) {
        openSnackbar(
          error?.response?.data?.message || "Failed to load mass request items.",
          "error"
        );
      }
      return;
    }

    if (isChangeExtendRequest(selectedRequest)) {
      setReviseChangeExtendOpen(true);
      return;
    }

    navigate(`/dashboard/materials/request/single/${detail.id}/rework`);
  };

  const handleScopedReworkSubmit = async payload => {
    if (!selectedRequest?.id) {
      return;
    }

    try {
      setScopedReworkSubmitting(true);
      await axiosPrivate.put(`/material/requests/single/${selectedRequest.id}/rework`, payload);
      setActionDialogMode(null);
      setReviseChangeExtendOpen(false);
      await fetchSingleRequests();
      openSnackbar("Revised request saved successfully", "success");
    } catch (error) {
      openSnackbar(
        error?.response?.data?.message || "Failed to save revised request.",
        "error"
      );
    } finally {
      setScopedReworkSubmitting(false);
    }
  };

  const handleMassReworkSubmit = async payload => {
    if (!selectedRequest?.id) return;

    try {
      setMassReworkSubmitting(true);
      await axiosPrivate.put(
        `/material/requests/mass/${selectedRequest.id}/rework`,
        { items: payload }
      );
      setReviseMassOpen(false);
      setMassReworkItems([]);
      await Promise.all([fetchSingleRequests(), fetchMassRequests()]);
      openSnackbar("Mass request revised successfully", "success");
    } catch (error) {
      openSnackbar(
        error?.response?.data?.message || "Failed to save revised mass request.",
        "error"
      );
    } finally {
      setMassReworkSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <PageHeader
        title="My Request"
        subtitle="List of requests created by the user with their status."
        actions={
          <>
            <Button variant="contained" onClick={() => openSnackbar("Download to Excel will be connected to API later", "info")}>
              Download to Excel
            </Button>
            <PageSearchField
              placeholder="Search"
              value={searchQuery}
              onChange={event => { setSearchQuery(event.target.value); setPage(0); }}
              sx={{ width: { xs: "100%", md: 220 } }}
            />
          </>
        }
      />

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <PageTabs
            value={activeTab}
            onChange={(_, value) => { setActiveTab(value); setPage(0); }}
            tabs={[
              { value: "single", label: "Single Request" },
              { value: "mass", label: "Mass Request" },
            ]}
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "stretch", md: "center" },
              flexDirection: { xs: "column", md: "row" },
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <Select
                value={groupBy}
                onChange={event => {
                  setGroupBy(event.target.value);
                  setPage(0);
                }}
              >
                {GROUP_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "stretch", sm: "center" },
                gap: 1.25,
                width: { xs: "100%", md: "auto" },
              }}
            >
              <Button variant="contained" startIcon={<Add />} onClick={handleCreateRequest}>
                New
              </Button>
            </Box>
          </Box>

          {groupedSummary.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
              {groupedSummary.map(item => (
                <Chip
                  key={item.key}
                  label={`${item.key}: ${item.count}`}
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                />
              ))}
            </Box>
          )}

          <PageTablePaper>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>Action</TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>Ticket Number</TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>Ticket Type</TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, minWidth: 280 }}>
                    {activeTab === "mass" ? "Mass Request Reason" : "Material Description"}
                  </TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>UOM</TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>Status</TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>Created by</TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>Created at</TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>Assigned to</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requestsLoading && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Loading requests...
                    </TableCell>
                  </TableRow>
                )}
                {filteredRequests
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map(row => (
                    <TableRow
                      key={row.requestKey}
                      hover
                      selected={row.requestKey === activeRequestId}
                      sx={{
                        "& .MuiTableCell-root": { verticalAlign: "top" },
                        backgroundColor: "transparent !important", // Ensure no zebra striping
                      }}
                    >
                      <TableCell>
                        <IconButton size="small" onClick={event => handleMenuOpen(event, row)}>
                          <MoreHoriz />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => setActiveRequestId(row.requestKey)}
                          sx={{ px: 0, minWidth: 0, textTransform: "none", fontWeight: 600 }}
                        >
                          {row.ticketNumber}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <TicketTypePill value={row.ticketType} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {activeTab === "mass" ? row.massRequestReason : row.materialDescription}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{row.uom}</TableCell>
                      <TableCell>
                        <StatusPill status={row.status} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{row.createdBy}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{row.createdAt}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{row.assignedTo}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </PageTablePaper>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 2,
              mt: 1,
            }}
          >
            <Pagination
              count={totalPages}
              page={page + 1}
              onChange={handleChangePage}
              color="primary"
              disabled={totalPages <= 1}
              size="medium"
            />
          </Box>

          {filteredRequests.length === 0 && (
            <Paper variant="outlined" sx={{ mt: 2, p: 3, textAlign: "center" }}>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                No request found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Coba ubah keyword pencarian atau tab request.
              </Typography>
            </Paper>
          )}
        </Box>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 180,
            borderRadius: 2,
            mt: 1,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            handleOpenActionDialog("approval");
          }}
        >
          View Approval
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleOpenActionDialog("rework");
          }}
        >
          View Rework
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>Copy Request</MenuItem>
      </Menu>

      <RequestActionDialog
        open={Boolean(actionDialogMode) && Boolean(selectedRequest)}
        mode={actionDialogMode}
        request={selectedRequest}
        onClose={() => setActionDialogMode(null)}
        onReviseRequest={handleReviseRequest}
      />

      <Dialog
        open={reviseChangeExtendOpen && Boolean(selectedRequest)}
        onClose={() => setReviseChangeExtendOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
            Revise Request
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#455a64" }}>
            {selectedRequest?.ticketNumber}
          </Typography>
        </Box>
        <DialogContent sx={{ py: 3 }}>
          <ChangeExtendReworkForm
            row={selectedRequest}
            locations={initialLocations}
            onSubmit={handleScopedReworkSubmit}
            onCancel={() => setReviseChangeExtendOpen(false)}
            submitting={scopedReworkSubmitting}
          />
        </DialogContent>
      </Dialog>

      <MassReworkForm
        open={reviseMassOpen}
        ticketNumber={selectedRequest?.ticketNumber}
        massRequestReason={selectedRequest?.massRequestReason}
        items={massReworkItems}
        onClose={() => {
          setReviseMassOpen(false);
          setMassReworkItems([]);
        }}
        onSubmit={handleMassReworkSubmit}
        submitting={massReworkSubmitting}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
