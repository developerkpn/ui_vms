import { Search } from "@mui/icons-material";
import { InputAdornment, TextField } from "@mui/material";

/**
 * Styled search TextField used across Material pages for simple
 * keyword filtering. Does NOT include debounce logic — that stays
 * at the page level (caller manages value / onChange / debounce).
 *
 * Props:
 *  - value:              controlled text value
 *  - onChange:           (event) => void
 *  - placeholder?:       placeholder string
 *  - endAdornmentIcon?:  icon ReactNode (default Search)
 *  - sx?:                additional MUI sx overrides
 */
export default function PageSearchField({
  value,
  onChange,
  placeholder = "Search ...",
  endAdornmentIcon,
  sx,
}) {
  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            {endAdornmentIcon ?? <Search sx={{ color: "text.secondary" }} />}
          </InputAdornment>
        ),
      }}
      sx={{
        flex: { xs: "1 1 100%", md: "1 1 auto" },
        minWidth: { md: 280 },
        bgcolor: "background.paper",
        "& .MuiOutlinedInput-root": {
          minHeight: 50,
          borderRadius: "7px",
          fontSize: "0.95rem",
          color: "text.primary",
        },
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: "#d7dde6",
        },
        "& .MuiInputBase-input::placeholder": {
          color: "text.secondary",
          opacity: 0.85,
        },
        ...sx,
      }}
    />
  );
}
