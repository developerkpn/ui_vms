import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useState, useCallback, useMemo } from "react";
import { debounce } from "lodash";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

export default function SearchSuggestionField({
  onSearch,
  onInputValueChange,
  placeholder,
  apiEndpoint = "/material/suggestions",
  ...props
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const axiosPrivate = useAxiosPrivate();

  const fetchSuggestions = useMemo(
    () =>
      debounce(async term => {
        if (!term || term.length < 2) {
          setOptions([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const response = await axiosPrivate.get(
            `${apiEndpoint}?limit=10&q=${encodeURIComponent(term)}`
          );
          setOptions(response.data.data || []);
        } catch (err) {
          console.error("Suggestion fetch failed", err);
        } finally {
          setLoading(false);
        }
      }, 300),
    [axiosPrivate, apiEndpoint]
  );

  const getOptionLabel = useCallback(option => {
    if (typeof option === "string") return option;
    return option?.combined_description || option?.description || "";
  }, []);

  const commitSelectedOption = useCallback(
    (option, type = "select") => {
      if (!option) return false;
      setSelectedOption(option);
      setInputValue(getOptionLabel(option));
      setOpen(false);
      const keyword = option.code || option.description || "";
      onSearch?.({ type, option, keyword });
      return true;
    },
    [getOptionLabel, onSearch]
  );

  const commitTopSuggestion = useCallback(
    (type = "enter-top") => {
      if (!options.length) {
        onSearch?.({ type: "not-found", query: inputValue });
        return false;
      }

      return commitSelectedOption(options[0], type);
    },
    [commitSelectedOption, onSearch, options, inputValue]
  );

  const highlightMatch = (text, query) => {
    if (!query || !text) return text || "";
    const hasWildcard = query.includes("*");
    const words = hasWildcard
      ? query.split("*").map(s => s.trim()).filter(Boolean)
      : query.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return text;
    const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          words.some(w => part.toLowerCase() === w.toLowerCase()) ? (
            <b key={i} style={{ color: "#1976d2" }}>
              {part}
            </b>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const getAliasText = option =>
    [option.alias1, option.alias2, option.alias3].filter(Boolean).join(", ");

  return (
    <Autocomplete
      {...props}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={selectedOption}
      inputValue={inputValue}
      isOptionEqualToValue={(option, value) => option.code === value.code}
      filterOptions={x => x}
      loading={loading}
      loadingText={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, px: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="textSecondary">
            Searching materials...
          </Typography>
        </Box>
      }
      noOptionsText={
        <Typography variant="body2" color="textSecondary" sx={{ py: 1, px: 2 }}>
          Material not found
        </Typography>
      }
      onInputChange={(event, newInputValue, reason) => {
        if (reason === "reset") {
          setInputValue(newInputValue);
          return;
        }

        if (reason === "clear") {
          setSelectedOption(null);
          setInputValue("");
          setOptions([]);
          onInputValueChange?.("");
          return;
        }

        setSelectedOption(null);
        setInputValue(newInputValue);
        onInputValueChange?.(newInputValue);
        fetchSuggestions(newInputValue);
      }}
      onChange={(event, newValue) => {
        if (newValue) {
          commitSelectedOption(newValue, "select");
        }
      }}
      options={options}
      getOptionLabel={getOptionLabel}
      ListboxProps={{
        sx: {
          "& .MuiAutocomplete-listbox": {
            padding: 0,
          },
        },
      }}
      PaperComponent={({ children }) => (
        <Box
          sx={{
            boxShadow: 3,
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: "background.paper",
          }}
        >
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
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, width: "100px", color: "text.secondary" }}
            >
              CODE
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, minWidth: 0, flex: 1, px: 2, color: "text.secondary" }}
            >
              DESCRIPTION
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, width: "220px", px: 2, color: "text.secondary" }}
            >
              ALIAS
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, width: "56px", textAlign: "right", color: "text.secondary" }}
            >
              UOM
            </Typography>
          </Box>
          {children}
        </Box>
      )}
      renderOption={(props, option) => (
        <Box
          component="li"
          {...props}
          sx={{
            display: "flex",
            alignItems: "center",
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            px: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, width: "100px", color: "text.primary" }}
          >
            {highlightMatch(option.code || "", inputValue)}
          </Typography>
          <Typography variant="body2" sx={{ minWidth: 0, flex: 1, px: 2, color: "text.primary" }}>
            {highlightMatch(option.combined_description || option.description || "", inputValue)}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              width: "220px",
              px: 2,
              color: getAliasText(option) ? "text.secondary" : "text.disabled",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={getAliasText(option) || "-"}
          >
            {highlightMatch(getAliasText(option) || "-", inputValue)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ width: "56px", textAlign: "right", color: "text.secondary", fontWeight: 600 }}
          >
            {highlightMatch(option.unit_of_measurement || "-", inputValue)}
          </Typography>
        </Box>
      )}
      renderInput={params => (
        <TextField
          {...params}
          placeholder={placeholder}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitTopSuggestion("enter-top");
            }
          }}
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              backgroundColor: "background.paper",
            },
            ...props.sx,
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => commitTopSuggestion("icon-top")} size="small" edge="end">
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
