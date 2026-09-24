import { Replay } from "@mui/icons-material";
import {
  Alert,
  Box,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SectionLoadingSkeleton from "src/components/common/SectionLoadingSkeleton";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import {
  AI_MATCH_POLL_INTERVAL_MS,
  AI_MATCH_STATUS,
  buildAiMatchPath,
  buildAiMatchRerunPath,
  describeMatchType,
  formatSimilarityPercent,
  normalizeAiMatchList,
  shouldKeepPolling,
  similarityTone,
} from "src/helper/materialAiMatch.js";

/**
 * Read-only ranking of the catalogued materials that look like the one this
 * request asks for, one block per material line.
 *
 * ADVISORY. Nothing here approves, rejects or blocks — no approval rule reads
 * this data. It exists so an approver can see, before a new material number is
 * created, that something very close to it already exists.
 *
 * The ranking is asynchronous: the request is saved first and the AI run is
 * queued after, so a request opened seconds after submit legitimately shows
 * "processing". The panel polls for a short while rather than reporting an
 * unfinished run as an empty one, and offers a re-run for the case where the
 * recommender was down when the request landed.
 *
 * Renders nothing at all — no header, no placeholder — when the feature is off
 * server-side, so an environment without the AI service looks exactly as it did
 * before.
 */

// The run is queued, not performed, by the re-run call: read back one beat
// later so the first poll sees PENDING rather than the previous verdict.
const RERUN_REFETCH_DELAY_MS = 1000;

const TONE_COLOR = {
  success: "success.darker",
  warning: "warning.darker",
  neutral: "text.secondary",
};

// Same grid as the mass items table two sections up, so the two read as one
// document rather than as two components that happened to land together.
const HEAD_CELL_SX = {
  fontWeight: 700,
  border: "1px solid #e0e0e0",
  py: 1,
  whiteSpace: "nowrap",
};

const BODY_CELL_SX = { border: "1px solid #e0e0e0" };

/** The similarity column: the number, and the same number as a bar under it. */
function SimilarityCell({ similarity }) {
  const tone = similarityTone(similarity);

  return (
    <Box sx={{ minWidth: 92 }}>
      <Typography variant="body2" sx={{ fontWeight: 700, color: TONE_COLOR[tone] }}>
        {formatSimilarityPercent(similarity)}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={(similarity ?? 0) * 100}
        color={tone === "neutral" ? "inherit" : tone}
        sx={{
          mt: 0.5,
          height: 6,
          borderRadius: 999,
          // "inherit" paints the bar in the current text colour, which is the
          // only way to give the neutral tone a grey that is not a palette.
          ...(tone === "neutral" ? { color: "grey.400" } : null),
        }}
      />
    </Box>
  );
}

/**
 * One material line's result. Which of the four states it draws is the run's
 * status, not the presence of data: a pending run and a run that genuinely
 * found nothing say very different things to an approver.
 */
function MaterialAiMatchRow({ row, showItemTitle }) {
  return (
    <Box>
      {showItemTitle && (
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
          Item {row.itemNo} — {row.query.name || "-"}
        </Typography>
      )}

      {row.status === AI_MATCH_STATUS.PENDING && (
        <Box>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            AI sedang memproses…
          </Typography>
        </Box>
      )}

      {row.status === AI_MATCH_STATUS.FAILED && (
        <Alert severity="warning">AI match gagal: {row.error}</Alert>
      )}

      {row.status === AI_MATCH_STATUS.DONE && (
        <Box>
          {row.recommendations.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              Tidak ada material serupa ditemukan.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" sx={{ borderCollapse: "collapse" }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f5f7f9" }}>
                    <TableCell align="center" sx={{ ...HEAD_CELL_SX, width: 40 }}>
                      #
                    </TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Material Code</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Material Name</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Similarity</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>Match Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.recommendations.map(recommendation => (
                    <TableRow key={`${row.id}-${recommendation.rank}`}>
                      <TableCell align="center" sx={BODY_CELL_SX}>
                        {recommendation.rank}
                      </TableCell>
                      <TableCell
                        sx={{ ...BODY_CELL_SX, fontFamily: "monospace", whiteSpace: "nowrap" }}
                      >
                        {recommendation.code || "-"}
                      </TableCell>
                      <TableCell sx={BODY_CELL_SX}>{recommendation.name || "-"}</TableCell>
                      <TableCell sx={BODY_CELL_SX}>
                        <SimilarityCell similarity={recommendation.similarity} />
                      </TableCell>
                      <TableCell sx={BODY_CELL_SX}>
                        {describeMatchType(recommendation.matchType)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* What the recommender understood the request to be. Worth showing:
              a ranking that looks wrong is usually a typo or a category the
              model read differently, and these three lines say which. */}
          {row.typoCorrected && row.correctedName && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
              Koreksi typo: {row.query.name} → {row.correctedName}
            </Typography>
          )}
          {row.entities.category.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Kategori terdeteksi: {row.entities.category.join(", ")}
            </Typography>
          )}
          {row.entities.specs.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Spesifikasi terdeteksi: {row.entities.specs.join(", ")}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

/**
 * @param {object} props
 * @param {"single"|"mass"} props.kind - Which request table the id belongs to.
 * @param {string|number} props.requestId - Single request id, or mass batch id.
 * @param {boolean} [props.open] - False keeps the section unmounted and unfetched.
 * @param {boolean} [props.hideRerun] - True drops the re-run button: the
 *   requester flows show the same ranking read-only, and queueing a fresh run
 *   stays an approver/Master Data action.
 */
export default function MaterialAiMatchPanel({
  kind,
  requestId,
  open = true,
  hideRerun = false,
}) {
  const axiosPrivate = useAxiosPrivate();
  const [rows, setRows] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [disabledNotice, setDisabledNotice] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  // Bumped after every settled read, so the poll effect re-evaluates even when
  // the read brought back nothing new — or nothing at all.
  const [readTick, setReadTick] = useState(0);
  const pollCount = useRef(0);
  const rerunTimer = useRef(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      clearTimeout(rerunTimer.current);
    };
  }, []);

  const fetchMatch = useCallback(
    async signal => {
      try {
        const { data } = await axiosPrivate.get(buildAiMatchPath(kind, requestId), { signal });
        if (!alive.current) return;

        const featureOn = data?.enabled !== false;
        setEnabled(featureOn);
        setRows(featureOn ? normalizeAiMatchList(data?.data) : []);
        setFailed(false);
      } catch (error) {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        console.error("Failed to load AI material match", error);
        if (alive.current) setFailed(true);
      } finally {
        if (alive.current) {
          setLoading(false);
          setReadTick(tick => tick + 1);
        }
      }
    },
    [axiosPrivate, kind, requestId]
  );

  useEffect(() => {
    if (!open || !requestId) return undefined;

    const controller = new AbortController();
    pollCount.current = 0;
    setLoading(true);
    setFailed(false);
    setDisabledNotice(false);
    fetchMatch(controller.signal);

    return () => controller.abort();
  }, [open, requestId, fetchMatch]);

  // pollCount lives in a ref rather than in state on purpose: a re-render
  // between the timer firing and the read landing would tear this effect down
  // and abort the read it just started.
  useEffect(() => {
    if (!open || !requestId || !enabled) return undefined;
    if (!shouldKeepPolling(rows, pollCount.current)) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      pollCount.current += 1;
      fetchMatch(controller.signal);
    }, AI_MATCH_POLL_INTERVAL_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, requestId, enabled, rows, readTick, fetchMatch]);

  const handleRerun = useCallback(async () => {
    setRerunning(true);
    setDisabledNotice(false);

    try {
      await axiosPrivate.post(buildAiMatchRerunPath(kind, requestId));
      if (!alive.current) return;

      pollCount.current = 0;
      clearTimeout(rerunTimer.current);
      rerunTimer.current = setTimeout(() => {
        if (alive.current) fetchMatch();
      }, RERUN_REFETCH_DELAY_MS);
    } catch (error) {
      if (!alive.current) return;
      // 409 is the backend saying the feature is switched off — a fact about
      // the environment, not a failure worth an alert.
      if (error?.response?.status === 409) {
        setDisabledNotice(true);
      } else {
        console.error("Failed to queue AI material match", error);
        setFailed(true);
      }
    } finally {
      if (alive.current) setRerunning(false);
    }
  }, [axiosPrivate, kind, requestId, fetchMatch]);

  const visibleRows = useMemo(
    () => [...rows].sort((left, right) => (left.itemNo ?? 0) - (right.itemNo ?? 0)),
    [rows]
  );

  const pending = visibleRows.some(row => row.status === AI_MATCH_STATUS.PENDING);

  if (!open || !requestId || !enabled) return null;

  const body = () => {
    if (loading) return <SectionLoadingSkeleton />;
    if (failed) return <Alert severity="warning">Gagal memuat hasil AI match.</Alert>;
    if (visibleRows.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          Belum ada hasil AI untuk request ini.
        </Typography>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {visibleRows.map(row => (
          <MaterialAiMatchRow
            key={row.id ?? `${row.requestId}-${row.itemNo}`}
            row={row}
            showItemTitle={kind === "mass"}
          />
        ))}
      </Box>
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box>
          {/* Same pill as every other section heading in these dialogs. */}
          <Box
            sx={{
              display: "inline-flex",
              px: 1.5,
              py: 0.4,
              mb: 2,
              borderRadius: 999,
              bgcolor: "#34a853",
              color: "common.white",
              fontWeight: 800,
              fontSize: "0.78rem",
            }}
          >
            AI Material Match
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Perkiraan kecocokan dengan material yang sudah ada. Hanya referensi — keputusan tetap
            di approver.
          </Typography>
        </Box>
        {!hideRerun && (
          <Tooltip title="Jalankan ulang AI match">
            <span>
              <IconButton size="small" onClick={handleRerun} disabled={rerunning || pending}>
                <Replay fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {disabledNotice && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          AI material match tidak aktif.
        </Typography>
      )}

      {body()}
    </Box>
  );
}
