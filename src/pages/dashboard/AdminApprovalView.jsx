import {
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
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
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
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import {
  APPROVAL_GROUP_OPTIONS,
  filterApprovalRows,
  normalizeApprovalRows,
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

export default function AdminApprovalView() {
  const axiosPrivate = useAxiosPrivate();
  const refreshWarningTimeoutRef = useRef(null);
  const [approvalRows, setApprovalRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState("none");
  const [loading, setLoading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeRow, setActiveRow] = useState(null);
  const [approvalDialogRow, setApprovalDialogRow] = useState(null);
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

  const visibleRows = useMemo(() => {
    const filteredRows = filterApprovalRows(approvalRows, searchQuery);
    return sortApprovalRows(filteredRows, groupBy);
  }, [approvalRows, groupBy, searchQuery]);

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
    setApprovalDialogRow(row);
  };

  const handleOpenRework = (row = activeRow) => {
    handleMenuClose();
    openSnackbar(
      `View Rework untuk tiket ${row?.ticketNumber || "-"} akan disambungkan ke form rework.`,
      "info"
    );
  };

  const handleApprovalAction = async (action, detail, remark) => {
    clearRefreshWarningTimeout();

    if (action !== "Approve") {
      openSnackbar(`${action} belum masuk scope approval saat ini.`, "info");
      return;
    }

    try {
      setSubmittingAction(true);
      const response = await axiosPrivate.post(
        `/material/requests/single/${detail.id}/approve`,
        { remark }
      );

      const nextStage = response.data?.data?.next_stage;
      setApprovalDialogRow(null);
      openSnackbar(getApprovalSuccessMessage(nextStage), "success");

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
                  visibleRows.map(row => (
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
                        No approval item found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Coba ubah keyword pencarian atau cek assignment approval.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

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
        onClose={() => setApprovalDialogRow(null)}
        onAction={handleApprovalAction}
        submitting={submittingAction}
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
