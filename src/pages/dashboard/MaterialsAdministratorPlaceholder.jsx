import { Search } from "@mui/icons-material";
import {
  Autocomplete,
  Box,
  Chip,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { useSnackBar } from "src/provider/SnackbarProvider";
import {
  buildAssignApproverPayload,
  buildAssignmentSuccessMessage,
  getApproverSelectOptions,
  isApproverDropdownDisabled,
  mergeAssignedApproverRow,
  normalizeApproverOptions,
} from "src/helper/materialAdministratorAssignment.mjs";

const tableHeaderSx = {
  backgroundColor: "#f6f8fb",
  borderBottom: "1px solid",
  borderColor: "divider",
  color: "text.secondary",
  fontSize: "0.78rem",
  fontWeight: 800,
  letterSpacing: "0.05em",
  py: 2,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const autoCompleteSx = {
  minWidth: 220,
  "& .MuiOutlinedInput-root": {
    alignItems: "flex-start",
    borderRadius: "12px",
    minHeight: 52,
    pt: 0.35,
  },
  "& .MuiAutocomplete-inputRoot": {
    pr: "38px !important",
  },
};

export default function MaterialsAdministratorPlaceholder() {
  const axiosPrivate = useAxiosPrivate();
  const { openSnackbar } = useSnackBar();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [approverRows, setApproverRows] = useState([]);
  const [savingRows, setSavingRows] = useState({});
  const [helperMessage, setHelperMessage] = useState(
    "Approval 3 akan dipilih otomatis oleh sistem dari user group MDM_MATERIAL."
  );

  const approverPools = useMemo(
    () => normalizeApproverOptions(approverRows),
    [approverRows]
  );

  useEffect(() => {
    let isMounted = true;

    const loadPageData = async () => {
      setLoading(true);

      const [approvalInboxResult, userListResult] = await Promise.allSettled([
        axiosPrivate.get("/material/requests/single/approval-inbox"),
        axiosPrivate.get("/user/"),
      ]);

      if (!isMounted) {
        return;
      }

      const fetchedApproverRows =
        userListResult.status === "fulfilled" ? userListResult.value?.data?.data : [];
      setApproverRows(fetchedApproverRows);
      
      const pools = normalizeApproverOptions(fetchedApproverRows);

      const nextRows =
        approvalInboxResult.status === "fulfilled"
          ? normalizeAdministratorRows(approvalInboxResult.value?.data?.data)
          : buildFallbackRows(pools.manualApprovers);

      setRows(nextRows);

      if (approvalInboxResult.status !== "fulfilled" && userListResult.status !== "fulfilled") {
        setHelperMessage(
          "Data request dan user belum berhasil dimuat. Halaman menampilkan struktur administrator dasar."
        );
      } else if (approvalInboxResult.status !== "fulfilled") {
        setHelperMessage(
          "Inbox request approval belum tersedia. Tabel tetap ditampilkan dengan requester fallback."
        );
      } else if (nextRows.length === 0) {
        setHelperMessage(
          "Belum ada request material yang masuk inbox administrator. Approval 3 tetap by system dari MDM_MATERIAL."
        );
      }

      setLoading(false);
    };

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, [axiosPrivate]);

  const visibleRows = useMemo(() => {
    const query = String(searchQuery).trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter(row => {
      const approval1Option = approverPools.manualApprovers.find(o => o.id === row.approval1UserId);
      const approval1Label = approval1Option ? approval1Option.label : "";
      
      const approval2Option = approverPools.manualApprovers.find(o => o.id === row.approval2UserId);
      const approval2Label = approval2Option ? approval2Option.label : "";

      return [
        row.requesterUsername,
        row.requestNumber,
        approval1Label,
        approval2Label,
        row.approval3UserId,
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query));
    });
  }, [approverPools, rows, searchQuery]);

  const handleApproverChange = async (row, field, option) => {
    const nextValue = option?.id || "";
    const payload = buildAssignApproverPayload({
      previousRow: row,
      nextField: field,
      nextValue,
    });
  
    if (Object.keys(payload).length === 0) {
      return;
    }
  
    const optimisticRow = {
      ...row,
      [field]: nextValue,
    };
  
    setRows(previous =>
      previous.map(item => (item.id === row.id ? optimisticRow : item))
    );
    setSavingRows(previous => ({ ...previous, [row.id]: true }));
  
    try {
      const response = await axiosPrivate.patch(
        `/material/requests/single/${row.id}/assign-approvers`,
        payload
      );
      const nextRow = mergeAssignedApproverRow(optimisticRow, response.data?.data);
  
      setRows(previous =>
        previous.map(item => (item.id === row.id ? nextRow : item))
      );
      openSnackbar("success", buildAssignmentSuccessMessage(row, nextRow));
    } catch (error) {
      setRows(previous =>
        previous.map(item => (item.id === row.id ? row : item))
      );
      openSnackbar(
        "error",
        error.response?.data?.message || "Gagal menyimpan approver."
      );
    } finally {
      setSavingRows(previous => ({ ...previous, [row.id]: false }));
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.75, pb: { xs: 4, md: 6 } }}>
      <Box sx={{ width: "100%", maxWidth: 460 }}>
        <TextField
          fullWidth
          placeholder="Search username, request number, approval..."
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "16px",
              minHeight: 56,
            },
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.1 }}>
          {helperMessage}
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "22px",
          overflow: "hidden",
        }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ ...tableHeaderSx, width: 84 }}>
                  No
                </TableCell>
                <TableCell sx={{ ...tableHeaderSx, minWidth: 260 }}>Username</TableCell>
                <TableCell sx={{ ...tableHeaderSx, minWidth: 280 }}>Approval 1</TableCell>
                <TableCell sx={{ ...tableHeaderSx, minWidth: 280 }}>Approval 2</TableCell>
                <TableCell sx={{ ...tableHeaderSx, minWidth: 240 }}>Approval 3</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    Loading administrator material data...
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                visibleRows.map((row, index) => {
                  const approval1Options = getApproverSelectOptions({
                    manualApprovers: approverPools.manualApprovers,
                    selectedApproval1UserId: row.approval1UserId,
                    selectedApproval2UserId: row.approval2UserId,
                    field: "approval1",
                  });
                  const approval2Options = getApproverSelectOptions({
                    manualApprovers: approverPools.manualApprovers,
                    selectedApproval1UserId: row.approval1UserId,
                    selectedApproval2UserId: row.approval2UserId,
                    field: "approval2",
                  });

                  const approval1Option = approval1Options.find(o => o.id === row.approval1UserId) || null;
                  const approval2Option = approval2Options.find(o => o.id === row.approval2UserId) || null;

                  return (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        "& .MuiTableCell-root": {
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          py: 2.15,
                          verticalAlign: "top",
                        },
                        "&:last-child .MuiTableCell-root": {
                          borderBottom: "none",
                        },
                      }}
                    >
                      <TableCell align="center" sx={{ color: "text.secondary", fontWeight: 700 }}>
                        {index + 1}
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontWeight: 700, color: "text.primary" }}>
                          {row.requesterUsername}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.requestNumber ? `Request ${row.requestNumber}` : "Requester material"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Autocomplete
                          size="small"
                          fullWidth
                          options={approval1Options}
                          value={approval1Option}
                          disabled={isApproverDropdownDisabled(row.approval1Status) || savingRows[row.id] === true}
                          onChange={(event, value) => handleApproverChange(row, "approval1UserId", value)}
                          isOptionEqualToValue={(option, value) => option.id === value?.id}
                          getOptionLabel={option => option.label || ""}
                          renderInput={params => (
                            <TextField {...params} placeholder="Pilih Approval 1" />
                          )}
                          renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.id}>
                              <Box>
                                <Typography sx={{ fontWeight: 700 }}>{option.username}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {option.fullname}
                                  {option.userGroupName ? ` - ${option.userGroupName}` : ""}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          sx={autoCompleteSx}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.85 }}>
                          {formatApprovalStatus(row.approval1Status)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Autocomplete
                          size="small"
                          fullWidth
                          options={approval2Options}
                          value={approval2Option}
                          disabled={isApproverDropdownDisabled(row.approval2Status) || savingRows[row.id] === true}
                          onChange={(event, value) => handleApproverChange(row, "approval2UserId", value)}
                          isOptionEqualToValue={(option, value) => option.id === value?.id}
                          getOptionLabel={option => option.label || ""}
                          renderInput={params => (
                            <TextField {...params} placeholder="Pilih Approval 2" />
                          )}
                          renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.id}>
                              <Box>
                                <Typography sx={{ fontWeight: 700 }}>{option.username}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {option.fullname}
                                  {option.userGroupName ? ` - ${option.userGroupName}` : ""}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          sx={autoCompleteSx}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.85 }}>
                          {formatApprovalStatus(row.approval2Status)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={row.approval3UserId || "By system"}
                          size="small"
                          sx={{
                            bgcolor: row.approval3UserId ? "#dcfce7" : "#e8f0ff",
                            color: row.approval3UserId ? "#166534" : "#1d4ed8",
                            fontWeight: 800,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                          {row.approval3UserId
                            ? `Auto assigned by system. ${formatApprovalStatus(row.approval3Status)}`
                            : "Random user group MDM_MATERIAL setelah Approval 1 dan Approval 2 terisi."}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}

              {!loading && visibleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography sx={{ fontWeight: 800, color: "text.primary" }}>
                      No administrator row found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Coba ubah keyword pencarian atau tunggu request material masuk lagi.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

function normalizeAdministratorRows(rows = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(row => ({
    id: row.id || row.request_id || row.request_no || cryptoSafeId(row.created_by),
    requesterUsername: stringOrFallback(row.created_by, row.requester_user_id, "-"),
    requestNumber: stringOrFallback(row.ticket_number, row.request_no, ""),
    approval1UserId: stringOrFallback(row.approval_1_user_id, ""),
    approval1Status: stringOrFallback(row.approval_1_status, "Waiting"),
    approval2UserId: stringOrFallback(row.approval_2_user_id, ""),
    approval2Status: stringOrFallback(row.approval_2_status, "Waiting"),
    approval3UserId: stringOrFallback(row.approval_3_user_id, ""),
    approval3Status: stringOrFallback(row.approval_3_status, "Waiting"),
  }));
}

function buildFallbackRows(options = []) {
  return options
    .filter(option => option.username !== "ADMIN")
    .slice(0, 8)
    .map((option, index) => ({
      id: `fallback-${option.id}-${index}`,
      requesterUsername: option.username,
      requestNumber: "",
      approval1UserId: "",
      approval1Status: "Waiting",
      approval2UserId: "",
      approval2Status: "Waiting",
      approval3UserId: "",
      approval3Status: "Waiting",
    }));
}

function formatApprovalStatus(value) {
  const normalized = String(value || "Waiting").trim();
  return `Status: ${normalized.charAt(0).toUpperCase()}${normalized.slice(1).toLowerCase()}`;
}

function stringOrFallback(...values) {
  const match = values.find(value => value !== undefined && value !== null && value !== "");
  return match === undefined ? "" : String(match);
}

function cryptoSafeId(seed = "") {
  return `row-${String(seed || "material").replace(/\s+/g, "-").toLowerCase()}`;
}
