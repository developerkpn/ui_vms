import {
  AccessTimeOutlined,
  AssessmentOutlined,
  ChatBubbleOutline,
  DownloadOutlined,
  ExpandMore,
  Inventory2Outlined,
  MarkChatReadOutlined,
  Refresh,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import PageHeader from "src/components/common/PageHeader";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";

const DEFAULT_FILTERS = { dateFrom: "", dateTo: "", requestKind: "all" };
const panelSx = { border: "1px solid", borderColor: "divider", borderRadius: "12px" };
const actionSx = { textTransform: "none", borderRadius: "8px", minHeight: 40, fontWeight: 700 };
const columnGroups = [
  {
    label: "Request details",
    columns: [
      ["ticket_number", "Ticket Number"],
      ["request_kind", "Request Type"],
      ["material_code", "Material Code"],
      ["material_description", "Material Name"],
      ["material_group", "Material Group"],
      ["requester", "Requester Name"],
      ["request_at", "Requester Date"],
      ["plant_code", "Plant Code"],
      ["business_unit", "Business Unit"],
      ["request_status", "Request Status"],
    ],
  },
  {
    label: "Approval history",
    columns: [
      ["approval_1_by", "Approval 1 By"],
      ["approval_1_at", "Approval 1 Date"],
      ["approval_2_by", "Approval 2 By"],
      ["approval_2_at", "Approval 2 Date"],
      ["approval_3_by", "Approval 3 By"],
      ["approval_3_at", "Approval 3 Date"],
      ["approval_4_by", "Approval 4 By"],
      ["approval_4_at", "Approval 4 Date"],
      ["final_approval_at", "Final Approval Date"],
    ],
  },
  {
    label: "Master Data",
    columns: [
      ["responded_by", "Master Data By"],
      ["response_at", "Respond Date"],
      ["completion_at", "Completion Date"],
    ],
  },
  {
    label: "SLA · days",
    columns: [
      ["response_sla_days", "Respond Day (H+1)"],
      ["ticket_journey_days", "Ticket Journey"],
    ],
  },
];
const columns = columnGroups.flatMap(group => group.columns);

function columnWidth(key) {
  if (key === "ticket_number") return 156;
  if (key === "request_kind") return 112;
  if (key === "plant_code") return 120;
  if (key === "business_unit") return 130;
  if (key === "material_description") return 280;
  if (key === "material_group") return 220;
  if (key.endsWith("_days")) return 144;
  if (key.endsWith("_at")) return 170;
  if (key === "material_code" || key === "request_status") return 152;
  return 190;
}

function isInvalidDate(value) {
  return Boolean(value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01"));
}

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function rowValue(row, key) {
  if (key === "request_kind") return row[key] === "MASS" ? "Mass" : "Single";
  if (key === "request_status") {
    const value = String(row[key] ?? "");
    return value.trim().toUpperCase() === "CANCEL" ? "Cancelled" : value.replace(/_/g, " ");
  }
  const approval = key.match(/^approval_([1-4])_(by|at)$/);
  if (approval) {
    const step = row.approval_stages?.find(item => Number(item.level) === Number(approval[1]));
    return key.endsWith("_by")
      ? step?.approver || ""
      : formatTimestamp(step?.status === "APPROVED" ? step?.acted_at : null);
  }
  if (key === "responded_by") return row.responded_by || row.mdm_approved_by || "";
  if (key.endsWith("_at")) return formatTimestamp(row[key]);
  return row[key] ?? "";
}

function SummaryCard({ label, count, caption, Icon, color, loading }) {
  return (
    <Paper elevation={0} sx={{ ...panelSx, p: 2.5, minWidth: 0 }}>
      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          {loading ? (
            <Skeleton width={80} height={48} />
          ) : (
            <Typography
              variant="h3"
              sx={{ mt: 0.75, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
            >
              {count == null ? "—" : count.toLocaleString("en-US")}
            </Typography>
          )}
        </Box>
        <Box
          sx={theme => ({
            display: "grid",
            placeItems: "center",
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: "10px",
            color,
            bgcolor: alpha(
              color === "primary.main"
                ? theme.palette.primary.main
                : color === "success.main"
                ? theme.palette.success.main
                : theme.palette.text.secondary,
              0.08
            ),
          })}
        >
          <Icon fontSize="small" />
        </Box>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        {caption}
      </Typography>
    </Paper>
  );
}

function ReportCellValue({ row, columnKey }) {
  const value = rowValue(row, columnKey);
  if (value === "" || value == null)
    return (
      <Box component="span" sx={{ color: "text.disabled" }}>
        —
      </Box>
    );
  if (columnKey === "request_status") {
    const status = String(value)
      .trim()
      .toUpperCase()
      .replace(/[\s_]+/g, "_");
    const color = ["APPROVED", "COMPLETED", "DONE"].includes(status)
      ? "success"
      : ["REJECT", "REJECTED", "SAP_ERROR"].includes(status)
      ? "error"
      : status === "REWORK"
      ? "warning"
      : ["OPEN", "PENDING", "MASTER_DATA"].includes(status)
      ? "info"
      : "default";
    const label = String(value);
    return (
      <Chip
        label={label}
        title={label}
        color={color}
        size="small"
        variant="outlined"
        sx={{
          fontSize: "0.72rem",
          fontWeight: 600,
          height: 26,
          borderRadius: "6px",
          maxWidth: "100%",
        }}
      />
    );
  }
  if (columnKey.endsWith("_days")) {
    return (
      <Box
        component="span"
        sx={theme => ({
          display: "inline-flex",
          alignItems: "baseline",
          gap: 0.5,
          py: 0.5,
          px: 1,
          borderRadius: "6px",
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          fontWeight: 700,
        })}
      >
        {value}
        <Typography component="span" variant="caption" color="text.secondary">
          {Number(value) === 1 ? "day" : "days"}
        </Typography>
      </Box>
    );
  }
  if (columnKey === "request_kind") {
    return (
      <Chip
        label={value}
        size="small"
        sx={{ fontSize: "0.72rem", borderRadius: "6px", height: 24, bgcolor: "grey.100" }}
      />
    );
  }
  return (
    <Box
      component="span"
      title={String(value)}
      sx={{
        ...(columnKey === "ticket_number" && {
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }),
        ...(!columnKey.endsWith("_at") &&
          columnKey !== "ticket_number" && {
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            whiteSpace: "normal",
          }),
      }}
    >
      {value}
    </Box>
  );
}

export default function MaterialSlaReport() {
  const axiosPrivate = useAxiosPrivate();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [reportAsOf, setReportAsOf] = useState(null);
  const invalidRange = Boolean(
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo
  );
  const invalidDateFrom = isInvalidDate(filters.dateFrom);
  const invalidDateTo = isInvalidDate(filters.dateTo);
  const invalidFilters = invalidRange || invalidDateFrom || invalidDateTo;
  const unavailable = invalidFilters || Boolean(error);
  const canExport = !loading && !unavailable && rows.length > 0;

  useEffect(() => {
    if (invalidFilters) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    axiosPrivate
      .get("/material/dashboard/sla", {
        params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")),
        signal: controller.signal,
      })
      .then(response => {
        if (!controller.signal.aborted) {
          setRows(response.data.data?.rows ?? []);
          setReportAsOf(response.data.data?.rows?.[0]?.report_as_of || new Date().toISOString());
          setPage(0);
        }
      })
      .catch(loadError => {
        if (!controller.signal.aborted) {
          setError(loadError?.response?.data?.message || "Failed to load the SLA report.");
          setRows([]);
          setReportAsOf(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [axiosPrivate, filters, refreshIndex, invalidFilters]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      responded: rows.filter(row => row.is_responded).length,
      noResponse: rows.filter(row => !row.is_responded).length,
    }),
    [rows]
  );

  const exportExcel = () => {
    if (!canExport) return;
    const groupHeaders = [];
    const merges = columnGroups.map(group => {
      const start = groupHeaders.length;
      groupHeaders.push(group.label, ...Array(group.columns.length - 1).fill(""));
      return { s: { r: 0, c: start }, e: { r: 0, c: groupHeaders.length - 1 } };
    });
    const worksheet = XLSX.utils.aoa_to_sheet([
      groupHeaders,
      columns.map(([, label]) => label),
      ...rows.map(row => columns.map(([key]) => rowValue(row, key))),
    ]);
    worksheet["!merges"] = merges;
    worksheet["!cols"] = columns.map(([key]) => ({ wpx: columnWidth(key) }));
    worksheet["!rows"] = [{ hpt: 24 }, { hpt: 30 }];
    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 1, c: 0 },
        e: { r: rows.length + 1, c: columns.length - 1 },
      }),
    };
    columns.forEach(([key], columnIndex) => {
      if (!key.endsWith("_days")) return;
      rows.forEach((_, rowIndex) => {
        const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex + 2, c: columnIndex })];
        if (cell?.t === "n") cell.z = '[=1]0" day";0" days"';
      });
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporting SLA");
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["SLA Cut-off", "16:45 WIB"],
        [
          "Final Approval Date",
          "Last approved MANUAL stage before Master Data. If the request has no manual approval stages, the request creation timestamp is used.",
        ],
        [
          "Completion Date",
          "Timestamp of the Master Data APPROVE comment; blank for requests without that event.",
        ],
        [
          "Respond Date",
          "First Master Data REWORK, REJECT, or CORRESPONDENCE comment. APPROVE and requester SUBMIT/RESUBMIT events are excluded.",
        ],
        [
          "Respond Day (H+1)",
          "SLA days from request to response. If no response comment exists, end at completion, cancellation, or report time.",
        ],
        [
          "Ticket Journey",
          "SLA days from request to completion. For cancelled requests, end at the cancellation timestamp; open requests run to report time.",
        ],
      ]),
      "Notes"
    );
    const jakartaDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    XLSX.writeFile(workbook, `Reporting_SLA_MMS_${jakartaDate}.xlsx`);
  };

  const updateFilters = event => {
    setFilters(current => ({ ...current, [event.target.name]: event.target.value }));
    setPage(0);
  };
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
    setRefreshIndex(value => value + 1);
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="SLA Report"
        subtitle="Review material request SLA, response dates, and ticket journeys."
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => setRefreshIndex(value => value + 1)}
              disabled={loading || invalidFilters}
              sx={actionSx}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              disableElevation
              startIcon={<DownloadOutlined />}
              onClick={exportExcel}
              disabled={!canExport}
              sx={actionSx}
            >
              Export Excel
            </Button>
          </>
        }
      />
      <Stack spacing={2.5} sx={{ minWidth: 0 }}>
        <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, sm: 2.5 } }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            sx={{ mb: 2.5 }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Report period
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Filter by request date · WIB
              </Typography>
            </Box>
            {!filters.dateFrom && !filters.dateTo && (
              <Chip
                label="All history"
                size="small"
                variant="outlined"
                sx={{ borderRadius: "6px", color: "text.secondary" }}
              />
            )}
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "minmax(180px, 1.2fr) repeat(2, minmax(160px, 1fr)) auto",
              },
              gap: 2,
              alignItems: "start",
            }}
          >
            <TextField
              select
              name="requestKind"
              label="Request type"
              value={filters.requestKind}
              onChange={updateFilters}
              size="small"
              fullWidth
              sx={{ gridColumn: { sm: "1 / -1", lg: "auto" } }}
            >
              <MenuItem value="all">All requests</MenuItem>
              <MenuItem value="single">Single requests</MenuItem>
              <MenuItem value="mass">Mass requests</MenuItem>
            </TextField>
            <TextField
              name="dateFrom"
              label="From"
              type="date"
              value={filters.dateFrom}
              onChange={updateFilters}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: "1900-01-01", max: filters.dateTo || "9999-12-31" }}
              error={invalidDateFrom || invalidRange}
              helperText={
                invalidDateFrom
                  ? "Enter a valid date from 1900 onward."
                  : invalidRange
                  ? "From must be on or before To."
                  : undefined
              }
            />
            <TextField
              name="dateTo"
              label="To"
              type="date"
              value={filters.dateTo}
              onChange={updateFilters}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: filters.dateFrom || "1900-01-01", max: "9999-12-31" }}
              error={invalidDateTo}
              helperText={invalidDateTo ? "Enter a valid date from 1900 onward." : undefined}
            />
            <Button
              onClick={resetFilters}
              sx={{
                ...actionSx,
                gridColumn: { sm: "1 / -1", lg: "auto" },
                color: "text.secondary",
                px: 2,
              }}
            >
              Reset filters
            </Button>
          </Box>
        </Paper>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          <SummaryCard
            label="Material items"
            count={unavailable ? null : summary.total}
            caption="Single and mass request items"
            Icon={Inventory2Outlined}
            color="primary.main"
            loading={loading}
          />
          <SummaryCard
            label="Response recorded"
            count={unavailable ? null : summary.responded}
            caption="First qualifying MDM comment"
            Icon={MarkChatReadOutlined}
            color="success.main"
            loading={loading}
          />
          <SummaryCard
            label="No response comment"
            count={unavailable ? null : summary.noResponse}
            caption="No qualifying MDM comment recorded"
            Icon={ChatBubbleOutline}
            color="text.secondary"
            loading={loading}
          />
        </Box>

        <Accordion
          disableGutters
          elevation={0}
          sx={{ ...panelSx, "&:before": { display: "none" }, "&.Mui-expanded": { m: 0 } }}
        >
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2.5, minHeight: 56 }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <AccessTimeOutlined fontSize="small" color="primary" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                How SLA is calculated
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              SLA days advance at the daily 16:45 WIB cut-off. All dates and times in this report
              use WIB.
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: 2,
              }}
            >
              {[
                [
                  "Final approval",
                  "The last approved non-MDM stage. Requests with no manual approval stages use the request date.",
                ],
                [
                  "First response",
                  "The first MDM rework, rejection, or correspondence comment. Claiming a request is not a response.",
                ],
                [
                  "Completion",
                  "The timestamp of the MDM approval comment. Approval alone does not count as a first response comment.",
                ],
                [
                  "Ticket journey",
                  "Runs from creation to completion. Cancelled requests stop at cancellation; open requests run to the report time.",
                ],
              ].map(([title, description]) => (
                <Box key={title}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {error && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setRefreshIndex(value => value + 1)}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ ...panelSx, overflow: "hidden", minWidth: 0 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
            sx={{ px: 2.5, py: 2, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                SLA details
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {loading
                  ? "Loading report…"
                  : unavailable
                  ? "Report unavailable"
                  : `${rows.length.toLocaleString("en-US")} material items`}
                {reportAsOf && !loading && !unavailable
                  ? ` · As of ${formatTimestamp(reportAsOf)} WIB`
                  : ""}
              </Typography>
            </Box>
            <Chip
              icon={<AccessTimeOutlined />}
              label="Cut-off 16:45 WIB"
              size="small"
              variant="outlined"
              sx={{
                borderRadius: "6px",
                color: "text.secondary",
                "& .MuiChip-icon": { fontSize: 16 },
              }}
            />
          </Stack>

          {!loading && (unavailable || rows.length === 0) ? (
            <Stack alignItems="center" spacing={1} sx={{ px: 3, py: 7 }}>
              <AssessmentOutlined sx={{ fontSize: 38, color: "text.disabled", mb: 0.5 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {invalidFilters
                  ? "Choose a valid reporting period"
                  : error
                  ? "The report could not be loaded"
                  : "No requests found"}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                {invalidFilters
                  ? "Check the dates above to view the report."
                  : error
                  ? "Refresh the report to try again."
                  : "Try a different period or reset the filters to view all history."}
              </Typography>
            </Stack>
          ) : (
            <TableContainer
              sx={{ maxHeight: "65vh", overflow: "auto", overscrollBehaviorX: "contain" }}
            >
              <Table
                stickyHeader
                size="small"
                aria-label="Material SLA report"
                aria-busy={loading}
                sx={{
                  minWidth: columns.reduce((width, [key]) => width + columnWidth(key), 0),
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  {columns.map(([key]) => (
                    <col key={key} style={{ width: columnWidth(key) }} />
                  ))}
                </colgroup>
                <TableHead>
                  <TableRow>
                    {columnGroups.map(group => (
                      <TableCell
                        key={group.label}
                        colSpan={group.columns.length}
                        scope="colgroup"
                        sx={{
                          height: 36,
                          py: 0.75,
                          px: 2,
                          top: 0,
                          bgcolor: "grey.100",
                          color: "text.secondary",
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          borderRight: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {group.label}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    {columns.map(([key, label]) => (
                      <TableCell
                        key={key}
                        scope="col"
                        align={key.endsWith("_days") ? "center" : "left"}
                        sx={{
                          top: 36,
                          height: 50,
                          py: 1.5,
                          px: 2,
                          bgcolor: "grey.50",
                          color: "text.secondary",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          whiteSpace: "normal",
                          lineHeight: 1.3,
                          ...(key === "ticket_number" && {
                            left: 0,
                            zIndex: 4,
                            borderRight: "1px solid",
                            borderColor: "divider",
                          }),
                        }}
                      >
                        {label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 5 }, (_, index) => (
                        <TableRow key={index}>
                          {columns.map(([key]) => (
                            <TableCell key={key} sx={{ px: 2, py: 2 }}>
                              <Skeleton />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : rows.slice(page * pageSize, page * pageSize + pageSize).map(row => (
                        <TableRow
                          hover
                          key={`${row.request_kind}-${row.item_id}`}
                          sx={{
                            "&:last-child td": { borderBottom: 0 },
                            "&:hover .report-ticket-cell": { bgcolor: "grey.100" },
                          }}
                        >
                          {columns.map(([key]) => (
                            <TableCell
                              key={key}
                              className={key === "ticket_number" ? "report-ticket-cell" : undefined}
                              align={key.endsWith("_days") ? "center" : "left"}
                              sx={{
                                px: 2,
                                py: 1.75,
                                fontSize: "0.8rem",
                                whiteSpace: "nowrap",
                                fontVariantNumeric: "tabular-nums",
                                ...(key === "ticket_number" && {
                                  position: "sticky",
                                  left: 0,
                                  zIndex: 1,
                                  bgcolor: "background.paper",
                                  borderRight: "1px solid",
                                  borderRightColor: "divider",
                                }),
                              }}
                            >
                              <ReportCellValue row={row} columnKey={key} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <TablePagination
            component="div"
            count={unavailable ? 0 : rows.length}
            page={unavailable ? 0 : page}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={event => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100]}
            sx={{
              borderTop: "1px solid",
              borderColor: "divider",
              "& .MuiTablePagination-toolbar": {
                px: { xs: 1, sm: 2 },
                flexWrap: "wrap",
                justifyContent: "flex-end",
              },
              "& .MuiTablePagination-spacer": { display: { xs: "none", sm: "block" } },
              "& .MuiTablePagination-actions": { ml: { xs: 0, sm: 2 } },
            }}
          />
        </Paper>
      </Stack>
    </Box>
  );
}
