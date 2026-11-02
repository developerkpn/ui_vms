import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import MaterialSlaReport from "src/components/material-dashboard/MaterialSlaReport";
import { MATERIAL_REPORT_PATH } from "src/helper/materialMenu";

export default function MaterialsSlaReport() {
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, pb: { xs: 4, md: 6 } }}
    >
      <Button
        component={RouterLink}
        to={MATERIAL_REPORT_PATH}
        startIcon={<ArrowBackIcon />}
        size="small"
        sx={{
          alignSelf: "flex-start",
          textTransform: "none",
          fontWeight: 600,
          color: "text.secondary",
          mb: -1,
        }}
      >
        Report
      </Button>
      <MaterialSlaReport />
    </Box>
  );
}
