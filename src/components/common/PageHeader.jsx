import { Box, Typography } from "@mui/material";

/**
 * Consistent page header used across all Material menu pages.
 *
 * Props:
 *  - title:     page title string
 *  - subtitle?: optional description string
 *  - actions?:  optional ReactNode rendered to the right on desktop,
 *               stacked below on mobile
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", md: "row" },
        gap: 2,
        mb: 4,
      }}
    >
      <Box>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.5px" }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: 1,
            width: { xs: "100%", md: "auto" },
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  );
}
