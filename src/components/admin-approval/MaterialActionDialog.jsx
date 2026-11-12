import { Dialog } from "@mui/material";

export function materialReasonFieldProps(action) {
  const isRework = String(action).toUpperCase() === "REWORK";
  return { minRows: isRework ? 10 : 7, maxRows: isRework ? 20 : 14 };
}

// Single, whole-batch and per-item actions share the same window dimensions.
// Keep the footer visible and scroll the content when a batch or email is long.
export default function MaterialActionDialog({ action, children, ...props }) {
  const isLarge = ["REWORK", "REJECT", "APPROVE"].includes(String(action).toUpperCase());

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
          height: isLarge ? 720 : 560,
          maxHeight: { xs: "calc(100dvh - 24px)", sm: "calc(100dvh - 48px)" },
        },
      }}
    >
      {children}
    </Dialog>
  );
}
