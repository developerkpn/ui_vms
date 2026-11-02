import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { Box } from "@mui/material";
import PageHeader from "src/components/common/PageHeader";
import PageSectionCard from "src/components/common/PageSectionCard";

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
          <PageSectionCard key={key} {...section} />
        ))}
      </Box>
    </Box>
  );
}
