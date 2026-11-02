import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, Card, CardActionArea, Paper, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function PageSectionCard({ title, description, to, Icon }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px",
        height: "100%",
        transition: "border-color 120ms ease, box-shadow 120ms ease",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
        },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={to}
        sx={{ height: "100%", p: 3, display: "block" }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: "10px",
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            <Icon />
          </Paper>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
              <ChevronRightIcon fontSize="small" sx={{ color: "text.secondary" }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}
