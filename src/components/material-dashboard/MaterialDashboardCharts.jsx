import { Box, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useId } from "react";
import {
  buildMaterialGroupChartRows,
  buildMonthlyChartScale,
  formatDashboardCount,
  formatDashboardMonth,
  getMaterialWorkflowStatuses,
} from "src/helper/materialDashboard";

const GROUP_COLORS = ["#2065D1", "#1B4C48", "#1890FF", "#9c27b0", "#229A16", "#B78103", "#919EAB"];
const TYPE_COLORS = { Create: "#2065D1", Change: "#1B4C48", Extend: "#B78103", Other: "#919EAB" };

function ChartCard({ title, subtitle, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px",
        minWidth: 0,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        {subtitle}
      </Typography>
      {children}
    </Paper>
  );
}

function LegendDot({ color }) {
  return (
    <Box
      aria-hidden="true"
      sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }}
    />
  );
}

function DonutChart({ rows, label }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  let offset = 0;
  const slices = rows
    .filter(row => row.count > 0)
    .map(row => {
      const length = (row.count / total) * 100;
      const slice = { ...row, offset, length };
      offset += length;
      return slice;
    });

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={3}
      alignItems="center"
      sx={{ minHeight: 250 }}
    >
      <Box sx={{ position: "relative", width: 220, height: 220, flexShrink: 0 }}>
        <svg
          viewBox="0 0 220 220"
          width="100%"
          height="100%"
          role="img"
          aria-label={`${label}: ${rows.map(row => `${row.label} ${row.count}`).join(", ")}`}
        >
          <circle cx="110" cy="110" r="88" fill="none" stroke="#F4F6F8" strokeWidth="28" />
          {slices.map(slice => (
            <circle
              key={slice.label}
              cx="110"
              cy="110"
              r="88"
              fill="none"
              stroke={slice.color}
              strokeWidth="28"
              pathLength="100"
              strokeDasharray={`${slice.length} ${100 - slice.length}`}
              strokeDashoffset={-slice.offset}
              transform="rotate(-90 110 110)"
            >
              <title>{`${slice.label}: ${formatDashboardCount(
                slice.count
              )} items (${slice.length.toFixed(1)}%)`}</title>
            </circle>
          ))}
        </svg>
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {formatDashboardCount(total)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            material items
          </Typography>
        </Box>
      </Box>
      <Stack spacing={1.5} sx={{ width: "100%", minWidth: 0 }}>
        {rows.map(row => (
          <Tooltip
            key={row.label}
            title={`${row.label}: ${formatDashboardCount(row.count)} items (${
              total ? ((row.count / total) * 100).toFixed(1) : "0"
            }%)`}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LegendDot color={row.color} />
              <Typography
                variant="body2"
                sx={{ flexGrow: 1, minWidth: 0, overflowWrap: "anywhere" }}
              >
                {row.label}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
              >
                {formatDashboardCount(row.count)}
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Stack>
    </Stack>
  );
}

function StatusChart({ statuses, approvalRole }) {
  // Always retain the six principal workflow states; terminal/legacy states
  // appear when present so every material item is accounted for.
  const rows = getMaterialWorkflowStatuses(approvalRole)
    .filter((row, index) => index < 6 || statuses[row.key] > 0)
    .map(row => ({ ...row, count: statuses[row.key] || 0 }));
  const maximum = Math.max(1, ...rows.map(row => row.count));
  return (
    <Stack spacing={1.75} aria-label="Material items by workflow status">
      {rows.map(row => (
        <Box
          key={row.key}
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "120px minmax(0, 1fr) 40px",
              sm: "160px minmax(0, 1fr) 48px",
            },
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {row.label}
          </Typography>
          <Tooltip title={`${row.label}: ${formatDashboardCount(row.count)} material items`}>
            <Box sx={{ height: 18, borderRadius: "4px", bgcolor: "grey.100", overflow: "hidden" }}>
              <Box
                sx={{
                  height: "100%",
                  width: `${(row.count / maximum) * 100}%`,
                  bgcolor: row.color,
                  borderRadius: "4px",
                }}
              />
            </Box>
          </Tooltip>
          <Typography
            variant="body2"
            sx={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
          >
            {formatDashboardCount(row.count)}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function MonthlyChart({ rows }) {
  const theme = useTheme();
  const titleId = useId();
  const { top, ticks } = buildMonthlyChartScale(rows);
  const plot = { left: 62, top: 20, width: 718, height: 210 };
  const slotWidth = plot.width / Math.max(1, rows.length);
  const barWidth = Math.min(36, slotWidth * 0.55);
  const description = rows
    .map(
      row =>
        `${formatDashboardMonth(row.month)}: ${row.singleItems} single items, ${
          row.massItems
        } mass items in ${row.massBatches} batches`
    )
    .join("; ");

  return (
    <Box>
      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: 600 }}>
          <svg
            viewBox="0 0 800 280"
            width="100%"
            role="img"
            aria-labelledby={titleId}
            style={{ display: "block" }}
          >
            <title id={titleId}>{`Monthly material submissions. ${description}`}</title>
            {ticks.map(tick => {
              const y = plot.top + plot.height - (tick / top) * plot.height;
              return (
                <g key={tick}>
                  <line
                    x1={plot.left}
                    x2={plot.left + plot.width}
                    y1={y}
                    y2={y}
                    stroke={theme.palette.divider}
                  />
                  <text
                    x={plot.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill={theme.palette.text.secondary}
                    fontSize="12"
                  >
                    {formatDashboardCount(tick)}
                  </text>
                </g>
              );
            })}
            {rows.map((row, index) => {
              const x = plot.left + slotWidth * (index + 0.5);
              const singleHeight = (row.singleItems / top) * plot.height;
              const massHeight = (row.massItems / top) * plot.height;
              const bottom = plot.top + plot.height;
              return (
                <g key={row.month}>
                  <title>{`${formatDashboardMonth(row.month)}: ${formatDashboardCount(
                    row.singleItems
                  )} single items, ${formatDashboardCount(
                    row.massItems
                  )} mass items in ${formatDashboardCount(row.massBatches)} batches`}</title>
                  <rect
                    x={x - barWidth / 2}
                    y={bottom - singleHeight}
                    width={barWidth}
                    height={singleHeight}
                    fill={theme.palette.primary.main}
                  />
                  <rect
                    x={x - barWidth / 2}
                    y={bottom - singleHeight - massHeight}
                    width={barWidth}
                    height={massHeight}
                    fill={theme.palette.secondary.main}
                  />
                  <text
                    x={x}
                    y={bottom + 25}
                    textAnchor="middle"
                    fill={theme.palette.text.secondary}
                    fontSize="12"
                  >
                    {formatDashboardMonth(row.month)}
                  </text>
                </g>
              );
            })}
          </svg>
        </Box>
      </Box>
      <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <LegendDot color={theme.palette.primary.main} />
          <Typography variant="body2" color="text.secondary">
            Single request items
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <LegendDot color={theme.palette.secondary.main} />
          <Typography variant="body2" color="text.secondary">
            Mass request items
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

export default function MaterialDashboardCharts({ data }) {
  const groupRows = buildMaterialGroupChartRows(data.materialGroups).map((row, index) => ({
    ...row,
    color: GROUP_COLORS[index],
  }));
  const typeRows = ["Create", "Change", "Extend", "Other"]
    .map(label => ({
      label,
      count: data.requestTypes.find(row => row.label === label)?.count || 0,
      color: TYPE_COLORS[label],
    }))
    .filter(row => row.label !== "Other" || row.count > 0);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
        gap: 3,
      }}
    >
      <ChartCard
        title="Requests by Status"
        subtitle="Current workflow status of each material item"
      >
        <StatusChart statuses={data.statuses} approvalRole={data.approvalRole} />
      </ChartCard>
      <ChartCard
        title="Requests by Material Group"
        subtitle={
          data.materialGroups.length > 6
            ? "Top 6 groups, with remaining groups combined"
            : "Material items by material group"
        }
      >
        <DonutChart rows={groupRows} label="Material groups" />
      </ChartCard>
      <ChartCard title="Requests by Type" subtitle="Create, Change, and Extend material items">
        <DonutChart rows={typeRows} label="Request types" />
      </ChartCard>
      <ChartCard
        title="Monthly Submissions"
        subtitle="Material items submitted per month, up to the last 12 months of the selected period (WIB)"
      >
        <MonthlyChart rows={data.monthlySubmissions || []} />
      </ChartCard>
    </Box>
  );
}
