import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import { Box } from "@mui/material";
import PageHeader from "src/components/common/PageHeader";
import PageSectionCard from "src/components/common/PageSectionCard";
import { MATERIAL_SLA_REPORT_PATH } from "src/helper/materialMenu";

export default function MaterialsReport() {
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, pb: { xs: 4, md: 6 } }}
    >
      <PageHeader title="Report" subtitle="Choose the report you want to open" />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 3,
        }}
      >
        <PageSectionCard
          title="SLA Report"
          description="Review material request response times and ticket journeys. Export the SLA report to Excel."
          to={MATERIAL_SLA_REPORT_PATH}
          Icon={AssessmentOutlinedIcon}
        />
      </Box>
    </Box>
  );
}
