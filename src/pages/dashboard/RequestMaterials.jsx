import { Add, ContentCopy, Download, MoreHoriz } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  Pagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const GROUP_OPTIONS = [
  { value: "none", label: "Group By" },
  { value: "status", label: "Status" },
  { value: "ticketType", label: "Ticket Type" },
  { value: "assignedTo", label: "Assigned To" },
];

const INITIAL_REQUESTS = [
  {
    id: 1,
    mode: "single",
    ticketNumber: "1000000001",
    ticketType: "Create",
    materialDescription: "PUMP, CENTRIFUGAL INVESTA STR 1X1.5-8",
    uom: "PC",
    status: "Submit",
    createdBy: "admin.admin",
    createdAt: "2026-01-10 16:30",
    assignedTo: "master.data",
    reworkReason: "",
    approvalSteps: [
      {
        title: "Approval 1",
        owner: "superior.superior",
        status: "Approve",
        date: "2026-01-11 17:00",
      },
      { title: "Approval 2", owner: "manager.manager", status: "Waiting", date: "-" },
      { title: "Master Data", owner: "master.data", status: "Waiting", date: "-" },
    ],
  },
  {
    id: 2,
    mode: "single",
    ticketNumber: "1000000002",
    ticketType: "Change",
    materialDescription: "VALVE, GATE, 2 INCH STAINLESS STEEL",
    uom: "EA",
    status: "Rework",
    createdBy: "rizki.user",
    createdAt: "2026-01-12 09:20",
    assignedTo: "superior.superior",
    reworkReason: "Lengkapi spesifikasi tekanan kerja dan lampiran drawing terbaru.",
    approvalSteps: [
      {
        title: "Approval 1",
        owner: "superior.superior",
        status: "Rework",
        date: "2026-01-12 13:10",
      },
      { title: "Approval 2", owner: "manager.manager", status: "Waiting", date: "-" },
      { title: "Master Data", owner: "master.data", status: "Waiting", date: "-" },
    ],
  },
  {
    id: 3,
    mode: "mass",
    ticketNumber: "1000000003",
    ticketType: "Extend",
    materialDescription: "CABLE GLAND SET FOR CONTROL PANEL REVAMP",
    uom: "SET",
    status: "Waiting",
    createdBy: "salsa.proc",
    createdAt: "2026-01-13 11:05",
    assignedTo: "manager.manager",
    reworkReason: "",
    approvalSteps: [
      {
        title: "Approval 1",
        owner: "superior.superior",
        status: "Approve",
        date: "2026-01-13 12:40",
      },
      { title: "Approval 2", owner: "manager.manager", status: "Waiting", date: "-" },
      { title: "Master Data", owner: "master.data", status: "Waiting", date: "-" },
    ],
  },
  {
    id: 4,
    mode: "mass",
    ticketNumber: "1000000004",
    ticketType: "Create",
    materialDescription: "BEARING KIT FOR MILLING MACHINE",
    uom: "KIT",
    status: "Done",
    createdBy: "admin.admin",
    createdAt: "2026-01-14 08:45",
    assignedTo: "master.data",
    reworkReason: "",
    approvalSteps: [
      {
        title: "Approval 1",
        owner: "superior.superior",
        status: "Approve",
        date: "2026-01-14 09:10",
      },
      {
        title: "Approval 2",
        owner: "manager.manager",
        status: "Approve",
        date: "2026-01-14 10:25",
      },
      { title: "Master Data", owner: "master.data", status: "Done", date: "2026-01-14 14:00" },
    ],
  },
];

function StatusPill({ status }) {
  const colorMap = {
    Submit: "primary",
    Approve: "primary",
    Rework: "warning",
    Reject: "error",
    Cancel: "error",
    Done: "success",
    Waiting: "default",
  };

  return <Chip label={status} color={colorMap[status] || "default"} size="small" />;
}

function TicketTypePill({ value }) {
  return <Chip label={value} variant="outlined" size="small" />;
}

export default function RequestMaterials() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [activeTab, setActiveTab] = useState("mass");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState("none");
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [addMenuAnchorEl, setAddMenuAnchorEl] = useState(null);
  const [activeRequestId, setActiveRequestId] = useState(INITIAL_REQUESTS[0].id);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [reworkDialogOpen, setReworkDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage - 1); // Pagination component is 1-indexed, but our state is 0-indexed
  };

  const selectedRequest = useMemo(
    () => requests.find(item => item.id === activeRequestId) || null,
    [activeRequestId, requests]
  );

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const nextRows = requests.filter(item => {
      const matchesTab = item.mode === activeTab;
      const matchesSearch =
        query === "" ||
        item.ticketNumber.toLowerCase().includes(query) ||
        item.ticketType.toLowerCase().includes(query) ||
        item.materialDescription.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.assignedTo.toLowerCase().includes(query);

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

  const openSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleMenuOpen = (event, request) => {
    setMenuAnchorEl(event.currentTarget);
    setActiveRequestId(request.id);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleCopyRequest = () => {
    if (!selectedRequest) {
      return;
    }

    const nextId = Math.max(...requests.map(item => item.id)) + 1;
    const copyCount = requests.filter(item =>
      item.ticketNumber.startsWith(selectedRequest.ticketNumber)
    ).length;

    setRequests(prev => [
      {
        ...selectedRequest,
        id: nextId,
        ticketNumber: `${selectedRequest.ticketNumber}-${copyCount}`,
        status: "Waiting",
        createdAt: "2026-05-04 10:30",
      },
      ...prev,
    ]);

    handleMenuClose();
    openSnackbar("Request copied to a new draft");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.03em" }}>
            My Request
          </Typography>
          <Typography variant="body1" color="text.secondary">
            List of requests created by the user with their status.
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: { xs: "stretch", md: "flex-end" },
            gap: 1,
            width: { xs: "100%", md: "auto" },
          }}
        >
          <Button
            variant="contained"
            onClick={() => openSnackbar("Download to Excel will be connected to API later", "info")}
          >
            Download to Excel
          </Button>
          <TextField
            size="small"
            placeholder="Search"
            value={searchQuery}
            onChange={event => {
              setSearchQuery(event.target.value);
              setPage(0);
            }}
            sx={{ width: { xs: "100%", md: 220 } }}
          />
        </Box>
      </Box>

      <Paper
        sx={{
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => {
              setActiveTab(value);
              setPage(0);
            }}
            sx={{ mb: 2 }}
          >
            <Tab value="single" label="Single Request" />
            <Tab value="mass" label="Mass Request" />
          </Tabs>

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
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={(e) => setAddMenuAnchorEl(e.currentTarget)}
                >
                  New
                </Button>
                <Menu
                  anchorEl={addMenuAnchorEl}
                  open={Boolean(addMenuAnchorEl)}
                  onClose={() => setAddMenuAnchorEl(null)}
                  PaperProps={{
                    elevation: 3,
                    sx: {
                      minWidth: 160,
                      borderRadius: 2,
                      mt: 0.5,
                    },
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      setAddMenuAnchorEl(null);
                      navigate("/dashboard/materials/request/single");
                    }}
                  >
                    Single Request
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setAddMenuAnchorEl(null);
                      navigate("/dashboard/materials/request/mass");
                    }}
                  >
                    Mass Request
                  </MenuItem>
                </Menu>
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

          <TableContainer>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Action</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Ticket Number</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Ticket Type</TableCell>
                  <TableCell sx={{ minWidth: 280 }}>
                    {activeTab === "mass" ? "Mass Request Reason" : "Material Description"}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>UOM</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Status</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Created by</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Created at</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Assigned to</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map(row => (
                    <TableRow
                      key={row.id}
                      hover
                      selected={row.id === activeRequestId}
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
                          onClick={() => setActiveRequestId(row.id)}
                          sx={{ px: 0, minWidth: 0, textTransform: "none", fontWeight: 600 }}
                        >
                          {row.ticketNumber}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <TicketTypePill value={row.ticketType} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{row.materialDescription}</TableCell>
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
          </TableContainer>

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
      </Paper>

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
            setApprovalDialogOpen(true);
            handleMenuClose();
          }}
        >
          View Approval
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setReworkDialogOpen(true);
            handleMenuClose();
          }}
        >
          View Rework
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleCopyRequest}>Copy Request</MenuItem>
      </Menu>

      <Dialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Approval Detail</DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {selectedRequest.ticketNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedRequest.materialDescription}
              </Typography>
              {selectedRequest.approvalSteps.map(step => (
                <Paper key={step.title} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {step.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.owner}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <StatusPill status={step.status} />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.75 }}
                      >
                        {step.date}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={reworkDialogOpen}
        onClose={() => setReworkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rework Detail</DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {selectedRequest.ticketNumber}
              </Typography>
              <StatusPill status={selectedRequest.status} />
              <Typography variant="body2" color="text.secondary">
                {selectedRequest.reworkReason || "Request ini belum punya catatan rework."}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReworkDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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
