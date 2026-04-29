import { Autocomplete, TextField, Box, Typography, InputAdornment, IconButton, CircularProgress } from "@mui/material";
import { Search, Close } from "@mui/icons-material";
import { useState, useCallback, useMemo } from "react";
import { debounce } from "lodash";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

export default function SearchSuggestionField({ setQuery, placeholder }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const axiosPrivate = useAxiosPrivate();

  const fetchSuggestions = useMemo(() => 
    debounce(async (term) => {
      if (!term) {
        setOptions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await axiosPrivate.get(`/material/search/all?pageSize=10&q=${encodeURIComponent(term)}`);
        setOptions(response.data.data || []);
      } catch (err) {
        console.error("Suggestion fetch failed", err);
      } finally {
        setLoading(false);
      }
    }, 300),
    [axiosPrivate]
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
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      inputValue={inputValue}
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
          setQuery(newValue.code || newValue.name);
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
        <Box sx={{ boxShadow: 3, borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              py: 1.5,
              px: 2,
              backgroundColor: "#f5f5f5",
              borderBottom: "2px solid #ddd",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: "bold", width: "120px", color: "#666" }}>
              Material Code
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: "bold", flex: 1, px: 2, color: "#666" }}>
              Material Desc
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: "bold", width: "40px", textAlign: "right", color: "#666" }}>
              UoM
            </Typography>
          </Box>
          {children}
        </Box>
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{ display: "flex", alignItems: "center", py: 1, borderBottom: "1px solid #eee", px: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: "bold", width: "120px", color: "#333" }}>
            {option.code}
          </Typography>
          <Typography variant="body2" sx={{ flex: 1, px: 2, color: "#555" }}>
            {highlightMatch(option.combined_description || option.name || "", inputValue)}
          </Typography>
          <Typography variant="caption" sx={{ width: "40px", textAlign: "right", color: "#888", fontWeight: "medium" }}>
            {option.unit_of_measurement || "-"}
          </Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          sx={{ 
            width: "30rem",
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              backgroundColor: "#fff",
            }
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setQuery(inputValue)} size="small">
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
