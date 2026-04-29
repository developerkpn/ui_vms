import { Autocomplete, TextField, Box, Typography, InputAdornment, IconButton } from "@mui/material";
import { Search, Close } from "@mui/icons-material";
import { useState, useCallback, useMemo } from "react";
import { debounce } from "lodash";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

export default function SearchSuggestionField({ setQuery, placeholder }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const axiosPrivate = useAxiosPrivate();

  const fetchSuggestions = useMemo(() => 
    debounce(async (term) => {
      if (!term) {
        setOptions([]);
        return;
      }
      try {
        const response = await axiosPrivate.get(`/material/search/all?pageSize=10&q=${encodeURIComponent(term)}`);
        setOptions(response.data.data || []);
      } catch (err) {
        console.error("Suggestion fetch failed", err);
      }
    }, 800),
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
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{ display: "flex", alignItems: "center", py: 1, borderBottom: "1px solid #eee" }}>
          <Typography variant="body2" sx={{ fontWeight: "bold", width: "120px", color: "#333" }}>
            {option.code}
          </Typography>
          <Typography variant="body2" sx={{ flex: 1, px: 2, color: "#555" }}>
            {highlightMatch(option.combined_description || option.name || "", inputValue)}
          </Typography>
          <Typography variant="caption" sx={{ color: "#888", fontWeight: "medium" }}>
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
