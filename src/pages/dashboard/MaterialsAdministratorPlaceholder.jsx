import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  LinearProgress,
  Popper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PageHeader from "src/components/common/PageHeader";
import PageTablePaper, { PAGE_TABLE_HEADER_SX } from "src/components/common/PageTablePaper";
import PageSearchField from "src/components/common/PageSearchField";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { useSnackBar } from "src/provider/SnackbarProvider";
import {
  buildAssignApproverPayload,
  buildAssignmentSuccessMessage,
  getApproverSelectOptions,
  mergeAdministratorMasterRow,
  normalizeAdministratorMasterRows,
  normalizeApproverOptions,
} from "src/helper/materialAdministratorAssignment.js";

const DEFAULT_ROWS_PER_PAGE = 10;
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const APPROVER_SEARCH_LIMIT = 25;
const SEARCH_DEBOUNCE_MS = 350;

// The picker lives in a narrow table column, so let the dropdown grow wider
// than the input — otherwise the name / username / email get clipped.
function ApproverPopper(props) {
  return (
    <Popper
      {...props}
      style={{ ...props.style, width: "fit-content", minWidth: 300, maxWidth: 460 }}
      placement="bottom-start"
    />
  );
}

// Approver picker: async-searches the (paginated) /user/ endpoint and shows
// full name + "username · email" per option without bloating the row height.
function ApproverPicker({ options, valueId, placeholder, saving, loading, onChange, onInputChange, onOpen }) {
  const value = options.find(option => option.id === valueId) || null;
  return (
    <Autocomplete
      size="small"
      options={options}
      value={value}
      disabled={saving}
      loading={loading}
      onChange={(event, selected) => onChange(selected)}
      onInputChange={(event, input, reason) => {
        if (reason === "input") onInputChange(input);
      }}
      onOpen={onOpen}
      isOptionEqualToValue={(option, candidate) => option.id === candidate?.id}
      getOptionLabel={option => option.label || ""}
      filterOptions={x => x}
      noOptionsText={loading ? "Searching…" : "No approvers found"}
      PopperComponent={ApproverPopper}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <Box
            component="li"
            key={key ?? option.id}
            {...rest}
            sx={{
              display: "flex !important",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 0.75,
              py: 1,
            }}
          >
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.2, width: "100%" }}>
              {option.label}
            </Typography>
            {option.username && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ lineHeight: 1.2, width: "100%" }}
              >
                {option.username}
              </Typography>
            )}
          </Box>
        );
      }}
      renderInput={params => (
        <TextField
          {...params}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {saving || loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export default function MaterialsAdministratorPlaceholder() {
  const axiosPrivate = useAxiosPrivate();
  const { openSnackbar } = useSnackBar();

  // Table — server-driven search + pagination.
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // 0-based (TablePagination)
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // debounced
  const [loading, setLoading] = useState(false);
  const [savingRows, setSavingRows] = useState({});

  // Approver pickers — async search against the paginated /user/ endpoint.
  const [approverResults, setApproverResults] = useState([]);
  const [approverLoading, setApproverLoading] = useState(false);
  const approverDebounce = useRef(null);

  const approverPools = useMemo(() => normalizeApproverOptions(approverResults), [approverResults]);
  const isSaving = useMemo(() => Object.values(savingRows).some(Boolean), [savingRows]);

  // Debounce the search box -> searchQuery, resetting to the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch the table page whenever search / page / size changes.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const response = await axiosPrivate.get("/material/requests/single/approver-masters", {
          params: { page: page + 1, limit: rowsPerPage, search: searchQuery || undefined },
        });
        if (!active) return;
        const payload = response.data || {};
        setRows(normalizeAdministratorMasterRows(payload.data));
        setTotal(Number(payload.count ?? (payload.data?.length || 0)));
      } catch (error) {
        if (!active) return;
        console.error("Failed to load approver masters", error);
        setRows([]);
        setTotal(0);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [axiosPrivate, page, rowsPerPage, searchQuery]);

  const runApproverSearch = useCallback(
    async term => {
      setApproverLoading(true);
      try {
        const response = await axiosPrivate.get("/user/", {
          params: { page: 1, limit: APPROVER_SEARCH_LIMIT, search: term || undefined },
        });
        setApproverResults(response.data?.data || []);
      } catch (error) {
        console.error("Failed to search approvers", error);
        setApproverResults([]);
      } finally {
        setApproverLoading(false);
      }
    },
    [axiosPrivate]
  );

  // Prime the picker with an initial batch so it isn't empty before typing.
  useEffect(() => {
    runApproverSearch("");
  }, [runApproverSearch]);

  const handleApproverInput = useCallback(
    value => {
      clearTimeout(approverDebounce.current);
      approverDebounce.current = setTimeout(() => runApproverSearch(value), 300);
    },
    [runApproverSearch]
  );

  const buildFieldOptions = (row, field) => {
    const options = getApproverSelectOptions({
      manualApprovers: approverPools.manualApprovers,
      requesterUserId: row.requesterUserId,
      requesterUsername: row.requesterUsername,
      selectedApproval1UserId: row.approval1UserId,
      selectedApproval2UserId: row.approval2UserId,
      field,
    });
    const selectedId = field === "approval1" ? row.approval1UserId : row.approval2UserId;
    const selectedName = field === "approval1" ? row.approval1UserName : row.approval2UserName;
    // Keep the currently-saved approver selectable/visible even if it isn't in
    // the latest search results (so the field shows its label).
    if (selectedId && !options.some(option => option.id === selectedId)) {
      return [
        { id: selectedId, value: selectedId, label: selectedName || selectedId, username: "", email: "" },
        ...options,
      ];
    }
    return options;
  };

  const handleApproverChange = async (row, field, option) => {
    const nextValue = option?.id || "";
    const payload = buildAssignApproverPayload({ previousRow: row, nextField: field, nextValue });
    if (Object.keys(payload).length === 0) return;

    const nameField = field === "approval1UserId" ? "approval1UserName" : "approval2UserName";
    const optimisticRow = { ...row, [field]: nextValue, [nameField]: option?.label || "" };
    setRows(previous => previous.map(item => (item.id === row.id ? optimisticRow : item)));
    setSavingRows(previous => ({ ...previous, [row.id]: true }));

    try {
      const response = await axiosPrivate.patch(
        `/material/requests/single/approver-masters/${row.requesterUserId}`,
        payload
      );
      const nextRow = mergeAdministratorMasterRow(optimisticRow, response.data?.data);
      setRows(previous => previous.map(item => (item.id === row.id ? nextRow : item)));
      openSnackbar("success", buildAssignmentSuccessMessage());
    } catch (error) {
      setRows(previous => previous.map(item => (item.id === row.id ? row : item)));
      openSnackbar("error", error.response?.data?.message || "Gagal menyimpan approver.");
    } finally {
      setSavingRows(previous => ({ ...previous, [row.id]: false }));
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: { xs: 2, md: 3 } }}>
      <PageHeader title="Material Administrator" subtitle="Assign approvers for material requests" />
      <Box>
        <PageSearchField
          placeholder="Search by name, username, or email…"
          value={searchInput}
          onChange={event => setSearchInput(event.target.value)}
        />
      </Box>
      <Box sx={{ height: 3 }}>{(loading || isSaving) && <LinearProgress />}</Box>
      <PageTablePaper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={PAGE_TABLE_HEADER_SX}>No</TableCell>
              <TableCell sx={PAGE_TABLE_HEADER_SX}>Requester</TableCell>
              <TableCell sx={PAGE_TABLE_HEADER_SX}>Approval 1</TableCell>
              <TableCell sx={PAGE_TABLE_HEADER_SX}>Approval 2</TableCell>
              <TableCell sx={PAGE_TABLE_HEADER_SX}>Approval 3</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6, borderBottom: 0 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  No requesters found.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>
                      {row.requesterFullname || row.requesterUsername}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.requesterUsername}
                      {row.requesterEmail ? ` · ${row.requesterEmail}` : ""}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <ApproverPicker
                      options={buildFieldOptions(row, "approval1")}
                      valueId={row.approval1UserId}
                      placeholder="Pilih Approval 1"
                      saving={savingRows[row.id] === true}
                      loading={approverLoading}
                      onChange={value => handleApproverChange(row, "approval1UserId", value)}
                      onInputChange={handleApproverInput}
                      onOpen={() => {
                        if (approverResults.length === 0) runApproverSearch("");
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <ApproverPicker
                      options={buildFieldOptions(row, "approval2")}
                      valueId={row.approval2UserId}
                      placeholder="Pilih Approval 2"
                      saving={savingRows[row.id] === true}
                      loading={approverLoading}
                      onChange={value => handleApproverChange(row, "approval2UserId", value)}
                      onInputChange={handleApproverInput}
                      onOpen={() => {
                        if (approverResults.length === 0) runApproverSearch("");
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {row.approval3UserName ? (
                      <Chip label={row.approval3UserName} size="small" color="default" />
                    ) : (
                      <Chip label="By system" size="small" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(event, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={event => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        />
      </PageTablePaper>
    </Box>
  );
}
