import { Add, Close, Download, MoreHoriz } from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableSortLabel,
  Pagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApprovalDetail } from "src/helper/adminApprovalDetail.js";
import { resolveRequestCommentKind } from "src/helper/requestComments.js";
import { buildEmailReplyCaption } from "src/helper/reworkEmailThread.js";
import { getSapStatusChip, getStagedMaterialCode, isSapError, pickSapFields } from "src/helper/sapStatus.js";
import {
  computeAssignedToDisplay,
  computeAssignmentCaption,
  computeMassAssignedToDisplay,
  computeMassAssignmentCaption,
  formatDateTime,
  formatOptionalDateTime,
  normalizeApprovalStatusForFilter,
  normalizeApprovalSteps,
} from "src/helper/adminApprovalView.js";
import {
  buildPlantOptions,
  buildPlantLabelMap,
  buildStorageOptionsForPlant,
} from "src/helper/materialChangeExtendRequest.js";
import MassReworkForm from "src/components/request-material/MassReworkForm";
import SingleMaterialForm from "src/components/request-material/SingleMaterialForm";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import PageHeader from "src/components/common/PageHeader";
import PageTablePaper, { PAGE_TABLE_HEADER_SX } from "src/components/common/PageTablePaper";
import PageSearchField from "src/components/common/PageSearchField";
import PageTabs from "src/components/common/PageTabs";
import TableLoadingRows, { TableEmptyRow } from "src/components/common/TableLoadingRows";
import SectionLoadingSkeleton from "src/components/common/SectionLoadingSkeleton";
import ApprovalStatusCard from "src/components/common/ApprovalStatusCard";
import RequestCommentsDialog from "src/components/common/RequestCommentsDialog";

// Stable reference: SingleMaterialForm's load-existing-request effect depends
// on prefetchedGroups, so a fresh [] literal on every render (the component's
// own default parameter) would refire it in an infinite loop.
const EMPTY_MATERIAL_GROUPS = [];

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

// Spells out which step a still-open request is sitting on — waiting on a named
// approver, or waiting for Master Data to grab it — so it can be read off the
// Status column instead of inferred from "Assigned To" at the far right.
function AssignmentCaption({ status, caption }) {
  return (
    <Tooltip title={caption.text} arrow placement="top">
      <Stack spacing={0.5} alignItems="flex-start" sx={{ maxWidth: 220 }}>
        <StatusPill status={status} />
        <Typography
          variant="caption"
          sx={{
            color: caption.kind === "UNASSIGNED" ? "#f59e0b" : "text.secondary",
            fontWeight: 600,
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
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

// Once a request is approved and pushed, the SAP staging status is the
// meaningful one to show; otherwise fall back to the approval status.
function SapAwareStatusContent({ row }) {
  const sapChip = getSapStatusChip(row?.sapPushStatus);
  if (!sapChip) {
    // Gated on the raw status, not the effective label: a rewound request's
    // pill on this page deliberately stays "Submit" (it is not the
    // requester's to act on), but the label would read "Rework" — so the gate
    // reads the raw status directly rather than the label that now diverges
    // from it.
    if (row?.assignmentCaption && normalizeApprovalStatusForFilter(row?.status) === "Submit") {
      return <AssignmentCaption status={row.status} caption={row.assignmentCaption} />;
    }
    return <StatusPill status={row?.status} />;
  }

  const chip = (
    <Chip
      label={sapChip.label}
      size="small"
      sx={{ fontWeight: 700, bgcolor: sapChip.bgcolor, color: sapChip.color }}
    />
  );

  if (isSapError(row?.sapPushStatus) && row?.sapErrorMsg) {
    // Surface the SAP write-back message (ERRORMSG_POST) inline, with the full
    // text on hover in case it is truncated.
    return (
      <Tooltip title={row.sapErrorMsg} arrow placement="top">
        <Stack spacing={0.5} alignItems="flex-start" sx={{ maxWidth: 220 }}>
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
function SapAwareStatus({ row }) {
  const replyCaption = buildEmailReplyCaption(row?.emailReplyCount);
  const statusContent = <SapAwareStatusContent row={row} />;

  if (replyCaption === "") {
    return statusContent;
  }

  return (
    <Stack spacing={0.5} alignItems="flex-start" sx={{ maxWidth: 220 }}>
      {statusContent}
      <Typography variant="caption" sx={EMAIL_REPLY_CAPTION_SX}>
        {replyCaption}
      </Typography>
    </Stack>
  );
}

function TicketTypePill({ value }) {
  return <Chip label={value} variant="outlined" size="small" />;
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

function DetailInfoRow({ label, value }) {
  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Typography
        variant="body2"
        sx={{ width: 180, flexShrink: 0, fontWeight: 700, color: "text.secondary" }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "pre-wrap" }}>
        {value || "-"}
      </Typography>
    </Stack>
  );
}

// Read-only detail modal opened from the ticket-number link: shows what was
// requested (basic info, specification, long text, attachments) without any
// edit/delete/approval actions.
// Single requests reuse the actual request form (SingleMaterialForm) in
// mode="view" so the modal looks exactly like the form the requester filled
// out, just with every input disabled and no Save action. Mass requests don't
// have an equivalent single-page form (MassMaterialForm is an Excel-style
// grid with no load-existing-data path), so they keep an items table.
function RequestDetailDialog({ open, request, onClose, massItems, massItemsLoading }) {
  const detail = useMemo(() => buildApprovalDetail(request || {}), [request]);
  const isMass = request?.mode === "mass";

  if (!isMass) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: { xs: 1, sm: 2 } }}>
          <SingleMaterialForm
            mode="view"
            requestId={request?.id}
            ticketNumber={request?.ticketNumber}
            prefetchedGroups={EMPTY_MATERIAL_GROUPS}
            onBack={onClose}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
            Request Detail
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#455a64", lineHeight: 1.1 }}>
            {detail.ticketNumber}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
            <TicketTypePill value={detail.ticketType} />
            <StatusPill status={detail.status} />
          </Stack>
        </Box>

        <IconButton onClick={onClose} aria-label="Close request detail dialog">
          <Close />
        </IconButton>
      </Box>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack spacing={2}>
          <DetailInfoRow label="Mass Request Reason" value={request?.massRequestReason} />
          <DetailInfoRow label="Created by" value={detail.createdBy} />
          <DetailInfoRow label="Created at" value={detail.createdAt} />

          <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1 }}>
            Items
          </Typography>
          <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>No</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Ticket</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Material Code</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Material Description</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>UoM</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Plant</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Sloc</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>PO Text</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {massItemsLoading && <TableLoadingRows columns={9} />}
                {!massItemsLoading && (massItems || []).map((item, index) => (
                  <TableRow key={item.id ?? index}>
                    <TableCell>{item.item_no ?? index + 1}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{item.request_no || "-"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                      {getStagedMaterialCode(item) || "-"}
                    </TableCell>
                    <TableCell>{item.material_description || "-"}</TableCell>
                    <TableCell>{item.uom || item.base_uom || "-"}</TableCell>
                    <TableCell>{item.plant_code || "-"}</TableCell>
                    <TableCell>{item.sloc_code || "-"}</TableCell>
                    <TableCell>{item.po_text || "-"}</TableCell>
                    <TableCell>
                      {/* Once the item has been pushed, its SAP staging status
                          is the meaningful one — same chips the single request
                          list shows. */}
                      <SapAwareStatus
                        row={{ status: item.status || "-", ...pickSapFields(item) }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!massItemsLoading && (massItems || []).length === 0 && (
                  <TableEmptyRow columns={9} title="No items found" />
                )}
              </TableBody>
            </Table>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function ChangeExtendReworkForm({
  row,
  locations = [],
  // True while the page is still fetching the initial-screen locations that
  // fill the Plant / Storage Location dropdowns.
  locationsLoading = false,
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

  const [uomOptions, setUomOptions] = useState([]);
  // Starts true: the fetch is kicked off on the very first render, so the field
  // is never briefly "loaded with nothing in it".
  const [uomLoading, setUomLoading] = useState(true);
  const axiosPrivate = useAxiosPrivate();

  useEffect(() => {
    let active = true;
    axiosPrivate.get("/material/uom").then(res => {
      if (active && res.data?.success) {
        setUomOptions(res.data.data || []);
      }
    }).catch(() => {}).finally(() => {
      if (active) {
        setUomLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setDraft({
      materialName: row?.materialDescription || "",
      baseUom: row?.baseUom || row?.uom || "",
      plantCode: row?.plantCode || "",
      storageLocation: row?.slocCode || "",
    });
  }, [row]);

  const plantOptions = useMemo(() => buildPlantOptions(locations), [locations]);
  const plantLabelMap = useMemo(() => buildPlantLabelMap(locations), [locations]);
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

  const selectedUomOption = uomOptions.find(
    opt => opt.uom_code === draft.baseUom
  ) || null;

  // Each branch is only editable once its own dropdown source has landed: an
  // Extend revise is Plant + Storage (locations), a Change revise is Material
  // Name + Base UoM (uom list). Rendering the controls early would show the
  // approver empty dropdowns and a blank UoM that fills itself in.
  const optionsLoading = isExtend ? locationsLoading : uomLoading;

  return (
    <Stack spacing={2}>
      {optionsLoading ? (
        <SectionLoadingSkeleton lines={2} height={44} spacing={2} />
      ) : isExtend ? (
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
                {plantLabelMap.get(option) || option}
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
              setDraft(current => ({
                ...current,
                materialName: event.target.value.toUpperCase(),
              }))
            }
          />
          <Autocomplete
            fullWidth
            size="small"
            options={uomOptions}
            value={selectedUomOption}
            onChange={(_, val) =>
              setDraft(current => ({ ...current, baseUom: val?.uom_code || "" }))
            }
            noOptionsText="No UoM found"
            isOptionEqualToValue={(opt, val) => opt?.uom_code === val?.uom_code}
            getOptionLabel={opt => opt?.uom_code ? `${opt.uom_code} - ${opt.description}` : ""}
            renderInput={params => <TextField {...params} label="Base UoM" />}
          />
        </>
      )}
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={submit} disabled={submitting || optionsLoading}>
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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [actionDialogMode, setActionDialogMode] = useState(null);
  // Kept out of actionDialogMode: the comments thread is its own dialog reading
  // its own endpoint, not a third mode of the approval/rework one.
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [scopedReworkSubmitting, setScopedReworkSubmitting] = useState(false);
  const [reviseChangeExtendOpen, setReviseChangeExtendOpen] = useState(false);
  const [initialLocations, setInitialLocations] = useState([]);
  const [initialLocationsLoading, setInitialLocationsLoading] = useState(false);
  const [reviseMassOpen, setReviseMassOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailMassItems, setDetailMassItems] = useState([]);
  const [detailMassItemsLoading, setDetailMassItemsLoading] = useState(false);
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
            // Full detail payload for the read-only ticket-number detail modal.
            materialGroupCode: item.material_group_code,
            materialGroupName: item.material_group_name,
            subMaterialGroupCode: item.material_sub_group_code,
            subMaterialGroupName: item.material_sub_group_name,
            longText1: item.long_text_1,
            longText2: item.long_text_2,
            longText3: item.long_text_3,
            templatePayload: item.template_payload,
            attachments: item.attachments,
            ...pickSapFields(item),
            // Replies the picked approver sent back on a "via email" rework.
            emailReplyCount: item.email_reply_count ?? item.emailReplyCount ?? 0,
            createdBy: item.created_by,
            createdAt: formatDateTime(item.created_at),
            assignedTo: computeAssignedToDisplay(item),
            assignmentCaption: computeAssignmentCaption(item),
            reworkStage: item.rework_stage,
            reworkByUserId: item.rework_by_user_id,
            reworkByUsername: item.rework_by_username,
            reworkAt: formatOptionalDateTime(item.rework_at),
            reworkReason: item.rework_reason || "",
            // N-stage approval data: pass through so buildApprovalDetail renders
            // every stage from approvalSteps instead of probing _1/_2/_3 fields.
            approvalSteps: normalizeApprovalSteps(item),
            currentStageLabel: item.currentStageLabel ?? item.current_stage_label,
            currentStageKind: item.currentStageKind ?? item.current_stage_kind,
            isFinalStage: item.isFinalStage ?? item.is_final_stage,
            totalStages: item.totalStages ?? item.total_stages,
          }))
        : [];

      setRequests(prev => [...singleRequests, ...prev.filter(item => item.mode === "mass")]);
      return true;
    } catch (error) {
      console.error("Failed to fetch single requests:", error);
      openSnackbar("Failed to load single requests. Showing fallback data.", "warning");
      return false;
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
            const approvalSteps = normalizeApprovalSteps(item);
            // Detect reworks from preserved remarks (not status, which is reset on
            // revision). Iterate the N approval steps when present; otherwise fall
            // back to the legacy first_item_approval_1/2/3_* fields.
            const reworks = [];
            if (approvalSteps.length > 0) {
              approvalSteps.forEach(step => {
                if (String(step.remark || "").trim() !== "") {
                  reworks.push({
                    stage: step.label,
                    by_username: step.approverName,
                    at: formatOptionalDateTime(step.actedAt ?? step.claimedAt),
                    reason: step.remark,
                  });
                }
              });
            } else {
              [1, 2, 3].forEach(level => {
                if (String(item[`first_item_approval_${level}_remark`] || "").trim() !== "") {
                  reworks.push({
                    stage: `Approval ${level}`,
                    by_username: item[`first_item_approval_${level}_user_name`],
                    at: formatOptionalDateTime(item[`first_item_approval_${level}_at`]),
                    reason: item[`first_item_approval_${level}_remark`],
                  });
                }
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
              createdAt: formatDateTime(item.created_at),
              assignedTo: computeMassAssignedToDisplay(item),
              assignmentCaption: computeMassAssignmentCaption(item),
              massRequestReason: item.mass_request_reason,
              itemCount: item.item_count,
              // Batch-level SAP staging status: the backend rolls the per-item
              // sap_push_status up worst-first, so the row reads like a single one.
              ...pickSapFields(item),
              // Replies counted across the whole batch's rework mail thread.
              emailReplyCount: item.email_reply_count ?? item.emailReplyCount ?? 0,
              // N-stage approval data: pass through so buildApprovalDetail renders
              // every stage from approvalSteps instead of probing _1/_2/_3 fields.
              approvalSteps,
              currentStageLabel: item.currentStageLabel ?? item.current_stage_label,
              currentStageKind: item.currentStageKind ?? item.current_stage_kind,
              isFinalStage: item.isFinalStage ?? item.is_final_stage,
              totalStages: item.totalStages ?? item.total_stages,
              // Legacy approval chain fields kept as a fallback for buildApprovalDetail.
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
    setInitialLocationsLoading(true);

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
      } finally {
        if (active) {
          setInitialLocationsLoading(false);
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
        normalizeSearchValue(item.assignedTo).includes(query) ||
        normalizeSearchValue(getStagedMaterialCode(item)).includes(query);

      return matchesTab && matchesSearch;
    });

    if (!sortConfig.key) {
      return nextRows;
    }

    const getSortValue = item =>
      sortConfig.key === "description"
        ? activeTab === "mass"
          ? item.massRequestReason
          : item.materialDescription
        : sortConfig.key === "materialCode"
          ? getStagedMaterialCode(item)
          : item[sortConfig.key];

    const direction = sortConfig.direction === "desc" ? -1 : 1;
    return [...nextRows].sort(
      (left, right) =>
        String(getSortValue(left) || "").localeCompare(String(getSortValue(right) || "")) *
        direction
    );
  }, [activeTab, sortConfig, requests, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage));

  const handleSort = key => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setPage(0);
  };

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

  const handleOpenComments = () => {
    setCommentsDialogOpen(true);
    handleMenuClose();
  };

  // Ticket-number click: open the read-only detail modal (no edit/delete).
  // Mass rows lazy-load their items; single rows already carry the full detail.
  const handleOpenDetail = async row => {
    setActiveRequestId(row.requestKey);
    setDetailDialogOpen(true);

    if (row.mode !== "mass") {
      return;
    }

    try {
      setDetailMassItemsLoading(true);
      const response = await axiosPrivate.get(`/material/requests/mass/${row.id}/items`);
      setDetailMassItems(response.data?.data ?? []);
    } catch (error) {
      setDetailMassItems([]);
      openSnackbar(
        error?.response?.data?.message || "Failed to load mass request items.",
        "error"
      );
    } finally {
      setDetailMassItemsLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setDetailMassItems([]);
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
              justifyContent: "flex-end",
              alignItems: { xs: "stretch", md: "center" },
              flexDirection: { xs: "column", md: "row" },
              gap: 1.5,
              mb: 2.5,
            }}
          >
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

          <PageTablePaper>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>Action</TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={sortConfig.key === "ticketNumber"}
                      direction={sortConfig.key === "ticketNumber" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("ticketNumber")}
                    >
                      Ticket Number
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>
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
                      active={sortConfig.key === "description"}
                      direction={sortConfig.key === "description" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("description")}
                    >
                      {activeTab === "mass" ? "Mass Request Reason" : "Material Description"}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={sortConfig.key === "uom"}
                      direction={sortConfig.key === "uom" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("uom")}
                    >
                      UOM
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="left" sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={sortConfig.key === "status"}
                      direction={sortConfig.key === "status" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("status")}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={sortConfig.key === "createdBy"}
                      direction={sortConfig.key === "createdBy" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("createdBy")}
                    >
                      Created by
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={sortConfig.key === "createdAt"}
                      direction={sortConfig.key === "createdAt" ? sortConfig.direction : "asc"}
                      onClick={() => handleSort("createdAt")}
                    >
                      Created at
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ ...PAGE_TABLE_HEADER_SX, whiteSpace: "nowrap" }}>
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
                {requestsLoading && <TableLoadingRows columns={10} />}
                {!requestsLoading && filteredRequests
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
                          onClick={() => handleOpenDetail(row)}
                          sx={{ px: 0, minWidth: 0, textTransform: "none", fontWeight: 600 }}
                        >
                          {row.ticketNumber}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <TicketTypePill value={row.ticketType} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                        {getStagedMaterialCode(row) || "-"}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {activeTab === "mass" ? row.massRequestReason : row.materialDescription}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{row.uom}</TableCell>
                      <TableCell align="left">
                        <SapAwareStatus row={row} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{row.createdBy}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{row.createdAt}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{row.assignedTo}</TableCell>
                    </TableRow>
                  ))}

                {!requestsLoading && filteredRequests.length === 0 && (
                  <TableEmptyRow
                    columns={10}
                    title="No request found"
                    description="Coba ubah keyword pencarian atau tab request."
                  />
                )}
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
        <MenuItem onClick={handleOpenComments}>View Comments</MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>Copy Request</MenuItem>
      </Menu>

      <RequestDetailDialog
        open={detailDialogOpen && Boolean(selectedRequest)}
        request={selectedRequest}
        onClose={handleCloseDetail}
        massItems={detailMassItems}
        massItemsLoading={detailMassItemsLoading}
      />

      <RequestActionDialog
        open={Boolean(actionDialogMode) && Boolean(selectedRequest)}
        mode={actionDialogMode}
        request={selectedRequest}
        onClose={() => setActionDialogMode(null)}
        onReviseRequest={handleReviseRequest}
      />

      <RequestCommentsDialog
        open={commentsDialogOpen && Boolean(selectedRequest)}
        requestKind={resolveRequestCommentKind(selectedRequest?.mode === "mass")}
        requestId={selectedRequest?.id}
        ticketNumber={selectedRequest?.ticketNumber}
        subtitle={
          selectedRequest?.mode === "mass"
            ? selectedRequest?.massRequestReason
            : selectedRequest?.materialDescription
        }
        onClose={() => setCommentsDialogOpen(false)}
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
            locationsLoading={initialLocationsLoading}
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
