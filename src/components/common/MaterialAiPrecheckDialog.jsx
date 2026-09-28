import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Radio,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { SimilarityCell } from "src/components/common/MaterialAiMatchPanel";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import {
  AI_MATCH_STATUS,
  AI_PRECHECK_MASS_MIN_NEW_LINES,
  AI_PRECHECK_NEW,
  AI_PRECHECK_PATH,
  buildMassPrecheckReview,
  buildPrecheckReview,
  describeMatchType,
  initialPrecheckChoice,
  normalizePrecheckLine,
  precheckNeedsChoice,
  summarizePrecheck,
} from "src/helper/materialAiMatch.js";

/**
 * The pre-save "does this material already exist?" step.
 *
 * Opens after the requester has filled the form and the comment/reason, and
 * before anything is written. Every line is ranked against the existing
 * materials; the requester either picks the existing one (that line is not
 * submitted — and if nothing is left, nothing is saved at all) or confirms the
 * line is a brand new material.
 *
 * Never a gate on the AI itself: with the feature switched off it hands
 * straight back to the save, and when the recommender is down it says so and
 * lets the requester submit anyway.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {"single"|"mass"} props.kind
 * @param {Array<{key: string|number, label: string, body: object}>} props.requests -
 *   One preview call per line; body is what AI_PRECHECK_PATH takes.
 * @param {boolean} props.submitting - The parent's save is in flight.
 * @param {string} [props.submitError] - The parent's save failed with this.
 * @param {() => void} props.onCancel - Back to the form, nothing saved.
 * @param {(result: {newKeys: Array, review: object|null}) => void} props.onSubmit -
 *   Save these lines, with this confirmation (null when there is none to send).
 */

const PHASE = Object.freeze({
  CHECKING: "checking",
  REVIEW: "review",
  UNAVAILABLE: "unavailable",
  DONE: "done",
});

const HEAD_CELL_SX = {
  fontWeight: 700,
  border: "1px solid #e0e0e0",
  py: 1,
  whiteSpace: "nowrap",
};
const BODY_CELL_SX = { border: "1px solid #e0e0e0" };

function PrecheckLine({ line, label, choice, onChoose, disabled }) {
  return (
    <Box>
      {label && (
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
          {label}
        </Typography>
      )}

      {line.status === AI_MATCH_STATUS.FAILED && (
        <Alert severity="warning">
          Pengecekan gagal untuk baris ini ({line.error || "tidak diketahui"}) — dianggap material
          baru.
        </Alert>
      )}

      {line.status === AI_MATCH_STATUS.DONE && !precheckNeedsChoice(line) && (
        <Typography variant="body2" color="text.secondary">
          Tidak ada material serupa ditemukan — dianggap material baru.
        </Typography>
      )}

      {precheckNeedsChoice(line) && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" sx={{ borderCollapse: "collapse" }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f7f9" }}>
                <TableCell padding="checkbox" sx={HEAD_CELL_SX} />
                <TableCell sx={HEAD_CELL_SX}>Material Code</TableCell>
                <TableCell sx={HEAD_CELL_SX}>Material Name</TableCell>
                <TableCell sx={HEAD_CELL_SX}>Similarity</TableCell>
                <TableCell sx={HEAD_CELL_SX}>Match Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {line.recommendations.map(item => (
                <TableRow
                  key={`${line.key}-${item.rank}`}
                  hover
                  selected={choice === item.code}
                  onClick={() => !disabled && onChoose(item.code)}
                  sx={{ cursor: disabled ? "default" : "pointer" }}
                >
                  <TableCell padding="checkbox" sx={BODY_CELL_SX}>
                    <Radio
                      size="small"
                      checked={choice === item.code}
                      disabled={disabled}
                      inputProps={{ "aria-label": `Pilih ${item.code}` }}
                    />
                  </TableCell>
                  <TableCell sx={{ ...BODY_CELL_SX, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {item.code || "-"}
                  </TableCell>
                  <TableCell sx={BODY_CELL_SX}>{item.name || "-"}</TableCell>
                  <TableCell sx={BODY_CELL_SX}>
                    <SimilarityCell similarity={item.similarity} />
                  </TableCell>
                  <TableCell sx={BODY_CELL_SX}>{describeMatchType(item.matchType)}</TableCell>
                </TableRow>
              ))}
              <TableRow
                hover
                selected={choice === AI_PRECHECK_NEW}
                onClick={() => !disabled && onChoose(AI_PRECHECK_NEW)}
                sx={{ cursor: disabled ? "default" : "pointer" }}
              >
                <TableCell padding="checkbox" sx={BODY_CELL_SX}>
                  <Radio
                    size="small"
                    checked={choice === AI_PRECHECK_NEW}
                    disabled={disabled}
                    inputProps={{ "aria-label": "Material baru" }}
                  />
                </TableCell>
                <TableCell colSpan={4} sx={{ ...BODY_CELL_SX, fontWeight: 700 }}>
                  Bukan salah satu di atas — ini material baru
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default function MaterialAiPrecheckDialog({
  open,
  kind,
  requests,
  submitting,
  submitError,
  onCancel,
  onSubmit,
}) {
  const axiosPrivate = useAxiosPrivate();
  const [phase, setPhase] = useState(PHASE.CHECKING);
  const [lines, setLines] = useState([]);
  const [choices, setChoices] = useState({});
  const [progress, setProgress] = useState(0);
  // Each opening is one run; a result arriving for an earlier run (the dialog
  // was closed and reopened mid-check) is dropped.
  const runRef = useRef(0);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const labelByKey = useMemo(
    () => new Map((requests || []).map(request => [request.key, request.label])),
    [requests]
  );

  useEffect(() => {
    if (!open) {
      runRef.current += 1;
      return;
    }

    const run = runRef.current + 1;
    runRef.current = run;
    const list = Array.isArray(requests) ? requests : [];
    setPhase(PHASE.CHECKING);
    setLines([]);
    setChoices({});
    setProgress(0);

    (async () => {
      const collected = [];
      for (const request of list) {
        let line;
        try {
          const { data } = await axiosPrivate.post(AI_PRECHECK_PATH, request.body);
          if (runRef.current !== run) return;
          if (data?.enabled === false) {
            // Feature off: submit exactly as the form always did.
            onSubmitRef.current({ newKeys: list.map(item => item.key), review: null });
            return;
          }
          line = normalizePrecheckLine({ ...(data?.data?.[0] || {}), key: request.key });
        } catch (error) {
          if (runRef.current !== run) return;
          console.error("AI pre-save check failed", error);
          line = normalizePrecheckLine({
            key: request.key,
            status: AI_MATCH_STATUS.FAILED,
            error: "layanan AI tidak dapat dihubungi",
          });
        }
        collected.push(line);
        setProgress(collected.length);
      }
      if (runRef.current !== run) return;

      setLines(collected);
      setChoices(Object.fromEntries(collected.map(line => [line.key, initialPrecheckChoice(line)])));
      setPhase(
        collected.every(line => line.status === AI_MATCH_STATUS.FAILED)
          ? PHASE.UNAVAILABLE
          : PHASE.REVIEW
      );
    })();
  }, [open, requests, axiosPrivate]);

  const summary = useMemo(() => summarizePrecheck(lines, choices), [lines, choices]);
  const isMass = kind === "mass";
  const tooFewForMass =
    isMass &&
    summary.newKeys.length > 0 &&
    summary.newKeys.length < AI_PRECHECK_MASS_MIN_NEW_LINES;
  const nothingNew = summary.allDecided && summary.newKeys.length === 0;

  const handleConfirm = () => {
    if (nothingNew) {
      setPhase(PHASE.DONE);
      return;
    }
    const review = isMass
      ? buildMassPrecheckReview(lines, summary.newKeys)
      : buildPrecheckReview(lines.find(line => line.key === summary.newKeys[0]));
    onSubmit({ newKeys: summary.newKeys, review });
  };

  const handleSubmitUnchecked = () => {
    onSubmit({ newKeys: (requests || []).map(request => request.key), review: null });
  };

  const confirmLabel = () => {
    if (submitting) return "Saving...";
    if (nothingNew) return isMass ? "Selesai" : "Gunakan material ini";
    if (isMass) return `Submit ${summary.newKeys.length} material baru`;
    return "Submit sebagai material baru";
  };

  const body = () => {
    if (phase === PHASE.CHECKING) {
      const total = (requests || []).length;
      return (
        <Box>
          <LinearProgress
            variant={total > 1 ? "determinate" : "indeterminate"}
            value={total > 1 ? (progress / total) * 100 : undefined}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Mencari material serupa yang sudah ada
            {total > 1 ? ` (${progress}/${total})` : ""}…
          </Typography>
        </Box>
      );
    }

    if (phase === PHASE.UNAVAILABLE) {
      return (
        <Alert severity="warning">
          Pengecekan material serupa sedang tidak tersedia. Request tetap bisa disubmit.
        </Alert>
      );
    }

    if (phase === PHASE.DONE) {
      return (
        <Stack spacing={1.5}>
          <Alert severity="success">
            Material sudah ada, jadi request tidak disimpan. Gunakan kode berikut:
          </Alert>
          {summary.existing.map(item => (
            <Typography key={item.key} variant="body2">
              {isMass && `${labelByKey.get(item.key)}: `}
              <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                {item.code}
              </Box>{" "}
              — {item.name}
            </Typography>
          ))}
        </Stack>
      );
    }

    return (
      <Stack spacing={2.5}>
        <Typography variant="body2" color="text.secondary">
          Sebelum disimpan, cek apakah material ini sudah ada. Pilih material yang sesuai bila
          ada — request untuk baris itu tidak akan disimpan — atau pilih &quot;ini material
          baru&quot;.
        </Typography>
        {lines.map(line => (
          <PrecheckLine
            key={line.key}
            line={line}
            label={isMass ? labelByKey.get(line.key) : ""}
            choice={choices[line.key] || ""}
            onChoose={value => setChoices(prev => ({ ...prev, [line.key]: value }))}
            disabled={submitting}
          />
        ))}

        {isMass && summary.existing.length > 0 && summary.newKeys.length > 0 && (
          <Alert severity="info">
            Baris berikut tidak akan disubmit karena materialnya sudah ada:{" "}
            {summary.existing
              .map(item => `${labelByKey.get(item.key)} → ${item.code}`)
              .join(", ")}
            .
          </Alert>
        )}
        {tooFewForMass && (
          <Alert severity="warning">
            Mass request butuh minimal {AI_PRECHECK_MASS_MIN_NEW_LINES} material baru. Tinggal{" "}
            {summary.newKeys.length} — tambahkan baris lain, atau ajukan lewat Single Request.
          </Alert>
        )}
        {submitError && (
          <Typography variant="caption" color="error">
            {submitError}
          </Typography>
        )}
      </Stack>
    );
  };

  const actions = () => {
    if (phase === PHASE.DONE) {
      return (
        <Button variant="contained" onClick={onCancel}>
          Tutup
        </Button>
      );
    }
    if (phase === PHASE.UNAVAILABLE) {
      return (
        <>
          <Button onClick={onCancel} disabled={submitting}>
            Kembali
          </Button>
          <Button variant="contained" onClick={handleSubmitUnchecked} disabled={submitting}>
            {submitting ? "Saving..." : "Submit"}
          </Button>
        </>
      );
    }
    return (
      <>
        <Button onClick={onCancel} disabled={submitting}>
          Kembali
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={
            phase !== PHASE.REVIEW || submitting || !summary.allDecided || tooFewForMass
          }
        >
          {confirmLabel()}
        </Button>
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        onCancel();
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Cek Material Serupa</DialogTitle>
      <DialogContent>
        {body()}
        {phase === PHASE.UNAVAILABLE && submitError && (
          <Typography variant="caption" color="error" sx={{ display: "block", mt: 2 }}>
            {submitError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>{actions()}</DialogActions>
    </Dialog>
  );
}
