import { Add, Close } from "@mui/icons-material";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { normalizeApproverOptions } from "src/helper/materialAdministratorAssignment.js";
import {
  buildNewApproverOptions,
  canAddReworkApprover,
  NOTIFY_VIA_APP,
  NOTIFY_VIA_EMAIL,
  resolveNewApproverUserId,
  REWORK_TO_NEW_APPROVER,
  REWORK_TO_REQUESTER,
} from "src/helper/adminApprovalRework.js";
import {
  buildReworkEmailTemplatePath,
  normalizeReworkEmailTemplate,
  REWORK_EMAIL_NOTICE,
  REWORK_EMAIL_TEMPLATE_ERROR_TEXT,
} from "src/helper/reworkEmailThread.js";

const USER_SEARCH_LIMIT = 25;
const USER_SEARCH_DEBOUNCE_MS = 300;

// Async user search against the same paginated /user/ endpoint the material
// administrator chain editor uses, so a rework picks approvers from exactly the
// pool that page assigns them from.
function useUserSearch() {
  const axiosPrivate = useAxiosPrivate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const loadedRef = useRef(false);

  const runSearch = useCallback(
    async term => {
      setLoading(true);
      try {
        const response = await axiosPrivate.get("/user/", {
          params: { page: 1, limit: USER_SEARCH_LIMIT, search: term || undefined },
        });
        loadedRef.current = true;
        setRows(response.data?.data || []);
      } catch (error) {
        console.error("Failed to search rework approvers", error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [axiosPrivate]
  );

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const search = useCallback(
    term => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSearch(term), USER_SEARCH_DEBOUNCE_MS);
    },
    [runSearch]
  );

  // Prime the list on first open so the picker is not empty before typing.
  const ensureLoaded = useCallback(() => {
    if (!loadedRef.current && !loading) {
      runSearch("");
    }
  }, [loading, runSearch]);

  // Only ACTIVE users may sit in a chain; both pools are offered because the
  // API accepts any active mst_user row, not just the manual-approver group.
  const users = useMemo(() => {
    const pools = normalizeApproverOptions(rows);
    return [...pools.manualApprovers, ...pools.mdmApprovers];
  }, [rows]);

  return { users, loading, search, ensureLoaded };
}

// The prefilled rework mail, fetched exactly once per request the first time
// the EMAIL channel is chosen. Once is the whole point: a second fetch would
// overwrite what Master Data has already typed, and toggling between the two
// notify radios to compare them is the normal way to use this field.
//
// `approverUserId` only addresses the greeting to the picked approver by name —
// it is NOT part of the one-shot key. Re-picking the approver after the draft
// exists leaves the draft alone, because by then it is Master Data's text and
// re-fetching would throw the edits away.
function useReworkEmailTemplate({
  active,
  requestKind,
  requestId,
  approverUserId,
  onLoaded,
}) {
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // Keyed by the path, so the one-shot guard survives radio toggling but still
  // re-arms if the field is ever reused for a different request.
  const requestedRef = useRef("");
  const onLoadedRef = useRef(onLoaded);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    const path = buildReworkEmailTemplatePath({ requestKind, requestId });

    if (!active || !path || requestedRef.current === path) {
      return undefined;
    }

    requestedRef.current = path;
    let alive = true;
    setLoading(true);
    setFailed(false);

    axiosPrivate
      // Blank id => omitted, and the endpoint answers with the generic greeting.
      .get(path, { params: { approverUserId: approverUserId || undefined } })
      .then(response => {
        if (alive) {
          onLoadedRef.current?.(normalizeReworkEmailTemplate(response));
        }
      })
      .catch(error => {
        // The draft is a convenience, not a gate: Master Data can still write
        // the mail by hand, so a failure only swaps the spinner for a hint.
        console.error("Failed to load rework email template", error);
        if (alive) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [active, axiosPrivate, requestKind, requestId, approverUserId]);

  return { loading, failed };
}

// One destination row: the requester, a real approval step, or the approver the
// user added. Only the added row can be taken back off the list.
function DestinationSlotRow({ slot, selected, disabled, onSelect, onClear }) {
  const isNewApprover = slot.kind === "NEW_APPROVER";

  const row = (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minHeight: 36 }}>
      <Radio
        value={slot.value}
        size="small"
        disabled={disabled || !slot.selectable}
        inputProps={{ "aria-label": slot.label }}
        sx={{ py: 0.25 }}
      />
      <Typography
        variant="body2"
        onClick={() => {
          if (!disabled && slot.selectable) {
            onSelect?.(slot.value);
          }
        }}
        sx={{
          flex: 1,
          fontWeight: selected ? 700 : 500,
          color: slot.selectable ? "text.primary" : "text.disabled",
          cursor: !disabled && slot.selectable ? "pointer" : "default",
        }}
      >
        {slot.label}
      </Typography>
      {isNewApprover && (
        <Tooltip title="Hapus approver">
          <span>
            <IconButton
              size="small"
              aria-label="clear new approver"
              onClick={onClear}
              disabled={disabled}
            >
              <Close fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Stack>
  );

  if (!slot.selectable && slot.disabledReason) {
    return (
      <Tooltip title={slot.disabledReason} placement="right">
        <span>{row}</span>
      </Tooltip>
    );
  }

  return row;
}

// The add affordance for a request with no manual chain: a button until it is
// pressed, then the inline user picker, then nothing — because picking a user
// turns it into a real destination row.
function AddApproverControl({ disabled, options, loading, onPick, onSearch, onOpenPicker }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!pickerOpen) {
    return (
      <Box sx={{ pl: 4, py: 0.5 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Add />}
          disabled={disabled}
          onClick={() => {
            setPickerOpen(true);
            onOpenPicker();
          }}
          sx={{ textTransform: "none" }}
        >
          Tambah Approver
        </Button>
      </Box>
    );
  }

  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ pl: 4, minHeight: 36 }}>
      <Autocomplete
        size="small"
        fullWidth
        openOnFocus
        options={options}
        loading={loading}
        disabled={disabled}
        filterOptions={x => x}
        getOptionLabel={option => option.label || ""}
        isOptionEqualToValue={(option, candidate) => option.id === candidate?.id}
        noOptionsText={loading ? "Searching…" : "No users found"}
        onChange={(event, option) => {
          setPickerOpen(false);
          onPick(option || null);
        }}
        onInputChange={(event, input, reason) => {
          if (reason === "input") {
            onSearch(input);
          }
        }}
        onOpen={onOpenPicker}
        renderInput={params => (
          <TextField
            {...params}
            autoFocus
            placeholder="Cari nama atau email approver…"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <Tooltip title="Batal pilih user">
        <span>
          <IconButton
            size="small"
            aria-label="cancel approver picker"
            onClick={() => setPickerOpen(false)}
            disabled={disabled}
          >
            <Close fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

/**
 * Rework destination picker: the requester, then one row per REAL approval step
 * of this request — no placeholder rows. A request with no manual chain gets an
 * "Tambah Approver" button instead, which turns into a normal destination row
 * once a user is picked. Rows are built by buildReworkDestinationSlots; this
 * component only renders them, owns the user-search state behind the add
 * button, and surfaces the notify channel once the added row is the selected
 * destination.
 *
 * Choosing "Via email" on that row also opens the mail itself: the subject and
 * body are prefilled from the request — greeted to the picked approver by name —
 * and stay fully editable, because the mail Master Data sends is the one the
 * approver reads. Both live in the parent's state so edits survive a trip
 * through the other radio.
 */
export default function ReworkDestinationField({
  slots = [],
  value,
  onChange,
  onNewApproverChange,
  newApprover = null,
  notifyVia = NOTIFY_VIA_APP,
  onNotifyViaChange,
  excludeIdentifiers = [],
  disabled = false,
  errorText = "",
  helperText = "",
  requestKind,
  requestId,
  emailSubject = "",
  emailBody = "",
  onEmailSubjectChange,
  onEmailBodyChange,
  onEmailTemplateLoaded,
  emailErrors = {},
}) {
  const { users, loading, search, ensureLoaded } = useUserSearch();
  const emailChannelActive =
    value === REWORK_TO_NEW_APPROVER && notifyVia === NOTIFY_VIA_EMAIL;
  const { loading: templateLoading, failed: templateFailed } = useReworkEmailTemplate({
    active: emailChannelActive,
    requestKind,
    requestId,
    // The email radios only exist under the picked-approver row, so by the time
    // this fetch can fire there is always a user id to name in the greeting.
    approverUserId: resolveNewApproverUserId(newApprover),
    onLoaded: onEmailTemplateLoaded,
  });
  const options = useMemo(
    () => buildNewApproverOptions({ users, excludeIdentifiers }),
    [users, excludeIdentifiers]
  );
  // True only while the requester row is the whole list, so rendering the
  // control after the rows still puts it directly under "Requestor".
  const showAddApprover = canAddReworkApprover(slots);

  const handlePick = option => {
    onNewApproverChange?.(option);
    // The row only exists because the user asked for it — select it right away
    // so the notify choice that belongs to it becomes visible.
    onChange?.(option ? REWORK_TO_NEW_APPROVER : REWORK_TO_REQUESTER);
  };

  const handleClear = () => {
    onNewApproverChange?.(null);
    onChange?.(REWORK_TO_REQUESTER);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl component="fieldset" fullWidth error={Boolean(errorText)}>
        <FormLabel component="legend" sx={{ fontSize: 12, fontWeight: 700 }}>
          Rework To
        </FormLabel>
        <RadioGroup
          name="rework-destination"
          value={value ?? REWORK_TO_REQUESTER}
          onChange={event => onChange?.(event.target.value)}
        >
          {slots.map(slot => (
            <DestinationSlotRow
              key={slot.key}
              slot={slot}
              selected={slot.value === value}
              disabled={disabled}
              onSelect={onChange}
              onClear={handleClear}
            />
          ))}
        </RadioGroup>
        {/* Outside the RadioGroup on purpose: it is an action, not a choice. */}
        {showAddApprover && (
          <AddApproverControl
            disabled={disabled}
            options={options}
            loading={loading}
            onPick={handlePick}
            onSearch={search}
            onOpenPicker={ensureLoaded}
          />
        )}
        <FormHelperText>{errorText || helperText}</FormHelperText>
      </FormControl>

      {/* fullWidth so the draft fields below the radios span the dialog. */}
      {value === REWORK_TO_NEW_APPROVER && (
        <FormControl component="fieldset" fullWidth sx={{ mt: 1 }} disabled={disabled}>
          <FormLabel component="legend" sx={{ fontSize: 12, fontWeight: 700 }}>
            Notifikasi
          </FormLabel>
          <RadioGroup
            name="rework-notify-via"
            value={notifyVia}
            onChange={event => onNotifyViaChange?.(event.target.value)}
          >
            <FormControlLabel
              value={NOTIFY_VIA_APP}
              control={<Radio size="small" />}
              label={<Typography variant="body2">Via aplikasi (default)</Typography>}
            />
            <FormControlLabel
              value={NOTIFY_VIA_EMAIL}
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2">Via email</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {REWORK_EMAIL_NOTICE}
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>

          {emailChannelActive &&
            (templateLoading ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, py: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Menyiapkan template email…
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {templateFailed && (
                  <Typography variant="caption" color="warning.main">
                    {REWORK_EMAIL_TEMPLATE_ERROR_TEXT}
                  </Typography>
                )}
                <TextField
                  size="small"
                  fullWidth
                  label="Subject"
                  value={emailSubject}
                  disabled={disabled}
                  error={Boolean(emailErrors.subject)}
                  helperText={emailErrors.subject || ""}
                  onChange={event => onEmailSubjectChange?.(event.target.value)}
                />
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  rows={10}
                  label="Isi Email"
                  value={emailBody}
                  disabled={disabled}
                  error={Boolean(emailErrors.body)}
                  helperText={emailErrors.body || ""}
                  onChange={event => onEmailBodyChange?.(event.target.value)}
                />
              </Stack>
            ))}
        </FormControl>
      )}
    </Box>
  );
}
