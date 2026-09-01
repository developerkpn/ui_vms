import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import moment from "moment";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";

/**
 * Read-only view of the external AI document-validation verdict for one vendor.
 *
 * ADVISORY. Nothing here submits, approves, or blocks — the approval chain does
 * not read this panel's data. It exists so Master Data can see, before they
 * act, which typed values the AI could not find in the uploaded documents.
 *
 * The verdict is asynchronous: VMS gets a 202 on submit and the result lands on
 * a webhook ~30 seconds later. So a freshly submitted ticket legitimately shows
 * "processing", and the panel polls for a short while rather than pretending the
 * absence of a result means failure.
 *
 * Presentation is deliberately text-and-icon rather than chip-heavy: a review
 * screen read top to bottom benefits from a stable colour vocabulary (status
 * colour = severity colour throughout) more than from pill-shaped tags, which
 * read as decoration once there are a dozen of them on the page.
 */

const POLL_INTERVAL_MS = 10000;
// ~4 minutes. The service quotes 25-40s and retries a failed webhook at 5s, 15s
// and 45s, so anything still missing past this is a delivery problem a reviewer
// should chase, not something more polling will fix.
const MAX_POLLS = 24;

const STATUS_META = {
  VALID: { color: "success", label: "Valid", icon: CheckCircleOutlineIcon },
  VALID_WITH_NOTES: { color: "success", label: "Valid with notes", icon: CheckCircleOutlineIcon },
  NEEDS_REVIEW: { color: "warning", label: "Needs Review", icon: ReportProblemOutlinedIcon },
  INVALID: { color: "error", label: "Invalid", icon: ErrorOutlineIcon },
};

const SEVERITY_COLOR = {
  CRITICAL: "error.darker",
  HIGH: "warning.darker",
  MEDIUM: "info.darker",
  LOW: "text.secondary",
};

const AGE_META = {
  OK: { color: "success.darker", label: "Within validity" },
  WARNING: { color: "warning.darker", label: "Ageing" },
  EXPIRED: { color: "error.darker", label: "Expired" },
  UNKNOWN: { color: "text.disabled", label: "Date unreadable" },
};

function scoreColor(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return "text.primary";
  if (score >= 90) return "success.darker";
  if (score >= 75) return "warning.darker";
  return "error.darker";
}

function formatDateTime(value) {
  if (!value) return "-";
  return moment(value).format("DD-MM-YYYY HH:mm");
}

/**
 * Formats one extracted_data value for display.
 *
 * The service does not guarantee flat values — a cross-referenced document is
 * nested under its own key, e.g. a Surat Pernyataan Rekening result carrying a
 * whole "Buku Tabungan" object. String() on that renders "[object Object]", so
 * anything non-primitive is serialised instead.
 */
function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Flattens extracted_data one level deep so a nested document reads as
 * "Buku Tabungan · nama_bank" rather than collapsing into one unreadable value.
 * Deeper nesting falls back to serialising, which stays legible and cannot throw.
 */
function flattenExtracted(data) {
  const out = [];
  for (const [key, value] of Object.entries(data || {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [childKey, childValue] of Object.entries(value)) {
        out.push([`${key} · ${childKey}`, formatValue(childValue)]);
      }
    } else {
      out.push([key, formatValue(value)]);
    }
  }
  return out;
}

/** Turns a field name like "nomor_npwp" into "Nomor npwp" — readable without a lookup table. */
function humanizeField(field) {
  const spaced = String(field || "").replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Compact status readout — coloured icon + label, used for both the overall and per-document verdict. */
function StatusText({ status, size = "body2" }) {
  const meta = STATUS_META[status];
  const Icon = meta?.icon || HelpOutlineIcon;
  const color = meta ? `${meta.color}.main` : "text.secondary";
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <Icon sx={{ fontSize: size === "body1" ? 18 : 15, color }} />
      <Typography variant={size} sx={{ color, fontWeight: 600, lineHeight: 1.2 }}>
        {meta?.label || status || "-"}
      </Typography>
    </Box>
  );
}

/** Document age readout — icon + label with the full detail on hover, no pill. */
function AgeIndicator({ ageCheck }) {
  if (!ageCheck?.status || ageCheck.status === "SKIP") return null;
  const meta = AGE_META[ageCheck.status];
  if (!meta) return null;
  return (
    <Tooltip title={ageCheck.message || ""} placement="top">
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.5, cursor: "default" }}>
        <AccessTimeIcon sx={{ fontSize: 13, color: meta.color }} />
        <Typography variant="caption" sx={{ color: meta.color }}>
          {meta.label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

/**
 * The service documents `discrepancy_summary` on the webhook but has never
 * actually sent it on any run received to date — so a naive stat strip built
 * from `latest.discrepancy_summary` reads 0 across the board even when the
 * verdict is INVALID. Derive the same shape from the two arrays the service
 * DOES send, rather than show a summary that looks authoritative and is just
 * empty:
 *
 *   - cross_doc_check.critical_inconsistencies — this array's existence IS
 *     has_critical_inconsistency, so its length is the critical count with
 *     no interpretation needed.
 *   - document_results[].discrepancies[] — per-document HIGH/MEDIUM/LOW notes.
 *     A cross-document finding is mirrored onto EVERY document it references
 *     (observed: the same "alamat" HIGH discrepancy, byte-identical text,
 *     attached to both NPWP and SPPKP) — summing this naively double-counts,
 *     so entries are deduped on (severity, field, description) first.
 *
 * The two sources are summed, not reconciled against each other: nothing
 * observed so far has appeared in both places at once, so there is nothing to
 * de-duplicate between them. If the service ever does send discrepancy_summary
 * directly, that is trusted over this derivation.
 */
function deriveDiscrepancySummary(latest) {
  const sent = latest?.discrepancy_summary;
  if (sent && (sent.total || sent.critical || sent.high || sent.medium || sent.low)) {
    return sent;
  }

  const seen = new Set();
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const doc of latest?.document_results || []) {
    for (const d of doc.discrepancies || []) {
      const key = `${d.severity}|${d.field}|${d.description}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const tier = String(d.severity || "").toLowerCase();
      if (tier in counts) counts[tier] += 1;
    }
  }
  counts.critical += latest?.cross_doc_check?.critical_inconsistencies?.length || 0;

  return {
    ...counts,
    total: counts.critical + counts.high + counts.medium + counts.low,
    derived: true,
  };
}

/** One number-and-label pair in the findings summary strip. Zero counts fade rather than compete for attention. */
function StatCell({ label, value, color, hint }) {
  const count = value ?? 0;
  return (
    <Box sx={{ minWidth: 60 }}>
      <Typography
        variant="h6"
        sx={{ color: count ? color : "text.disabled", fontWeight: 700, lineHeight: 1.2 }}
      >
        {count}
      </Typography>
      <Tooltip title={hint || ""} placement="top" disableHoverListener={!hint}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontSize: 10.5,
            cursor: hint ? "help" : "default",
            borderBottom: hint ? "1px dotted" : "none",
            borderColor: "text.disabled",
          }}
        >
          {label}
        </Typography>
      </Tooltip>
    </Box>
  );
}

/** Extracted document data as a proper label/value list rather than a wall of chips. */
function ExtractedData({ data }) {
  const entries = flattenExtracted(data);
  if (entries.length === 0) return null;
  return (
    <Box sx={{ mt: 1.25, pt: 1.25, borderTop: theme => `1px dashed ${theme.palette.divider}` }}>
      <Typography
        variant="overline"
        sx={{ color: "text.secondary", letterSpacing: 0.6, fontSize: 10.5, lineHeight: 1 }}
      >
        Extracted data
      </Typography>
      <Box
        sx={{
          mt: 0.75,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "max-content 1fr" },
          columnGap: 2.5,
          rowGap: 0.5,
        }}
      >
        {entries.map(([label, value]) => (
          <Fragment key={label}>
            <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: { sm: "nowrap" } }}>
              {label}
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
              {value}
            </Typography>
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}

/** One discrepancy line — a coloured severity label, not a filled pill, ahead of the field and its description. */
function DiscrepancyRow({ discrepancy }) {
  const color = SEVERITY_COLOR[discrepancy.severity] || "text.secondary";
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 66, flexShrink: 0, pt: "2px" }}>
        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color, fontWeight: 700, letterSpacing: 0.4 }}>
          {discrepancy.severity}
        </Typography>
      </Box>
      <Box>
        <Typography variant="body2" fontWeight={600}>
          {humanizeField(discrepancy.field)}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {discrepancy.description}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * One document's verdict as a self-contained card, not a table row.
 *
 * A table forces row-to-row separation to be the same hairline border used
 * for every internal division, so with variable-height content (a document
 * with eight findings and a dozen extracted fields sitting above one with
 * none) the boundary that actually matters — where document A ends and
 * document B begins — reads no stronger than the dashed line between a
 * document's own findings and its own extracted data. A bordered card with a
 * tinted header fixes that: the strongest line on the page is always the
 * document boundary, because it is the only place a background colour and a
 * border coincide.
 */
function DocumentCard({ doc }) {
  const discrepancies = doc.discrepancies || [];
  return (
    <Box sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          px: 2,
          py: 1.25,
          bgcolor: "background.neutral",
          borderBottom: theme => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>
            {doc.document_type}
          </Typography>
          <AgeIndicator ageCheck={doc.age_check} />
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="h6" sx={{ color: scoreColor(doc.score), fontWeight: 700, lineHeight: 1.1 }}>
            {doc.score === null || doc.score === undefined ? "-" : doc.score}
          </Typography>
          <StatusText status={doc.status} />
        </Box>
      </Box>

      <Box sx={{ px: 2, py: 1.75 }}>
        {discrepancies.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No mismatch found
          </Typography>
        ) : (
          <Stack spacing={1}>
            {discrepancies.map((d, idx) => (
              <DiscrepancyRow key={`${d.field}-${idx}`} discrepancy={d} />
            ))}
          </Stack>
        )}
        <ExtractedData data={doc.extracted_data} />
      </Box>
    </Box>
  );
}

export default function AiValidationPanel({ ven_id }) {
  const axiosPrivate = useAxiosPrivate();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [latest, setLatest] = useState(null);
  const pollCount = useRef(0);

  const fetchValidation = useCallback(
    async signal => {
      try {
        const { data } = await axiosPrivate.get(`/ai-validation/vendor/${ven_id}`, {
          withCredentials: true,
          signal,
        });
        setLatest(data?.data?.latest || null);
        setEnabled(data?.data?.enabled !== false);
        setError("");
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        console.error(err);
        setError(err?.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    },
    [axiosPrivate, ven_id]
  );

  useEffect(() => {
    if (!ven_id) return undefined;
    const controller = new AbortController();
    pollCount.current = 0;
    setLoading(true);
    fetchValidation(controller.signal);
    return () => controller.abort();
  }, [ven_id, fetchValidation]);

  // A run that was accepted (202) but has no verdict yet is the only state
  // worth polling for; every other state is terminal.
  const awaitingResult = latest?.submit_status === "PROCESSING" && !latest?.status;

  useEffect(() => {
    if (!awaitingResult) return undefined;
    if (pollCount.current >= MAX_POLLS) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      pollCount.current += 1;
      fetchValidation(controller.signal);
    }, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [awaitingResult, latest, fetchValidation]);

  const summary = deriveDiscrepancySummary(latest);

  const headerStatusNode = () => {
    if (!enabled)
      return (
        <Typography variant="body2" sx={{ color: "text.disabled" }}>
          Disabled
        </Typography>
      );
    if (loading) return <CircularProgress size={16} />;
    if (!latest)
      return (
        <Typography variant="body2" sx={{ color: "text.disabled" }}>
          Not run
        </Typography>
      );
    if (latest.submit_status === "SKIPPED")
      return (
        <Typography variant="body2" sx={{ color: "text.disabled" }}>
          Nothing to validate
        </Typography>
      );
    if (latest.submit_status === "REJECTED")
      return (
        <Typography variant="body2" sx={{ color: "error.darker", fontWeight: 600 }}>
          Submission rejected
        </Typography>
      );
    if (latest.submit_status === "ERROR")
      return (
        <Typography variant="body2" sx={{ color: "error.darker", fontWeight: 600 }}>
          Service error
        </Typography>
      );
    if (awaitingResult)
      return (
        <Typography variant="body2" sx={{ color: "info.darker" }}>
          Processing…
        </Typography>
      );
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <StatusText status={latest.status} />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {latest.overall_score ?? "-"}/100
        </Typography>
      </Box>
    );
  };

  return (
    <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)} TransitionProps={{ unmountOnExit: true }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
          <Typography>AI Document Validation</Typography>
          {headerStatusNode()}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!enabled && (
          <Alert severity="info">
            AI document validation is switched off in this environment.
          </Alert>
        )}

        {enabled && !loading && !latest && (
          <Alert severity="info">
            This registration has not been sent for AI validation. It runs automatically when the
            form is first submitted.
          </Alert>
        )}

        {enabled && latest?.submit_status === "SKIPPED" && (
          <Alert severity="warning">
            <AlertTitle>Nothing was validated</AlertTitle>
            {latest.submit_error || "No document of a type the validator understands was uploaded."}
          </Alert>
        )}

        {enabled && (latest?.submit_status === "REJECTED" || latest?.submit_status === "ERROR") && (
          <Alert severity="error">
            <AlertTitle>
              {latest.submit_status === "REJECTED"
                ? "The validator rejected the submission"
                : "The validator could not be reached"}
            </AlertTitle>
            <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
              {latest.submit_error}
            </Typography>
          </Alert>
        )}

        {enabled && awaitingResult && (
          <Box>
            <Alert
              severity="info"
              action={
                <IconButton size="small" onClick={() => fetchValidation()}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              }
            >
              Submitted {formatDateTime(latest.created_at)} with {latest.documents_sent} document(s).
              The verdict usually arrives within 40 seconds.
            </Alert>
            <LinearProgress sx={{ mt: 1 }} />
          </Box>
        )}

        {enabled && latest?.status && (
          <Box>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ md: "center" }}
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Stack direction="row" spacing={2.5} alignItems="baseline">
                <Typography
                  variant="h4"
                  sx={{ color: scoreColor(Number(latest.overall_score)), fontWeight: 700, lineHeight: 1 }}
                >
                  {latest.overall_score ?? "-"}
                  <Typography component="span" variant="body2" sx={{ color: "text.secondary", fontWeight: 400, ml: 0.5 }}>
                    / 100
                  </Typography>
                </Typography>
                <Box>
                  <StatusText status={latest.status} size="body1" />
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
                    Recommendation:{" "}
                    <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
                      {latest.recommendation || "-"}
                    </Box>
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Checked {formatDateTime(latest.processed_at || latest.result_received_at)}
                  {latest.result_metadata?.ai_model ? ` · ${latest.result_metadata.ai_model}` : ""}
                </Typography>
                <Tooltip title="Reload">
                  <IconButton size="small" onClick={() => fetchValidation()}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            <Alert severity="info" sx={{ mb: 2 }}>
              Advisory only — this result does not approve, reject, or hold the ticket. Treat a
              CRITICAL finding as a reason to check the document yourself, not as a verdict.
            </Alert>

            {latest.cross_doc_check && (
              <Alert
                severity={latest.cross_doc_check.has_critical_inconsistency ? "error" : "success"}
                sx={{ mb: latest.cross_doc_check.critical_inconsistencies?.length ? 1 : 2 }}
              >
                <AlertTitle>Cross-document check</AlertTitle>
                {latest.cross_doc_check.summary}
              </Alert>
            )}

            {/* The service never lists these anywhere else — a critical
                cross-document mismatch (e.g. a bank account held by a
                different company than the applicant) does not appear in any
                individual document's own discrepancy list, only here. */}
            {latest.cross_doc_check?.critical_inconsistencies?.length > 0 && (
              <Stack spacing={1} sx={{ mb: 2, pl: 1 }}>
                {latest.cross_doc_check.critical_inconsistencies.map((ci, idx) => (
                  <DiscrepancyRow
                    key={`${ci.field}-${idx}`}
                    discrepancy={{ severity: "CRITICAL", field: ci.field, description: ci.description }}
                  />
                ))}
              </Stack>
            )}

            <Stack direction="row" spacing={3.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <StatCell
                label="Findings"
                value={summary.total}
                color="text.primary"
                hint={summary.derived ? "Counted from the findings shown below — the service did not report a total for this run." : undefined}
              />
              <StatCell label="Critical" value={summary.critical} color="error.darker" />
              <StatCell label="High" value={summary.high} color="warning.darker" />
              <StatCell label="Medium" value={summary.medium} color="info.darker" />
              <StatCell label="Low" value={summary.low} color="text.secondary" />
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Typography
              variant="overline"
              sx={{ color: "text.secondary", letterSpacing: 0.6, fontSize: 10.5, display: "block", mb: 1 }}
            >
              Documents
            </Typography>
            <Stack spacing={1.5}>
              {(latest.document_results || []).map((doc, idx) => (
                <DocumentCard key={`${doc.document_type}-${idx}`} doc={doc} />
              ))}
            </Stack>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
