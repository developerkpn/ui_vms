import { Autocomplete, TextField, Box, Typography, InputAdornment, IconButton, CircularProgress } from "@mui/material";
import { Search, Close } from "@mui/icons-material";
import { useState, useCallback, useMemo } from "react";
import { debounce } from "lodash";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

export default function SearchSuggestionField({ 
  onSearch, 
  placeholder, 
  apiEndpoint = "/material/suggestions",
  ...props
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const axiosPrivate = useAxiosPrivate();

  const fetchSuggestions = useMemo(() => 
    debounce(async (term) => {
      if (!term || term.length < 2) {
        setOptions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await axiosPrivate.get(`${apiEndpoint}?limit=10&q=${encodeURIComponent(term)}`);
        setOptions(response.data.data || []);
      } catch (err) {
        console.error("Suggestion fetch failed", err);
      } finally {
        setLoading(false);
      }
    }, 300),
    [axiosPrivate, apiEndpoint]
  );

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <b key={i} style={{ color: "#1976d2" }}>{part}</b>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <Autocomplete
      {...props}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      inputValue={inputValue}
      filterOptions={(x) => x}
      loading={loading}
      loadingText={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, px: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="textSecondary">Searching materials...</Typography>
        </Box>
      }
      noOptionsText={
        <Typography variant="body2" color="textSecondary" sx={{ py: 1, px: 2 }}>
          Material not found
        </Typography>
      }
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
        fetchSuggestions(newInputValue);
      }}
      onChange={(event, newValue) => {
        if (newValue) {
          // If code exists use it, otherwise name
          onSearch(newValue.code || newValue.name);
        }
      }}
      options={options}
      getOptionLabel={(option) => option.combined_description || option.name || ""}
      ListboxProps={{
        sx: {
          "& .MuiAutocomplete-listbox": {
            padding: 0,
          },
        },
      }}
      PaperComponent={({ children }) => (
        <Box sx={{ boxShadow: 3, borderRadius: "12px", overflow: "hidden", backgroundColor: "background.paper" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              py: 1.5,
              px: 2,
              backgroundColor: "action.hover",
              borderBottom: "1px solid",
              borderColor: "divider",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, width: "100px", color: "text.secondary" }}>
              CODE
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, flex: 1, px: 2, color: "text.secondary" }}>
              DESCRIPTION
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, width: "40px", textAlign: "right", color: "text.secondary" }}>
              UOM
            </Typography>
          </Box>
          {children}
        </Box>
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{ display: "flex", alignItems: "center", py: 1.5, borderBottom: "1px solid", borderColor: "divider", px: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, width: "100px", color: "text.primary" }}>
            {option.code}
          </Typography>
          <Typography variant="body2" sx={{ flex: 1, px: 2, color: "text.primary" }}>
            {highlightMatch(option.combined_description || option.name || "", inputValue)}
          </Typography>
          <Typography variant="caption" sx={{ width: "40px", textAlign: "right", color: "text.secondary", fontWeight: 600 }}>
            {option.unit_of_measurement || "-"}
          </Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          sx={{ 
            width: "100%",
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              backgroundColor: "background.paper",
            },
            ...props.sx
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => onSearch(inputValue)} size="small" edge="end">
                  <Search />
                </IconButton>
                {params.InputProps.endAdornment}
              </InputAdornment>
            ),
          }}
        />
      )}
    />
  );
}
