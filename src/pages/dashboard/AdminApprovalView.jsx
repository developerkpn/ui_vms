import {
  Close,
  Download,
  FilterAltOutlined,
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
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminApprovalFormDialog from "src/components/admin-approval/AdminApprovalFormDialog";
import { buildApprovalDetail } from "src/helper/adminApprovalDetail.mjs";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { buildApprovalSubGroupsRequestPath } from "src/helper/adminApprovalSubGroup.mjs";
import { mapApprovalServerErrors } from "src/helper/adminApprovalValidation.mjs";
import {
  APPROVAL_GROUP_OPTIONS,
  APPROVAL_STATUS_FILTER_OPTIONS,
  filterApprovalRows,
  filterApprovalRowsByStatus,
  normalizeApprovalRows,
  paginateApprovalRows,
  sortApprovalRows,
  summarizeApprovalGroups,
} from "src/helper/adminApprovalView.mjs";

const tableHeaderSx = {
  color: "text.secondary",
  fontSize: "0.78rem",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  py: 2.25,
  borderBottom: "1px solid",
  borderColor: "divider",
};

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
        minWidth: 96,
        height: 32,
        borderRadius: 1,
        fontWeight: 800,
        ...(statusStyleMap[value] || statusStyleMap.Waiting),
      }}
    />
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

export default function AdminApprovalView() {
  const axiosPrivate = useAxiosPrivate();
  const refreshWarningTimeoutRef = useRef(null);
  const [approvalRows, setApprovalRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState("none");
  const [statusFilter, setStatusFilter] = useState("Submit");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeRow, setActiveRow] = useState(null);
  const [approvalDialogRow, setApprovalDialogRow] = useState(null);
  const [reworkDialogRow, setReworkDialogRow] = useState(null);
  const [approvalDialogSubGroups, setApprovalDialogSubGroups] = useState([]);
  const [approvalDialogSchema, setApprovalDialogSchema] = useState(null);
  const [approvalDialogServerErrors, setApprovalDialogServerErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "info",
    message: "",
  });

  const fetchApprovalRows = async () => {
    const response = await axiosPrivate.get("/material/requests/single/approval-inbox");
    const rows = normalizeApprovalRows(response.data?.data);
    setApprovalRows(rows);
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

  const getActionSuccessMessage = (action, nextStage) => {
    if (action === "Rework") {
      return "Request berhasil dikembalikan untuk dirework.";
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
        await fetchApprovalRows();
      } catch (error) {
        console.error("Failed to fetch approval rows:", error);
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

  useEffect(() => {
    if (!approvalDialogRow) {
      setApprovalDialogSubGroups([]);
      setApprovalDialogSchema(null);
      return undefined;
    }

    const requestPath = buildApprovalSubGroupsRequestPath(approvalDialogRow);
    const materialGroupCode =
      approvalDialogRow?.materialGroupCode || approvalDialogRow?.material_group_code || "";

    let active = true;

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

  const visibleRows = useMemo(() => {
    const statusRows = filterApprovalRowsByStatus(approvalRows, statusFilter);
    const searchRows = filterApprovalRows(statusRows, searchQuery);
    return sortApprovalRows(searchRows, groupBy);
  }, [approvalRows, groupBy, searchQuery, statusFilter]);

  const pagedRows = useMemo(
    () => paginateApprovalRows(visibleRows, page, rowsPerPage),
    [page, rowsPerPage, visibleRows]
  );

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / rowsPerPage));

  const handleChangePage = (event, nextPage) => {
    setPage(nextPage - 1);
  };

  const handleStatusFilterChange = event => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleRowsPerPageChange = event => {
    setRowsPerPage(Number(event.target.value) || 10);
    setPage(0);
  };

  const groupedSummary = useMemo(
    () => summarizeApprovalGroups(visibleRows, groupBy),
    [groupBy, visibleRows]
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
    setApprovalDialogRow(row);
  };

  const handleOpenRework = (row = activeRow) => {
    handleMenuClose();
    setReworkDialogRow(row || null);
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
        action === "Rework" || action === "Reject"
          ? { reason: payload?.remark ?? null }
          : isScopedChangeExtend
            ? { remark: payload?.remark ?? null }
            : {
                remark: payload?.remark ?? null,
                editedRequest: payload?.editedRequest ?? {},
              };
      const response = await axiosPrivate.post(endpoint, requestBody);

      const nextStage = response.data?.data?.next_stage;
      setApprovalDialogRow(null);
      openSnackbar(getActionSuccessMessage(action, nextStage), "success");

      try {
        await fetchApprovalRows();
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

  function openSnackbar(message, severity = "info") {
    clearRefreshWarningTimeout();
    setSnackbar({ open: true, message, severity });
  }

  return (
    <Box sx={{ pb: { xs: 4, md: 6 } }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.5px" }}
          >
            My Approval
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            A list of items awaiting your approval
          </Typography>
        </Box>

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
      </Box>

      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 2.5,
          width: "100%",
          maxWidth: { md: "800px" },
        }}
      >
        <TextField
          fullWidth
          size="medium"
          placeholder="Search approval by ticket, description, status, requester..."
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Search sx={{ color: "text.secondary" }} />
                <KeyboardArrowDown sx={{ ml: 1.25, color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            bgcolor: "background.paper",
            "& .MuiOutlinedInput-root": {
              minHeight: 70,
              borderRadius: "10px",
              fontSize: "1rem",
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
          value={groupBy}
          onChange={event => setGroupBy(event.target.value)}
          SelectProps={{ native: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FilterAltOutlined fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: "100%", md: 400 },
            bgcolor: "background.paper",
            "& .MuiOutlinedInput-root": {
              borderRadius: "7px",
              minHeight: 50,
            },
            "& select": {
              color: "text.secondary",
              fontSize: "0.95rem",
            },
          }}
        >
          {APPROVAL_GROUP_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </TextField>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          useFlexGap
          flexWrap="wrap"
        >
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            SelectProps={{ native: true }}
            sx={{
              width: { xs: "100%", md: 240 },
              bgcolor: "background.paper",
              "& .MuiOutlinedInput-root": {
                borderRadius: "7px",
                minHeight: 50,
              },
            }}
          >
            {APPROVAL_STATUS_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
            SelectProps={{ native: true }}
            sx={{
              width: { xs: "100%", md: 160 },
              bgcolor: "background.paper",
              "& .MuiOutlinedInput-root": {
                borderRadius: "7px",
                minHeight: 50,
              },
            }}
          >
            {[10, 25, 50].map(option => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </TextField>
        </Stack>

        {groupedSummary.length > 0 && (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {groupedSummary.map(item => (
              <Chip
                key={item.key}
                label={`${item.key}: ${item.count}`}
                size="small"
                sx={{ bgcolor: "background.paper", fontWeight: 700 }}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Paper
          elevation={0}
          sx={{
            minWidth: 1060,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "12px",
            overflow: "hidden",
            bgcolor: "background.paper",
          }}
        >
          <TableContainer>
            <Table size="small" sx={{ minWidth: 1060 }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={tableHeaderSx}>
                    Action
                  </TableCell>
                  <TableCell sx={tableHeaderSx}>Ticket Number</TableCell>
                  <TableCell sx={tableHeaderSx}>Ticket Type</TableCell>
                  <TableCell sx={{ ...tableHeaderSx, minWidth: 280 }}>
                    Material Description
                  </TableCell>
                  <TableCell align="center" sx={tableHeaderSx}>
                    UOM
                  </TableCell>
                  <TableCell align="center" sx={tableHeaderSx}>
                    Status
                  </TableCell>
                  <TableCell sx={tableHeaderSx}>Created by</TableCell>
                  <TableCell sx={tableHeaderSx}>Created at</TableCell>
                  <TableCell sx={tableHeaderSx}>Assigned to</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      Loading approval items...
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
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
                      <TableCell sx={{ color: "text.secondary", fontWeight: 600 }}>
                        {row.materialDescription}
                      </TableCell>
                      <TableCell align="center" sx={{ color: "text.secondary", fontWeight: 700 }}>
                        {row.uom}
                      </TableCell>
                      <TableCell align="center">
                        <StatusBadge value={row.status} />
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                        {row.createdBy}
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                        {row.createdAt}
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                        {row.assignedTo}
                      </TableCell>
                    </TableRow>
                  ))}

                {!loading && visibleRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        No {statusFilter} item found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Coba ubah filter status, keyword pencarian, atau cek assignment approval.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {!loading && visibleRows.length > 0 && (
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
      </Menu>

      <AdminApprovalFormDialog
        open={Boolean(approvalDialogRow)}
        row={approvalDialogRow}
        subGroups={approvalDialogSubGroups}
        formSchema={approvalDialogSchema}
        serverValidationErrors={approvalDialogServerErrors}
        onClearServerValidationErrors={() => setApprovalDialogServerErrors({})}
        onClose={() => {
          setApprovalDialogRow(null);
          setApprovalDialogServerErrors({});
        }}
        onAction={handleApprovalAction}
        submitting={submittingAction}
      />

      <ReworkStatusDialog
        open={Boolean(reworkDialogRow)}
        row={reworkDialogRow}
        onClose={() => setReworkDialogRow(null)}
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
