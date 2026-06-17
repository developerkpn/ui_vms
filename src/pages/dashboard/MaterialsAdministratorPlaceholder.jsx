import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Popper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import PageHeader from "src/components/common/PageHeader";
import PageTablePaper, { PAGE_TABLE_HEADER_SX } from "src/components/common/PageTablePaper";
import PageSearchField from "src/components/common/PageSearchField";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { useSnackBar } from "src/provider/SnackbarProvider";
import {
  buildAssignmentSuccessMessage,
  buildSaveChainPayload,
  getApproverSelectOptions,
  MASTER_DATA_HINT,
  MASTER_DATA_LABEL,
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
  const value = options.find(option => option.id === valueId || option.value === valueId) || null;
  return (
    <Autocomplete
      size="small"
      fullWidth
      options={options}
      value={value}
      disabled={saving}
      loading={loading}
      onChange={(event, selected) => onChange(selected)}
      onInputChange={(event, input, reason) => {
        if (reason === "input") onInputChange(input);
      }}
      onOpen={onOpen}
      isOptionEqualToValue={(option, candidate) => option.id === candidate?.id || option.value === candidate?.value}
      getOptionLabel={option => option.label || ""}
      filterOptions={x => x}
      noOptionsText={loading ? "Searching…" : "No approvers found"}
      PopperComponent={ApproverPopper}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <Box
            component="li"
            key={key ?? option.id ?? option.value}
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

// Compact, read-only summary of a requester's approver chain shown in the table.
function ChainSummary({ row }) {
  const manual = row.manualApprovers || [];
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
      {manual.length === 0 ? (
        <Chip label="No manual approvers" size="small" variant="outlined" color="warning" />
      ) : (
        manual.map((step, index) => (
          <Chip
            key={`${row.id}-step-${index}`}
            label={`${index + 1}. ${step.approverName || step.approverUsername || step.approverUserId}`}
            size="small"
          />
        ))
      )}
      <Chip
        icon={<LockIcon sx={{ fontSize: 14 }} />}
        label={MASTER_DATA_LABEL}
        size="small"
        variant="outlined"
        color="default"
      />
    </Stack>
  );
}

// Dialog editor for a VARIABLE-LENGTH ordered manual approver chain.
// Manual slots are editable rows (add / remove, min 1); the Master Data stage
// is a pinned, read-only final row.
function ChainEditorDialog({
  open,
  row,
  approverPools,
  approverLoading,
  saving,
  onApproverInput,
  onApproverOpen,
  onClose,
  onSave,
}) {
  // Draft is an ordered list of selection slots: { approverUserId, label, username }.
  const [draft, setDraft] = useState([]);
  // Only the slot the user is actively searching should show the loading spinner —
  // the others are independent and unrelated to this search.
  const [searchingIndex, setSearchingIndex] = useState(null);

  useEffect(() => {
    if (!open || !row) return;
    const initial = (row.manualApprovers || []).map(step => ({
      approverUserId: step.approverUserId || "",
      label: step.approverName || step.approverUsername || step.approverUserId || "",
      username: step.approverUsername || "",
    }));
    setDraft(initial.length > 0 ? initial : [{ approverUserId: "", label: "", username: "" }]);
  }, [open, row]);

  const selectedIds = useMemo(
    () => draft.map(slot => slot.approverUserId).filter(Boolean),
    [draft]
  );

  // Options for slot `index`, excluding everyone already chosen elsewhere in the
  // chain, the requester, admins and MDM users. Keeps the slot's own current
  // selection visible even if it isn't in the latest search batch.
  const optionsForSlot = (slot, index) => {
    const options = getApproverSelectOptions({
      manualApprovers: approverPools.manualApprovers,
      requesterUserId: row?.requesterUserId,
      requesterUsername: row?.requesterUsername,
      selectedApproverIds: selectedIds,
      currentSlotUserId: slot.approverUserId,
    });
    if (slot.approverUserId && !options.some(option => option.id === slot.approverUserId || option.value === slot.approverUserId)) {
      return [
        {
          id: slot.approverUserId,
          value: slot.approverUserId,
          label: slot.label || slot.approverUserId,
          username: slot.username || "",
          email: "",
        },
        ...options,
      ];
    }
    return options;
  };

  const handleSlotChange = (index, option) => {
    setDraft(previous =>
      previous.map((slot, slotIndex) =>
        slotIndex === index
          ? {
              // option.id is the user_id (uuid); option.value is the username.
              // The chain must store the uuid so it joins mst_user and the
              // snapshotted approval steps match the approver at approve time.
              approverUserId: option?.id || option?.value || "",
              label: option?.label || "",
              username: option?.username || "",
            }
          : slot
      )
    );
  };

  const handleAddSlot = () => {
    setDraft(previous => [...previous, { approverUserId: "", label: "", username: "" }]);
  };

  const handleRemoveSlot = index => {
    setDraft(previous => previous.filter((_, slotIndex) => slotIndex !== index));
  };

  const filledCount = selectedIds.length;
  const canSave = filledCount >= 1 && !saving;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Edit approver chain
        {row && (
          <Typography variant="body2" color="text.secondary">
            {row.requesterFullname || row.requesterUsername}
            {row.requesterUsername ? ` · ${row.requesterUsername}` : ""}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {draft.map((slot, index) => (
            <Stack key={index} direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ minWidth: 78, fontWeight: 600 }}>
                {`Approval ${index + 1}`}
              </Typography>
              <Box sx={{ flex: 1 }}>
                <ApproverPicker
                  options={optionsForSlot(slot, index)}
                  valueId={slot.approverUserId}
                  placeholder={`Pilih Approval ${index + 1}`}
                  saving={saving}
                  loading={approverLoading && searchingIndex === index}
                  onChange={option => handleSlotChange(index, option)}
                  onInputChange={value => {
                    setSearchingIndex(index);
                    onApproverInput(value);
                  }}
                  onOpen={() => {
                    setSearchingIndex(index);
                    onApproverOpen();
                  }}
                />
              </Box>
              <Tooltip title={draft.length <= 1 ? "At least one manual approver is required" : "Remove"}>
                <span>
                  <IconButton
                    aria-label="remove approver"
                    size="small"
                    color="error"
                    disabled={draft.length <= 1 || saving}
                    onClick={() => handleRemoveSlot(index)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          ))}

          <Box>
            <Button
              startIcon={<AddCircleOutlineIcon />}
              size="small"
              onClick={handleAddSlot}
              disabled={saving}
            >
              Add approver
            </Button>
          </Box>

          <Divider />

          {/* Pinned, read-only final stage. */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.85 }}>
            <Typography variant="body2" sx={{ minWidth: 78, fontWeight: 600 }}>
              Final
            </Typography>
            <Chip icon={<LockIcon sx={{ fontSize: 16 }} />} label={MASTER_DATA_HINT} variant="outlined" />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={() => onSave(draft)}
          variant="contained"
          disabled={!canSave}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Save chain
        </Button>
      </DialogActions>
    </Dialog>
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

  // Chain editor dialog.
  const [editorRowId, setEditorRowId] = useState(null);

  // Approver pickers — async search against the paginated /user/ endpoint.
  const [approverResults, setApproverResults] = useState([]);
  const [approverLoading, setApproverLoading] = useState(false);
  const approverDebounce = useRef(null);

  const approverPools = useMemo(() => normalizeApproverOptions(approverResults), [approverResults]);
  const isSaving = useMemo(() => Object.values(savingRows).some(Boolean), [savingRows]);
  const editorRow = useMemo(() => rows.find(item => item.id === editorRowId) || null, [rows, editorRowId]);
  const editorSaving = editorRowId != null && savingRows[editorRowId] === true;

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

  const handleApproverOpen = useCallback(() => {
    if (approverResults.length === 0) runApproverSearch("");
  }, [approverResults.length, runApproverSearch]);

  // Persist the edited chain: PUT { manualApprovers: [userId, ...] } (ordered).
  const handleSaveChain = async draft => {
    const row = editorRow;
    if (!row) return;
    const payload = buildSaveChainPayload(draft);
    if (payload.manualApprovers.length === 0) {
      openSnackbar("error", "Tambahkan minimal satu approver.");
      return;
    }

    // Optimistic update from the draft slots.
    const optimisticSteps = draft
      .filter(slot => slot.approverUserId)
      .map((slot, index) => ({
        level: index + 1,
        approverUserId: slot.approverUserId,
        approverName: slot.label || "",
        approverUsername: slot.username || "",
        approverEmail: "",
      }));
    const optimisticRow = { ...row, manualApprovers: optimisticSteps };
    setRows(previous => previous.map(item => (item.id === row.id ? optimisticRow : item)));
    setSavingRows(previous => ({ ...previous, [row.id]: true }));

    try {
      const response = await axiosPrivate.put(
        `/material/requests/single/approver-masters/${row.requesterUserId}`,
        payload
      );
      const nextRow = mergeAdministratorMasterRow(optimisticRow, response.data?.data || response.data);
      setRows(previous => previous.map(item => (item.id === row.id ? nextRow : item)));
      openSnackbar("success", buildAssignmentSuccessMessage());
      setEditorRowId(null);
    } catch (error) {
      setRows(previous => previous.map(item => (item.id === row.id ? row : item)));
      openSnackbar("error", error.response?.data?.message || "Gagal menyimpan approver chain.");
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
              <TableCell sx={PAGE_TABLE_HEADER_SX}>Approver chain</TableCell>
              <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, width: 96 }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6, borderBottom: 0 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  No requesters found.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((row, index) => (
                <TableRow key={row.id} hover>
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
                    <ChainSummary row={row} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit approver chain">
                      <span>
                        <IconButton
                          aria-label="edit approver chain"
                          onClick={() => setEditorRowId(row.id)}
                          disabled={savingRows[row.id] === true}
                        >
                          {savingRows[row.id] === true ? (
                            <CircularProgress size={20} />
                          ) : (
                            <EditIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
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

      <ChainEditorDialog
        open={editorRow != null}
        row={editorRow}
        approverPools={approverPools}
        approverLoading={approverLoading}
        saving={editorSaving}
        onApproverInput={handleApproverInput}
        onApproverOpen={handleApproverOpen}
        onClose={() => setEditorRowId(null)}
        onSave={handleSaveChain}
      />
    </Box>
  );
}
