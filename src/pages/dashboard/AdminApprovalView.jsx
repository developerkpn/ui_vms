import {
  Close,
  Download,
  KeyboardArrowDown,
  MoreHoriz,
  Search,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import useSessionStore from "src/store/useSessionStore";
import AdminApprovalFormDialog from "src/components/admin-approval/AdminApprovalFormDialog";
import MassApprovalFormDialog from "src/components/admin-approval/MassApprovalFormDialog";
import MassReworkStatusDialog from "src/components/admin-approval/MassReworkStatusDialog";
import { buildApprovalDetail } from "src/helper/adminApprovalDetail.js";
import {
  buildEmailReplyCaption,
  buildReworkEmailSentMessage,
  isReworkEmailOnlyResult,
  isReworkEmailSendFailed,
  REWORK_EMAIL_SEND_FAILED_MESSAGE,
} from "src/helper/reworkEmailThread.js";
import { getSapStatusChip, getStagedMaterialCode, isSapError } from "src/helper/sapStatus.js";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { buildApprovalSubGroupsRequestPath } from "src/helper/adminApprovalSubGroup.js";
import {
  buildMassReworkRequestBody,
  buildSingleReworkRequestBody,
  findReworkStepLabel,
} from "src/helper/adminApprovalRework.js";
import { mapApprovalServerErrors } from "src/helper/adminApprovalValidation.js";
import {
  APPROVAL_STATUS_FILTER_OPTIONS,
  ASSIGNMENT_FILTER_ASSIGNED_TO_ME,
  ASSIGNMENT_FILTER_REQUEST_ALL,
  MDM_ASSIGNMENT_FILTER_OPTIONS,
  filterApprovalRows,
  filterApprovalRowsByStatus,
  getEffectiveApprovalStatusLabel,
  isMdmMaterialUser,
  normalizeApprovalRows,
  normalizeMassApprovalRows,
  paginateApprovalRows,
  filterMassApprovalRows,
  filterMassApprovalRowsByStatus,
  paginateMassApprovalRows,
} from "src/helper/adminApprovalView.js";
import PageHeader from "src/components/common/PageHeader";
import PageTablePaper, { PAGE_TABLE_HEADER_SX } from "src/components/common/PageTablePaper";
import PageTabs from "src/components/common/PageTabs";
import TableLoadingRows, { TableEmptyRow } from "src/components/common/TableLoadingRows";


const statusStyleMap = {
  Submit: { bgcolor: "#2f62d6", color: "common.white" },
  Approved: { bgcolor: "#2f62d6", color: "common.white" },
  Rework: { bgcolor: "#f59e0b", color: "common.white" },
  Reject: { bgcolor: "#dc2626", color: "common.white" },
  Cancel: { bgcolor: "#dc2626", color: "common.white" },
  Waiting: { bgcolor: "#8f96a3", color: "common.white" },
  Done: { bgcolor: "#16a34a", color: "common.white" },
};

function StatusBadge({ value }) {
  return (
    <Chip
      label={value || "Waiting"}
      size="small"
      sx={{
        fontWeight: 800,
        ...(statusStyleMap[value] || statusStyleMap.Waiting),
      }}
    />
  );
}

// Spells out which step a still-open request is sitting on — waiting on a named
// approver, or waiting for Master Data to grab it — so it can be read off the
// Status column instead of inferred from "Assigned To" at the far right.
function AssignmentCaption({ status, caption }) {
  return (
    <Tooltip title={caption.text} arrow placement="top">
      <Stack spacing={0.5} alignItems="flex-start" sx={{ maxWidth: 220, mx: "auto" }}>
        <StatusBadge value={status} />
        <Typography
          variant="caption"
          sx={{
            color: caption.kind === "UNASSIGNED" ? "#f59e0b" : "text.secondary",
            fontWeight: 600,
            textAlign: "left",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {caption.text}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

// Same caption slot the SAP error message and the assignment caption already
// occupy under the Status chip, in a distinct colour: a reply landing is news,
// not a fault, so it must not read like the red SAP error line above it.
const EMAIL_REPLY_CAPTION_SX = {
  color: "success.main",
  fontWeight: 600,
  textAlign: "left",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

// Show the SAP staging status (waiting / created / error) once a request has
// been pushed; otherwise fall back to the approval status.
function SapAwareStatusBadgeContent({ row }) {
  const sapChip = getSapStatusChip(row?.sapPushStatus);
  if (!sapChip) {
    // Only a request still moving through the approval flow ("Submit") has a
    // next actor to name.
    if (row?.assignmentCaption && getEffectiveApprovalStatusLabel(row) === "Submit") {
      return <AssignmentCaption status={row.status} caption={row.assignmentCaption} />;
    }
    return <StatusBadge value={row?.status} />;
  }

  const chip = (
    <Chip
      label={sapChip.label}
      size="small"
      sx={{
        fontWeight: 800,
        bgcolor: sapChip.bgcolor,
        color: "common.white",
      }}
    />
  );

  if (isSapError(row?.sapPushStatus) && row?.sapErrorMsg) {
    // Surface the SAP write-back message (ERRORMSG_POST) inline, with the full
    // text on hover in case it is truncated.
    return (
      <Tooltip title={row.sapErrorMsg} arrow placement="top">
        <Stack spacing={0.5} alignItems="flex-start" sx={{ maxWidth: 220, mx: "auto" }}>
          {chip}
          <Typography
            variant="caption"
            sx={{
              color: "#dc2626",
              fontWeight: 600,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {row.sapErrorMsg}
          </Typography>
        </Stack>
      </Tooltip>
    );
  }
  return chip;
}

// The status cell: the chip (or chip + its own caption) plus, when the approver
// answered the rework mail, a line saying so. Nothing is rendered for a request
// with no replies, so every row that has none looks exactly as it did.
function SapAwareStatusBadge({ row }) {
  const replyCaption = buildEmailReplyCaption(row?.emailReplyCount);
  const statusContent = <SapAwareStatusBadgeContent row={row} />;

  if (replyCaption === "") {
    return statusContent;
  }

  return (
    <Stack spacing={0.5} alignItems="flex-start" sx={{ maxWidth: 220, mx: "auto" }}>
      {statusContent}
      <Typography variant="caption" sx={EMAIL_REPLY_CAPTION_SX}>
        {replyCaption}
      </Typography>
    </Stack>
  );
}

function TicketTypeBadge({ value }) {
  return (
    <Chip
      label={value || "Create"}
      size="small"
      deleteIcon={<KeyboardArrowDown />}
      onDelete={() => {}}
      sx={{
        minWidth: 112,
        justifyContent: "space-between",
        borderRadius: "8px",
        bgcolor: "#8d8f91",
        color: "common.white",
        fontWeight: 800,
        "& .MuiChip-deleteIcon": {
          color: "common.white",
          fontSize: 20,
        },
      }}
    />
  );
}

function ReworkStatusDialog({ open, row, onClose }) {
  const detail = useMemo(() => buildApprovalDetail(row || {}), [row]);
  const reworkSummary = detail.reworkSummary || {};

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
            Rework Status
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#455a64", lineHeight: 1.1 }}>
            {detail.ticketNumber || "-"}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 600, color: "text.secondary" }}>
            {detail.basicInfo.materialDescription || "-"}
          </Typography>
        </Box>

        <IconButton onClick={onClose} aria-label="Close rework status dialog">
          <Close />
        </IconButton>
      </Box>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack spacing={1.5}>
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
            <Stack spacing={1.25}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 1.25,
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ display: "block", fontWeight: 800, mb: 0.5 }}>
                    Rework By
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                    {reworkSummary.approver || "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ display: "block", fontWeight: 800, mb: 0.5 }}>
                    Rework At
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                    {reworkSummary.approvedAt || "-"}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 800, mb: 0.5 }}>
                  Reason
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                  {reworkSummary.reason || "-"}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

const isChangeExtendRequest = row =>
  ["CHANGE", "EXTEND"].includes(String(row?.ticketType || row?.ticket_type || "").toUpperCase());

// "Assigned To" cell content for the inbox: just the current assignee.
function AssignedToCell({ row }) {
  return (
    <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
      {row.assignedTo}
    </Typography>
  );
}

export default function AdminApprovalView() {
  const axiosPrivate = useAxiosPrivate();
  const isMdmUser = useSessionStore(isMdmMaterialUser);
  const currentUserId = useSessionStore(state => state.user_id);
  const refreshWarningTimeoutRef = useRef(null);
  const [approvalRows, setApprovalRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeRow, setActiveRow] = useState(null);
  const [approvalDialogRow, setApprovalDialogRow] = useState(null);
  const [reworkDialogRow, setReworkDialogRow] = useState(null);
  const [approvalDialogSubGroups, setApprovalDialogSubGroups] = useState([]);
  const [approvalDialogSchema, setApprovalDialogSchema] = useState(null);
  // Both of the above land after the approval dialog is already open, so the
  // dialog is told they are still coming rather than being left to render an
  // empty Specification section that fills itself in a beat later.
  const [approvalDialogDataLoading, setApprovalDialogDataLoading] = useState(false);
  const [approvalDialogServerErrors, setApprovalDialogServerErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "info",
    message: "",
  });
  const [activeTab, setActiveTab] = useState("single");
  const [massApprovalRows, setMassApprovalRows] = useState([]);
  const [massApprovalServerErrors, setMassApprovalServerErrors] = useState({});
  const [massApprovalDialogRow, setMassApprovalDialogRow] = useState(null);
  const [massReworkDialogRow, setMassReworkDialogRow] = useState(null);
  const [massApprovalItems, setMassApprovalItems] = useState([]);
  const [massApprovalItemsLoading, setMassApprovalItemsLoading] = useState(false);

  // "Request All" scope: every request any Master Data user has ever grabbed, not just
  // this actor's own inbox. Fetched lazily on first selection and cached here, so
  // switching filters doesn't re-fetch. "idle" -> "loading" -> "loaded"; anything short
  // of "loaded" falls back to the default inbox rows rather than blanking the table.
  const [mdmAllApprovalRows, setMdmAllApprovalRows] = useState([]);
  const [mdmAllMassApprovalRows, setMdmAllMassApprovalRows] = useState([]);
  const [mdmAllRowsStatus, setMdmAllRowsStatus] = useState("idle");
  // Claims the one-shot fetch. A ref, not state, so claiming it doesn't re-run the effect
  // that guards on it. Released on failure so re-selecting the filter retries.
  const mdmAllFetchStartedRef = useRef(false);

  const fetchMassApprovalRows = async () => {
    const response = await axiosPrivate.get("/material/requests/mass/approval-inbox");
    const rows = normalizeMassApprovalRows(response.data?.data);
    setMassApprovalRows(rows);
  };

  const fetchApprovalRows = async () => {
    const response = await axiosPrivate.get("/material/requests/single/approval-inbox");
    const rows = normalizeApprovalRows(response.data?.data);
    setApprovalRows(rows);
  };

  const fetchMdmAllApprovalRows = async () => {
    const response = await axiosPrivate.get("/material/requests/single/approval-inbox", {
      params: { scope: "mdmAll" },
    });
    return normalizeApprovalRows(response.data?.data);
  };

  const fetchMdmAllMassApprovalRows = async () => {
    const response = await axiosPrivate.get("/material/requests/mass/approval-inbox", {
      params: { scope: "mdmAll" },
    });
    return normalizeMassApprovalRows(response.data?.data);
  };

  /**
   * Re-pull the widened scope after an action, but only once it has been loaded — an
   * actor who never opened "Request All" this session shouldn't fetch it just because
   * they approved something on "Assigned To Me".
   *
   * Rejects rather than swallowing, so the single and mass action handlers can raise their
   * existing "inbox belum diperbarui" warning instead of leaving a stale row under a
   * success message. The grab handler only logs — which is why the failure path below
   * leaves the rendered rows alone.
   */
  const refreshMdmAllRowsIfLoaded = async () => {
    if (mdmAllRowsStatus !== "loaded") {
      return;
    }

    try {
      const [singleRows, massRows] = await Promise.all([
        fetchMdmAllApprovalRows(),
        fetchMdmAllMassApprovalRows(),
      ]);
      setMdmAllApprovalRows(singleRows);
      setMdmAllMassApprovalRows(massRows);
    } catch (error) {
      // Release the one-shot claim so re-selecting "Request All" refetches rather than
      // serving rows missing this action. The status deliberately stays "loaded": dropping
      // it to "idle" would pull the widened rows out from under a table the actor may be
      // looking at, and the grab path has no warning to explain why they vanished.
      mdmAllFetchStartedRef.current = false;
      throw error;
    }
  };

  /**
   * A Master Data grab landed in one of the approval dialogs. Both inboxes are
   * re-pulled because a claim changes who the row is assigned to for every MDM
   * user, not just the one who grabbed it — and the dialog itself already shows
   * the claim from the endpoint's own answer, so a failed refresh is logged
   * rather than raised at the actor.
   */
  const handleMdmGrabbed = () => {
    Promise.all([
      fetchApprovalRows(),
      fetchMassApprovalRows(),
      refreshMdmAllRowsIfLoaded(),
    ]).catch(refreshError =>
      console.error("Failed to refresh after MDM grab:", refreshError)
    );
  };

  const clearRefreshWarningTimeout = () => {
    if (refreshWarningTimeoutRef.current) {
      clearTimeout(refreshWarningTimeoutRef.current);
      refreshWarningTimeoutRef.current = null;
    }
  };

  const getApprovalSuccessMessage = nextStage => {
    if (nextStage === "Approval 2") {
      return "Approval 1 berhasil. Request dipindahkan ke Approval 2";
    }

    if (nextStage === "Approval 3") {
      return "Approval 2 berhasil. Approval 3 otomatis di-assign oleh sistem dan menunggu approval.";
    }

    return "Approval berhasil diproses.";
  };

  const getActionSuccessMessage = (action, nextStage, reworkStepLabel = null) => {
    if (action === "Rework") {
      // A rework aimed at an approval step — an existing one it rewinds to, or
      // a hand-picked approver it hands the chain to — is not a rework back to
      // the requester: the request goes to that approver with status Submit.
      return reworkStepLabel
        ? `Request berhasil dikembalikan ke ${reworkStepLabel} untuk direview ulang.`
        : "Request berhasil dikembalikan untuk dirework.";
    }

    if (action === "Reject") {
      return "Request berhasil direject dan status berubah menjadi Cancel.";
    }

    return getApprovalSuccessMessage(nextStage);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchApprovalRows(),
          fetchMassApprovalRows(),
        ]);
      } catch (error) {
        console.error("Failed to fetch approval data:", error);
        setApprovalRows([]);
        openSnackbar("Data approval belum bisa dimuat. Silakan refresh halaman lagi.", "warning");
      } finally {
        setLoading(false);
      }
    };

    run();

    return () => {
      clearRefreshWarningTimeout();
    };
  }, [axiosPrivate]);

  // One-shot lazy fetch of the widened "Request All" scope, on first selection by a
  // Master Data user. Deliberately has no cleanup that cancels the in-flight request:
  // what it loads is cached data, not view state, so a fetch outliving the selection
  // that started it should still populate the cache. Cancelling it here would instead
  // strand mdmAllRowsStatus on "loading" with the ref already claimed — no rows, no
  // retry. A failure releases the claim so re-selecting the filter tries again.
  useEffect(() => {
    if (
      !isMdmUser ||
      statusFilter !== ASSIGNMENT_FILTER_REQUEST_ALL ||
      mdmAllFetchStartedRef.current
    ) {
      return;
    }

    mdmAllFetchStartedRef.current = true;
    setMdmAllRowsStatus("loading");

    const loadMdmAllRows = async () => {
      try {
        const [singleRows, massRows] = await Promise.all([
          fetchMdmAllApprovalRows(),
          fetchMdmAllMassApprovalRows(),
        ]);
        setMdmAllApprovalRows(singleRows);
        setMdmAllMassApprovalRows(massRows);
        setMdmAllRowsStatus("loaded");
      } catch (error) {
        console.error("Failed to fetch Request All inbox scope:", error);
        mdmAllFetchStartedRef.current = false;
        setMdmAllRowsStatus("error");
        openSnackbar(
          "Request All belum berhasil dimuat sepenuhnya. Menampilkan data yang tersedia saat ini.",
          "warning"
        );
      }
    };

    loadMdmAllRows();
  }, [isMdmUser, statusFilter, axiosPrivate]);

  useEffect(() => {
    if (!approvalDialogRow) {
      setApprovalDialogSubGroups([]);
      setApprovalDialogSchema(null);
      setApprovalDialogDataLoading(false);
      return undefined;
    }

    const requestPath = buildApprovalSubGroupsRequestPath(approvalDialogRow);
    const materialGroupCode =
      approvalDialogRow?.materialGroupCode || approvalDialogRow?.material_group_code || "";

    let active = true;
    setApprovalDialogDataLoading(true);

    const loadDialogData = async () => {
      const [subGroupResult, schemaResult] = await Promise.allSettled([
        requestPath ? axiosPrivate.get(requestPath) : Promise.resolve(null),
        materialGroupCode
          ? axiosPrivate.get(`/material/groups/${materialGroupCode}/form-schema`)
          : Promise.resolve(null),
      ]);

      if (!active) {
        return;
      }

      setApprovalDialogDataLoading(false);

      if (subGroupResult.status === "fulfilled") {
        const response = subGroupResult.value;
        setApprovalDialogSubGroups(
          Array.isArray(response?.data?.data) ? response.data.data : []
        );
      } else {
        console.error("Failed to fetch approval dialog sub groups:", subGroupResult.reason);
        setApprovalDialogSubGroups([]);
        openSnackbar(
          "Sub material group belum berhasil dimuat di form approval. Silakan coba buka lagi.",
          "warning"
        );
      }

      if (schemaResult.status === "fulfilled") {
        setApprovalDialogSchema(schemaResult.value?.data?.data || null);
      } else {
        console.error("Failed to fetch approval dialog schema:", schemaResult.reason);
        setApprovalDialogSchema(null);
        openSnackbar(
          "Rule validasi form approval belum berhasil dimuat. Silakan coba buka lagi.",
          "warning"
        );
      }
    };

    loadDialogData();

    return () => {
      active = false;
    };
  }, [approvalDialogRow, axiosPrivate]);

  const sortRowsByConfig = (rows, config) => {
    if (!config.key) {
      return rows;
    }
    const direction = config.direction === "desc" ? -1 : 1;
    const getSortValue = row =>
      config.key === "materialCode" ? getStagedMaterialCode(row) : row[config.key];
    return [...rows].sort(
      (left, right) =>
        String(getSortValue(left) || "").localeCompare(String(getSortValue(right) || "")) *
        direction
    );
  };

  // Master Data users get two extra Status options that slice the inbox by who
  // grabbed the Master Data step, at any status; every other role keeps the
  // plain status list.
  const statusFilterOptions = isMdmUser
    ? [...APPROVAL_STATUS_FILTER_OPTIONS, ...MDM_ASSIGNMENT_FILTER_OPTIONS]
    : APPROVAL_STATUS_FILTER_OPTIONS;

  // "No Rework item found" reads fine for a status, but not for the assignment
  // options — those get their own wording.
  const buildEmptyStateTitle = noun => {
    if (statusFilter === ASSIGNMENT_FILTER_ASSIGNED_TO_ME) {
      return `No ${noun} assigned to you`;
    }
    if (statusFilter === ASSIGNMENT_FILTER_REQUEST_ALL) {
      return `No ${noun} grabbed by Master Data`;
    }
    return `No ${statusFilter === "All" ? "" : `${statusFilter} `}${noun} found`;
  };

  // "Request All" reads the widened scope once loaded; otherwise the default inbox.
  const isRequestAllFilterActive = isMdmUser && statusFilter === ASSIGNMENT_FILTER_REQUEST_ALL;
  const mdmAllRowsReady = mdmAllRowsStatus === "loaded";
  // Pending covers "idle" too, not just "loading": selecting the filter is a discrete
  // update, so this can render once before the passive effect flips the status. Reading
  // "loading" only would let the empty state paint for that frame. "error" is excluded so
  // the failed fetch settles on the fallback rows instead of loading forever.
  const isMdmAllPending =
    isRequestAllFilterActive && !mdmAllRowsReady && mdmAllRowsStatus !== "error";

  const visibleRows = useMemo(() => {
    const sourceRows =
      isRequestAllFilterActive && mdmAllRowsReady ? mdmAllApprovalRows : approvalRows;
    const statusRows = filterApprovalRowsByStatus(sourceRows, statusFilter, currentUserId);
    const searchRows = filterApprovalRows(statusRows, searchQuery);
    return sortRowsByConfig(searchRows, sortConfig);
  }, [
    approvalRows,
    mdmAllApprovalRows,
    isRequestAllFilterActive,
    mdmAllRowsReady,
    sortConfig,
    searchQuery,
    statusFilter,
    currentUserId,
  ]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / rowsPerPage));
  // Approving or rejecting removes the row from this inbox, so the row count can
  // shrink under a page the actor is already standing on. Clamping on read keeps
  // the last page rendering rows instead of going blank.
  const currentPage = Math.min(page, totalPages - 1);

  const pagedRows = useMemo(
    () => paginateApprovalRows(visibleRows, currentPage, rowsPerPage),
    [currentPage, rowsPerPage, visibleRows]
  );

  const handleStatusFilterChange = event => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage - 1); // Pagination component is 1-indexed, but our state is 0-indexed
  };

  const handleSort = key => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setPage(0);
  };

  // Mass tab derived rows
  const massVisibleRows = useMemo(() => {
    const sourceRows =
      isRequestAllFilterActive && mdmAllRowsReady ? mdmAllMassApprovalRows : massApprovalRows;
    const statusRows = filterMassApprovalRowsByStatus(sourceRows, statusFilter, currentUserId);
    const searchRows = filterMassApprovalRows(statusRows, searchQuery);
    return sortRowsByConfig(searchRows, sortConfig);
  }, [
    massApprovalRows,
    mdmAllMassApprovalRows,
    isRequestAllFilterActive,
    mdmAllRowsReady,
    statusFilter,
    searchQuery,
    sortConfig,
    currentUserId,
  ]);

  const massTotalPages = Math.max(1, Math.ceil(massVisibleRows.length / rowsPerPage));
  const massCurrentPage = Math.min(page, massTotalPages - 1);

  const massPagedRows = useMemo(
    () => paginateMassApprovalRows(massVisibleRows, massCurrentPage, rowsPerPage),
    [massCurrentPage, rowsPerPage, massVisibleRows]
  );

  const handleMenuOpen = (event, row) => {
    setActiveRow(row);
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleOpenApproval = (row = activeRow) => {
    handleMenuClose();
    setApprovalDialogServerErrors({});
    setMassApprovalServerErrors({});

    if (row?.massRequestNo) {
      // Mass request - fetch items and open mass dialog
      setMassApprovalDialogRow(row);
      // Set in the same batch as the row so the dialog's first paint already
      // shows skeleton rows, rather than "No items available" for one frame.
      setMassApprovalItemsLoading(true);
      setMassApprovalItems([]);
      axiosPrivate
        .get(`/material/requests/mass/${row.id}/items`)
        .then(response => {
          setMassApprovalItems(response.data?.data || []);
        })
        .catch(() => {
          setMassApprovalItems([]);
        })
        .finally(() => {
          setMassApprovalItemsLoading(false);
        });
    } else {
      setApprovalDialogRow(row);
      // Same reason: the sub-group/schema effect below only runs after this
      // render, and the dialog is already on screen by then.
      setApprovalDialogDataLoading(true);
    }
  };

  const handleOpenRework = (row = activeRow) => {
    handleMenuClose();
    if (row?.massRequestNo) {
      setMassReworkDialogRow(row);
    } else {
      setReworkDialogRow(row || null);
    }
  };

  // SAP rejected the pushed request: reopen the Master Data step in place so
  // this MDM user can edit the data in the approval dialog and re-approve —
  // re-approval re-stages the row to SAP as freshly submitted. Server-side
  // this is gated to an active MDM_MATERIAL user (or ADMIN) only.
  //
  // A mass batch works the same way, request-level: one errored item reopens
  // Master Data for the whole batch, and the re-approval asks for a fresh
  // running number that recomposes every item's code.
  const handleMdmSapResubmit = async (row = activeRow) => {
    handleMenuClose();
    if (!row?.id) {
      return;
    }

    const isMassRow = Boolean(row?.massRequestNo);

    try {
      setSubmittingAction(true);
      await axiosPrivate.post(
        isMassRow
          ? `/material/requests/mass/${row.id}/sap-resubmit`
          : `/material/requests/single/${row.id}/sap-resubmit`
      );

      openSnackbar(
        isMassRow
          ? "Mass request dibuka kembali di tahap Master Data. Silakan edit lalu approve ulang untuk resubmit ke SAP."
          : "Request dibuka kembali di tahap Master Data. Silakan edit lalu approve ulang untuk resubmit ke SAP.",
        "success"
      );

      try {
        await fetchApprovalRows();
        await fetchMassApprovalRows();
        await refreshMdmAllRowsIfLoaded();
      } catch (refreshError) {
        console.error("Failed to refresh approval rows after SAP resubmit:", refreshError);
        refreshWarningTimeoutRef.current = setTimeout(() => {
          openSnackbar(
            "Resubmit berhasil diproses, tetapi inbox belum berhasil diperbarui. Silakan refresh halaman.",
            "warning"
          );
          refreshWarningTimeoutRef.current = null;
        }, 1600);
      }
    } catch (error) {
      openSnackbar(
        error?.response?.data?.message || "Gagal memulai resubmit ke SAP.",
        "error"
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleApprovalAction = async (action, detail, payload) => {
    clearRefreshWarningTimeout();

    if (!["Approve", "Rework", "Reject"].includes(action)) {
      openSnackbar(`${action} belum masuk scope approval saat ini.`, "info");
      return;
    }

    try {
      setSubmittingAction(true);
      setApprovalDialogServerErrors({});
      const endpoint =
        action === "Rework"
          ? `/material/requests/single/${detail.id}/rework`
          : action === "Reject"
            ? `/material/requests/single/${detail.id}/reject`
            : `/material/requests/single/${detail.id}/approve`;
      const isScopedChangeExtend = isChangeExtendRequest(detail.rawRow || detail);
      const requestBody =
        action === "Rework"
          ? buildSingleReworkRequestBody({
              reason: payload?.remark ?? null,
              destination: payload,
            })
          : action === "Reject"
            ? { reason: payload?.remark ?? null }
            : isScopedChangeExtend
              ? {
                  remark: payload?.remark ?? null,
                  finalCodeSuffix: payload?.finalCodeSuffix ?? null,
                }
              : {
                  remark: payload?.remark ?? null,
                  finalCodeSuffix: payload?.finalCodeSuffix ?? null,
                  editedRequest: payload?.editedRequest ?? {},
                };
      const response = await axiosPrivate.post(endpoint, requestBody);

      const nextStage = response.data?.data?.next_stage;
      const emailSendFailed = isReworkEmailSendFailed(response);
      setApprovalDialogRow(null);
      openSnackbar(
        // "Via email" is correspondence only: nothing was reassigned, so the
        // message says what actually happened rather than naming a destination
        // the request never went to — including the send that failed.
        isReworkEmailOnlyResult(response)
          ? emailSendFailed
            ? REWORK_EMAIL_SEND_FAILED_MESSAGE
            : buildReworkEmailSentMessage(payload?.reworkRecipientEmail)
          : getActionSuccessMessage(
              action,
              nextStage,
              payload?.reworkDestinationLabel ||
                findReworkStepLabel(
                  detail.approvalSteps,
                  requestBody.reworkToLevel
                )
            ),
        emailSendFailed ? "warning" : "success"
      );

      try {
        await fetchApprovalRows();
        await refreshMdmAllRowsIfLoaded();
      } catch (refreshError) {
        console.error("Failed to refresh approval rows after approval:", refreshError);
        refreshWarningTimeoutRef.current = setTimeout(() => {
          openSnackbar(
            "Approval berhasil diproses, tetapi inbox belum berhasil diperbarui. Silakan refresh halaman.",
            "warning"
          );
          refreshWarningTimeoutRef.current = null;
        }, 1600);
      }
    } catch (error) {
      setApprovalDialogServerErrors(
        mapApprovalServerErrors(error?.response?.data?.errors)
      );
      const message =
        error?.response?.data?.message || "Approval gagal diproses. Silakan coba lagi.";
      openSnackbar(message, "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(0);
  };

  // `options` carries the rework destination on a Rework, and the Master Data
  // running number (finalCodeSuffix) on an Approve — never both.
  const handleMassApprovalAction = async (
    action,
    reason,
    editedItems,
    options = {}
  ) => {
    const reworkDestination = options;
    const row = massApprovalDialogRow;
    if (!row) return;

    clearRefreshWarningTimeout();

    try {
      setSubmittingAction(true);
      setMassApprovalServerErrors({});

      const actionPath = action === "approve"
        ? "approve"
        : action === "rework"
          ? "rework"
          : action === "reject"
            ? "reject"
            : null;

      if (!actionPath) {
        openSnackbar(`${action} belum masuk scope approval saat ini.`, "info");
        return;
      }

      const endpoint = `/material/requests/mass/${row.id}/${actionPath}`;
      const requestBody =
        action === "approve"
          ? {
              remark: reason ?? null,
              items: editedItems ?? null,
              // Only sent from the Master Data stage; every earlier stage
              // approves with null, exactly as it did before.
              finalCodeSuffix: options?.finalCodeSuffix ?? null,
            }
          : action === "rework"
            ? // Mass rework has no reworkToLevel support: either the requester
              // (exactly what it sent before) or a replacement chain.
              buildMassReworkRequestBody({
                reason: reason ?? null,
                destination: reworkDestination,
              })
            : { reason: reason ?? null };

      const response = await axiosPrivate.post(endpoint, requestBody);

      const massEmailSendFailed = isReworkEmailSendFailed(response);
      setMassApprovalDialogRow(null);
      setMassApprovalItems([]);
      setMassApprovalItemsLoading(false);
      openSnackbar(
        action === "approve"
          ? "Mass request berhasil di-approve."
          : action === "rework"
            ? // "Via email" is correspondence only: the batch was not
              // reassigned, so it never went to a destination worth naming —
              // and a failed send must not read as a sent one.
              isReworkEmailOnlyResult(response)
              ? massEmailSendFailed
                ? REWORK_EMAIL_SEND_FAILED_MESSAGE
                : buildReworkEmailSentMessage(
                    reworkDestination?.reworkRecipientEmail
                  )
              : reworkDestination?.reworkDestinationLabel
                ? `Mass request berhasil dikembalikan ke ${reworkDestination.reworkDestinationLabel} untuk direview ulang.`
                : "Mass request berhasil dikembalikan untuk dirework."
            : "Mass request berhasil di-reject.",
        massEmailSendFailed ? "warning" : "success"
      );

      try {
        await Promise.all([
          fetchApprovalRows(),
          fetchMassApprovalRows(),
          refreshMdmAllRowsIfLoaded(),
        ]);
      } catch (refreshError) {
        console.error("Failed to refresh after mass action:", refreshError);
        refreshWarningTimeoutRef.current = setTimeout(() => {
          openSnackbar(
            "Aksi berhasil diproses, tetapi inbox belum berhasil diperbarui. Silakan refresh halaman.",
            "warning"
          );
          refreshWarningTimeoutRef.current = null;
        }, 1600);
      }
    } catch (error) {
      // A rejected running number (invalid / overflow / code already taken)
      // comes back as a finalCodeSuffix field error, which reopens the Final
      // Code dialog in the mass dialog instead of just flashing a snackbar.
      setMassApprovalServerErrors(
        mapApprovalServerErrors(error?.response?.data?.errors)
      );
      const message =
        error?.response?.data?.message || "Aksi gagal diproses. Silakan coba lagi.";
      openSnackbar(message, "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  function openSnackbar(message, severity = "info") {
    clearRefreshWarningTimeout();
    setSnackbar({ open: true, message, severity });
  }

  return (
    <Box sx={{ pb: { xs: 4, md: 6 } }}>
      <PageHeader
        title="My Approval"
        subtitle="A list of items awaiting your approval"
        actions={
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => openSnackbar("Download to Excel akan disambungkan ke API export.", "info")}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              py: 1.25,
              bgcolor: "#3367d6",
              boxShadow: "0 14px 26px rgba(51, 103, 214, 0.26)",
              "&:hover": {
                bgcolor: "#2557c7",
                boxShadow: "0 16px 30px rgba(51, 103, 214, 0.32)",
              },
            }}
          >
            Download To Excel
          </Button>
        }
      />

      <PageTabs
        value={activeTab}
        onChange={handleTabChange}
        tabs={[
          { value: "single", label: "Single Requests" },
          { value: "mass", label: "Mass Requests" },
        ]}
      />

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 4, width: "100%" }}
      >
        <TextField
          size="small"
          placeholder={
            activeTab === "single"
              ? "Search approval by ticket, description, status, requester..."
              : "Search mass request by number, reason, requester..."
          }
          value={searchQuery}
          onChange={event => { setSearchQuery(event.target.value); setPage(0); }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Search sx={{ color: "text.secondary" }} />
                <KeyboardArrowDown sx={{ ml: 1.25, color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: { xs: "1 1 100%", md: "1 1 auto" },
            minWidth: { md: 280 },
            bgcolor: "background.paper",
            "& .MuiOutlinedInput-root": {
              minHeight: 50,
              borderRadius: "7px",
              fontSize: "0.95rem",
              color: "text.primary",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#d7dde6",
            },
            "& .MuiInputBase-input::placeholder": {
              color: "text.secondary",
              opacity: 0.85,
            },
          }}
        />

        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={handleStatusFilterChange}
          SelectProps={{ native: true }}
          sx={{
            width: { xs: "100%", md: 220 },
            bgcolor: "background.paper",
            "& .MuiOutlinedInput-root": {
              borderRadius: "7px",
              minHeight: 50,
            },
          }}
        >
          {statusFilterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </TextField>
      </Stack>

      {/* Single tab table */}
      {activeTab === "single" && (
        <PageTablePaper>
              <Table size="small" sx={{ minWidth: 1060 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={PAGE_TABLE_HEADER_SX}>
                      Action
                    </TableCell>
                    <TableCell sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "ticketNumber"}
                        direction={sortConfig.key === "ticketNumber" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("ticketNumber")}
                      >
                        Ticket Number
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "ticketType"}
                        direction={sortConfig.key === "ticketType" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("ticketType")}
                      >
                        Ticket Type
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>
                      <TableSortLabel
                        active={sortConfig.key === "materialCode"}
                        direction={sortConfig.key === "materialCode" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("materialCode")}
                      >
                        Material Code
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, minWidth: 280 }}>
                      <TableSortLabel
                        active={sortConfig.key === "materialDescription"}
                        direction={
                          sortConfig.key === "materialDescription" ? sortConfig.direction : "asc"
                        }
                        onClick={() => handleSort("materialDescription")}
                      >
                        Material Description
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "uom"}
                        direction={sortConfig.key === "uom" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("uom")}
                      >
                        UOM
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "status"}
                        direction={sortConfig.key === "status" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("status")}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "createdBy"}
                        direction={sortConfig.key === "createdBy" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("createdBy")}
                      >
                        Created by
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "createdAt"}
                        direction={sortConfig.key === "createdAt" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("createdAt")}
                      >
                        Created at
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "assignedTo"}
                        direction={sortConfig.key === "assignedTo" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("assignedTo")}
                      >
                        Assigned to
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(loading || isMdmAllPending) && <TableLoadingRows columns={10} />}

                  {!loading &&
                    !isMdmAllPending &&
                    pagedRows.map(row => (
                      <TableRow
                        key={row.id || row.ticketNumber}
                        hover
                        sx={{
                          "& .MuiTableCell-root": {
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            color: "text.secondary",
                            verticalAlign: "middle",
                            py: 1.75,
                          },
                          "&:last-child .MuiTableCell-root": {
                            borderBottom: "none",
                          },
                        }}
                      >
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            aria-label={`Open action menu for ${row.ticketNumber}`}
                            onClick={event => handleMenuOpen(event, row)}
                            sx={{ color: "text.secondary" }}
                          >
                            <MoreHoriz />
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => handleOpenApproval(row)}
                            sx={{
                              p: 0,
                              minWidth: 0,
                              color: "#0f5ad7",
                              fontWeight: 800,
                              textTransform: "none",
                            }}
                          >
                            {row.ticketNumber}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <TicketTypeBadge value={row.ticketType} />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 700 }}>
                          {getStagedMaterialCode(row) || "-"}
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", fontWeight: 600 }}>
                          {row.materialDescription}
                        </TableCell>
                        <TableCell align="center" sx={{ color: "text.secondary", fontWeight: 700 }}>
                          {row.uom}
                        </TableCell>
                        <TableCell align="center">
                          <SapAwareStatusBadge row={row} />
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                          {row.createdBy}
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                          {row.createdAt}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <AssignedToCell row={row} />
                        </TableCell>
                      </TableRow>
                    ))}

                  {!loading && !isMdmAllPending && visibleRows.length === 0 && (
                    <TableEmptyRow
                      columns={10}
                      title={buildEmptyStateTitle("item")}
                      description="Coba ubah filter status, keyword pencarian, atau cek assignment approval."
                    />
                  )}
                </TableBody>
              </Table>
        </PageTablePaper>
      )}

      {activeTab === "single" && (
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
            page={currentPage + 1}
            onChange={handleChangePage}
            color="primary"
            disabled={totalPages <= 1}
            size="medium"
          />
        </Box>
      )}

      {/* Mass tab table */}

      {activeTab === "mass" && (
        <PageTablePaper>
              <Table size="small" sx={{ minWidth: 1060 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={PAGE_TABLE_HEADER_SX}>
                      Action
                    </TableCell>
                    <TableCell sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "massRequestNo"}
                        direction={sortConfig.key === "massRequestNo" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("massRequestNo")}
                      >
                        Ticket Number
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "ticketType"}
                        direction={sortConfig.key === "ticketType" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("ticketType")}
                      >
                        Ticket Type
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, minWidth: 280 }}>
                      <TableSortLabel
                        active={sortConfig.key === "massRequestReason"}
                        direction={
                          sortConfig.key === "massRequestReason" ? sortConfig.direction : "asc"
                        }
                        onClick={() => handleSort("massRequestReason")}
                      >
                        Mass Request Reason
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "status"}
                        direction={sortConfig.key === "status" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("status")}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "createdBy"}
                        direction={sortConfig.key === "createdBy" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("createdBy")}
                      >
                        Created by
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "createdAt"}
                        direction={sortConfig.key === "createdAt" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("createdAt")}
                      >
                        Created at
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={PAGE_TABLE_HEADER_SX}>
                      <TableSortLabel
                        active={sortConfig.key === "assignedTo"}
                        direction={sortConfig.key === "assignedTo" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("assignedTo")}
                      >
                        Assigned to
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(loading || isMdmAllPending) && <TableLoadingRows columns={8} />}

                  {!loading &&
                    !isMdmAllPending &&
                    massPagedRows.map(row => (
                      <TableRow
                        key={row.id || row.massRequestNo}
                        hover
                        sx={{
                          "& .MuiTableCell-root": {
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            color: "text.secondary",
                            verticalAlign: "middle",
                            py: 1.75,
                          },
                          "&:last-child .MuiTableCell-root": {
                            borderBottom: "none",
                          },
                        }}
                      >
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            aria-label={`Open action menu for ${row.massRequestNo}`}
                            onClick={event => handleMenuOpen(event, row)}
                            sx={{ color: "text.secondary" }}
                          >
                            <MoreHoriz />
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => handleOpenApproval(row)}
                            sx={{
                              p: 0,
                              minWidth: 0,
                              color: "#0f5ad7",
                              fontWeight: 800,
                              textTransform: "none",
                            }}
                          >
                            {row.massRequestNo}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <TicketTypeBadge value={row.ticketType || "Create"} />
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", fontWeight: 600 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 240,
                            }}
                            title={row.massRequestReason}
                          >
                            {row.massRequestReason}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <SapAwareStatusBadge row={row} />
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                          {row.createdBy}
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                          {row.createdAt}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <AssignedToCell row={row} />
                        </TableCell>
                      </TableRow>
                    ))}

                  {!loading && !isMdmAllPending && massVisibleRows.length === 0 && (
                    <TableEmptyRow
                      columns={8}
                      title={buildEmptyStateTitle("mass request")}
                      description="Coba ubah filter status, keyword pencarian, atau cek assignment approval."
                    />
                  )}
                </TableBody>
              </Table>
        </PageTablePaper>
      )}

      {activeTab === "mass" && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            py: 2,
            mt: 1,
          }}
        >
          <Pagination
            count={massTotalPages}
            page={massCurrentPage + 1}
            onChange={handleChangePage}
            color="primary"
            disabled={massTotalPages <= 1}
            size="medium"
          />
        </Box>
      )}

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1,
            minWidth: 180,
            borderRadius: 1,
            overflow: "hidden",
          },
        }}
      >
        <MenuItem onClick={() => handleOpenApproval()}>View Approval</MenuItem>
        <Divider />
        <MenuItem onClick={() => handleOpenRework()}>View Rework</MenuItem>
        {isMdmUser && isSapError(activeRow?.sapPushStatus) && <Divider />}
        {isMdmUser && isSapError(activeRow?.sapPushStatus) && (
          <MenuItem
            onClick={() => handleMdmSapResubmit()}
            disabled={submittingAction}
            sx={{ color: "#dc2626", fontWeight: 700 }}
          >
            Resubmit to SAP
          </MenuItem>
        )}
      </Menu>

      <AdminApprovalFormDialog
        open={Boolean(approvalDialogRow)}
        row={approvalDialogRow}
        subGroups={approvalDialogSubGroups}
        formSchema={approvalDialogSchema}
        referenceDataLoading={approvalDialogDataLoading}
        serverValidationErrors={approvalDialogServerErrors}
        onClearServerValidationErrors={() => setApprovalDialogServerErrors({})}
        onClose={() => {
          setApprovalDialogRow(null);
          setApprovalDialogServerErrors({});
        }}
        onAction={handleApprovalAction}
        onGrabbed={handleMdmGrabbed}
        submitting={submittingAction}
      />

      <ReworkStatusDialog
        open={Boolean(reworkDialogRow)}
        row={reworkDialogRow}
        onClose={() => setReworkDialogRow(null)}
      />

      <MassApprovalFormDialog
        open={Boolean(massApprovalDialogRow)}
        row={massApprovalDialogRow}
        items={massApprovalItems}
        itemsLoading={massApprovalItemsLoading}
        serverValidationErrors={massApprovalServerErrors}
        onClose={() => {
          setMassApprovalDialogRow(null);
          setMassApprovalItems([]);
          setMassApprovalItemsLoading(false);
          setMassApprovalServerErrors({});
        }}
        onAction={handleMassApprovalAction}
        onGrabbed={handleMdmGrabbed}
        submitting={submittingAction}
      />

      <MassReworkStatusDialog
        open={Boolean(massReworkDialogRow)}
        row={massReworkDialogRow}
        onClose={() => setMassReworkDialogRow(null)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
