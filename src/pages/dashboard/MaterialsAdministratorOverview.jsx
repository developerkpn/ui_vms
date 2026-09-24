import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { Box, Card, CardActionArea, Paper, Typography } from "@mui/material";
import PageHeader from "src/components/common/PageHeader";
import { Link as RouterLink } from "react-router-dom";

// Everything the Administrator menu entry leads to. Both tools sit behind the
// same "Administrator" page permission, so anyone who can open this overview can
// open either card — no per-card permission check is needed here.
const ADMINISTRATOR_SECTIONS = [
  {
    key: "approvers",
    title: "User Approver Management",
    description:
      "Assign and reorder the approver chain that each material requester's requests follow.",
    to: "/dashboard/materials/administrator/approvers",
    Icon: ManageAccountsIcon,
  },
  {
    key: "guide",
    title: "Guide Upload",
    description: "Upload and manage the guide documents shown to material users.",
    to: "/dashboard/materials/administrator/guide",
    Icon: MenuBookIcon,
  },
];

function SectionCard({ title, description, to, Icon }) {
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

export default function MaterialsAdministratorOverview() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pb: { xs: 4, md: 6 } }}>
      <PageHeader
        title="Material Administrator"
        subtitle="Choose the administration tool you want to open"
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 3,
        }}
      >
        {ADMINISTRATOR_SECTIONS.map(({ key, ...section }) => (
          <SectionCard key={key} {...section} />
        ))}
      </Box>
    </Box>
  );
}
