import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export const MATERIAL_ADMINISTRATOR_PATH = "/dashboard/materials/administrator";

/**
 * Back to the Material Administrator overview.
 *
 * The sidebar's Administrator entry points at the overview, so a sub-page has no
 * menu item of its own to return to. This is the way back.
 */
export default function AdministratorBackLink({ label = "Administrator" }) {
  return (
    <Button
      component={RouterLink}
      to={MATERIAL_ADMINISTRATOR_PATH}
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
      {label}
    </Button>
  );
}
