import { Dialog } from "@mui/material";

export function materialReasonFieldProps(action) {
  const isRework = String(action).toUpperCase() === "REWORK";
  return { minRows: isRework ? 10 : 7, maxRows: isRework ? 20 : 14 };
}

// The action dialogs have a fixed height, so a reason box sized by its rows
// leaves an empty gap above the buttons. Put the first sx on the DialogContent
// holding the reason field and the second on the TextField: the box then grows
// into whatever height is left, never below its minRows. Everything else in
// the content keeps its natural height, so long rework forms still scroll.
export const materialReasonContentSx = {
  display: "flex",
  flexDirection: "column",
  "& > *": { flexShrink: 0 },
};

export const materialReasonFillSx = {
  flex: "1 0 auto",
  "& .MuiInputBase-root": {
    flex: "1 0 auto",
    flexDirection: "column",
    alignItems: "stretch",
  },
  "& .MuiInputBase-inputMultiline": { flex: "1 0 auto" },
};

// Single, whole-batch and per-item actions share the same window dimensions.
// Keep the footer visible and scroll the content when a batch or email is long.
// `compact` keeps the old content-sized window (single-request Approve).
export default function MaterialActionDialog({ action, compact = false, children, ...props }) {
  const isLarge =
    !compact && ["REWORK", "REJECT", "APPROVE"].includes(String(action).toUpperCase());

  return (
    <Dialog
      {...props}
      fullWidth
      maxWidth={false}
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 2,
          m: { xs: 1.5, sm: 3 },
          width: { xs: "calc(100% - 24px)", sm: "calc(100% - 48px)" },
          maxWidth: isLarge ? 840 : 680,
          height: compact ? "auto" : isLarge ? 720 : 560,
          maxHeight: { xs: "calc(100dvh - 24px)", sm: "calc(100dvh - 48px)" },
        },
      }}
    >
      {children}
    </Dialog>
  );
}
