import {
  AssignmentOutlined,
  CheckCircleOutline,
  ErrorOutline,
  Inventory2Outlined,
  LayersOutlined,
  ManageAccountsOutlined,
  PendingActionsOutlined,
  Refresh,
  ReplayOutlined,
  SendOutlined,
  ViewListOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect, useState } from "react";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { formatDashboardCount, getMaterialWorkflowStatuses } from "src/helper/materialDashboard";
import MaterialDashboardCharts from "./MaterialDashboardCharts";

const DEFAULT_FILTERS = { dateFrom: "", dateTo: "", requestKind: "all" };
const WORKFLOW_ICONS = [
  PendingActionsOutlined,
  ManageAccountsOutlined,
  ReplayOutlined,
  SendOutlined,
  CheckCircleOutline,
  ErrorOutline,
];
const panelSx = { border: "1px solid", borderColor: "divider", borderRadius: "12px" };

function MetricCard({ label, count, caption, Icon, color = "#2065D1", loading, prominent }) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        p: 2.5,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        ...(prominent && {
          bgcolor: "primary.main",
          color: "primary.contrastText",
          borderColor: "primary.main",
        }),
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              minHeight: caption ? 20 : 40,
              color: prominent ? "inherit" : "text.secondary",
            }}
          >
            {label}
          </Typography>
          {loading ? (
            <Skeleton width={70} height={45} />
          ) : (
            <Typography
              variant="h3"
              sx={{ fontWeight: 800, mt: 0.75, fontVariantNumeric: "tabular-nums" }}
            >
              {formatDashboardCount(count)}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: "10px",
            bgcolor: prominent ? "rgba(255, 255, 255, 0.16)" : alpha(color, 0.1),
            color: prominent ? "inherit" : color,
          }}
        >
          <Icon fontSize="small" />
        </Box>
      </Stack>
      {caption && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: "auto",
            pt: 1,
            color: prominent ? "inherit" : "text.secondary",
          }}
        >
          {caption}
        </Typography>
      )}
    </Paper>
  );
}

export default function MaterialDashboardOverview() {
  const axiosPrivate = useAxiosPrivate();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const invalidRange = Boolean(
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo
  );
  const isInvalidDate = value =>
    Boolean(value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01"));
  const invalidDateFrom = isInvalidDate(filters.dateFrom);
  const invalidDateTo = isInvalidDate(filters.dateTo);
  const invalidFilters = invalidRange || invalidDateFrom || invalidDateTo;

  useEffect(() => {
    if (invalidFilters) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    axiosPrivate
      .get("/material/dashboard", {
        params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")),
        signal: controller.signal,
      })
      .then(response => {
        if (!controller.signal.aborted) setData(response.data.data);
      })
      .catch(loadError => {
        if (!controller.signal.aborted)
          setError(loadError?.response?.data?.message || "Failed to load the material dashboard.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [axiosPrivate, filters, refreshIndex, invalidFilters]);

  const updateFilters = event =>
    setFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setRefreshIndex(value => value + 1);
  };
  const totals = data?.totals;
  const workflowStatuses = getMaterialWorkflowStatuses(data?.approvalRole);

  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ ...panelSx, p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2 }}>
          <TextField
            select
            name="requestKind"
            label="Request Mode"
            value={filters.requestKind}
            onChange={updateFilters}
            size="small"
            sx={{ flex: "1 1 180px" }}
          >
            <MenuItem value="all">All Requests</MenuItem>
            <MenuItem value="single">Single Requests</MenuItem>
            <MenuItem value="mass">Mass Requests</MenuItem>
          </TextField>
          <TextField
            name="dateFrom"
            label="Period From"
            type="date"
            value={filters.dateFrom}
            onChange={updateFilters}
            size="small"
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: "1900-01-01", max: filters.dateTo || "9999-12-31" }}
            error={invalidDateFrom || invalidRange}
            helperText={
              invalidDateFrom
                ? "Enter a valid date from 1900 onward."
                : invalidRange
                ? "Start date must be on or before the end date."
                : undefined
            }
            sx={{ flex: "1 1 180px" }}
          />
          <TextField
            name="dateTo"
            label="Period To"
            type="date"
            value={filters.dateTo}
            onChange={updateFilters}
            size="small"
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: filters.dateFrom || "1900-01-01", max: "9999-12-31" }}
            error={invalidDateTo}
            helperText={invalidDateTo ? "Enter a valid date from 1900 onward." : undefined}
            sx={{ flex: "1 1 180px" }}
          />
          <Stack direction="row" spacing={1} sx={{ minHeight: 40 }}>
            <Button onClick={resetFilters} sx={{ textTransform: "none" }}>
              Reset
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
      >
        <Typography variant="body2" color="text.secondary">
          {data?.scope === "all"
            ? "All material requests"
            : "Your requests and accessible approvals"}{" "}
          · Filtered by submission date (WIB)
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={() => setRefreshIndex(value => value + 1)}
          disabled={loading || invalidFilters}
          size="small"
          sx={{ textTransform: "none" }}
        >
          Refresh
        </Button>
      </Stack>

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

      {!error && (
        <>
          <Box
            aria-busy={loading}
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <MetricCard
              label="Total Submissions"
              count={totals?.submissions}
              caption="Single requests + mass requests"
              Icon={AssignmentOutlined}
              loading={loading}
              prominent
            />
            <MetricCard
              label="Single Requests"
              count={totals?.singleRequests}
              caption="One material item per request"
              Icon={ViewListOutlined}
              loading={loading}
            />
            <MetricCard
              label="Mass Requests"
              count={totals?.massBatches}
              caption={
                loading
                  ? "Grouped material submissions"
                  : `${formatDashboardCount(totals?.massItems)} material items in mass requests`
              }
              Icon={LayersOutlined}
              color="#1B4C48"
              loading={loading}
            />
            <MetricCard
              label="All Material Items"
              count={totals?.materialItems}
              caption="Single items + individual mass items"
              Icon={Inventory2Outlined}
              color="#229A16"
              loading={loading}
            />
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Workflow Status
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              KPIs and charts count individual material items, including each item in a mass batch.
            </Typography>
            <Box
              aria-busy={loading}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                  xl: "repeat(6, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              {workflowStatuses.slice(0, 6).map((status, index) => (
                <MetricCard
                  key={status.key}
                  label={status.label}
                  count={data?.statuses[status.key]}
                  Icon={WORKFLOW_ICONS[index]}
                  color={status.color}
                  loading={loading}
                />
              ))}
            </Box>
          </Box>

          {loading ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
                gap: 3,
              }}
            >
              {[0, 1, 2, 3].map(index => (
                <Paper key={index} elevation={0} sx={{ ...panelSx, p: 3 }}>
                  <Skeleton width="55%" height={28} />
                  <Skeleton variant="rounded" height={250} sx={{ mt: 3 }} />
                </Paper>
              ))}
            </Box>
          ) : data && totals.materialItems === 0 ? (
            <Paper
              elevation={0}
              sx={{ ...panelSx, borderStyle: "dashed", py: 7, px: 3, textAlign: "center" }}
            >
              <Inventory2Outlined sx={{ fontSize: 44, color: "text.disabled" }} />
              <Typography variant="h6" sx={{ mt: 2, fontWeight: 700 }}>
                No requests found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                There are no material requests available for the selected filters.
              </Typography>
              <Button onClick={resetFilters} sx={{ mt: 2, textTransform: "none" }}>
                Reset Filters
              </Button>
            </Paper>
          ) : (
            data && <MaterialDashboardCharts data={data} />
          )}
        </>
      )}
    </Stack>
  );
}
