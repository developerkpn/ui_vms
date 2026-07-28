import { Autocomplete, TextField } from "@mui/material";

/**
 * Select-only dropdown that can be narrowed by typing, wrapping MUI Autocomplete.
 *
 * Options must be normalized to { value, label, group? } by the caller. `group` is
 * optional: when at least one option carries one, the list is rendered with group
 * headers (the Autocomplete equivalent of ListSubheader inside a Select).
 *
 * Callers passing grouped options must sort them by group first — see groupBy below.
 */

const getLabel = option => (option?.label == null ? "" : String(option.label));

/**
 * Compare an option value against the controlled value.
 *
 * Compared as strings on purpose: option values may be numeric ids while the
 * controlled value arrives from the API as a string (or vice versa). This matches
 * how MUI Select resolved its selected MenuItem, so swapping Select for this
 * component does not change which option shows as selected.
 *
 * @param {*} optionValue - `value` of one option
 * @param {*} value - the component's controlled value
 * @returns {boolean}
 */
const isSameValue = (optionValue, value) => String(optionValue) === String(value);

const groupLabelSx = {
  "& .MuiAutocomplete-groupLabel": {
    fontWeight: "bold",
    color: "#1976d2",
  },
};

/**
 * @param {object} props
 * @param {{ value: *, label: string, group?: string }[]} props.options
 * @param {*} props.value - currently selected option value; "" means nothing selected
 * @param {(value: *, option: object | null) => void} props.onChange - receives the
 *   selected value directly (not an event), and the whole option for callers that
 *   need the rest of its payload
 * @param {boolean} [props.disabled]
 * @param {string} [props.placeholder]
 * @param {boolean} [props.error]
 * @param {string} [props.helperText]
 * @param {string} [props.noOptionsText]
 */
export default function SearchableSelect({
  options = [],
  value = "",
  onChange,
  disabled = false,
  placeholder = "Choose",
  error = false,
  helperText = "",
  noOptionsText = "No options found",
  ...autocompleteProps
}) {
  const hasValue = value !== "" && value !== null && value !== undefined;
  const selectedOption = hasValue
    ? options.find(option => isSameValue(option?.value, value)) ?? null
    : null;
  const isGrouped = options.some(option => Boolean(option?.group));

  return (
    <Autocomplete
      fullWidth
      size="small"
      disabled={disabled}
      options={options}
      value={selectedOption}
      onChange={(_, option) => onChange?.(option?.value ?? "", option ?? null)}
      getOptionLabel={getLabel}
      isOptionEqualToValue={(option, selected) => isSameValue(option?.value, selected?.value)}
      // Autocomplete emits a header every time this returns a new value while
      // walking the list, so unsorted options produce one header per run of
      // same-group items. Sorting is the caller's job.
      groupBy={isGrouped ? option => option?.group || "" : undefined}
      noOptionsText={noOptionsText}
      ListboxProps={isGrouped ? { sx: groupLabelSx } : undefined}
      {...autocompleteProps}
      renderInput={params => (
        <TextField {...params} placeholder={placeholder} error={error} helperText={helperText} />
      )}
    />
  );
}
