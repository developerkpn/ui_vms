import { KeyboardArrowDown } from "@mui/icons-material";
import { Chip } from "@mui/material";

export default function TicketTypeBadge({ value }) {
  return (
    <Chip
      label={value || "Create"}
      size="small"
      deleteIcon={<KeyboardArrowDown />}
      onDelete={() => {}}
      sx={{
        minWidth: 112,
        justifyContent: "space-between",
        borderRadius: "8px",
        bgcolor: "#8d8f91",
        color: "common.white",
        fontWeight: 800,
        "& .MuiChip-deleteIcon": {
          color: "common.white",
          fontSize: 20,
        },
      }}
    />
  );
}
