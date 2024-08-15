import { Autocomplete, TextField, createFilterOptions, Tooltip } from '@mui/material';
import { Controller } from 'react-hook-form';

export default function AutoCompleteCustomController(params) {
  const newAddModal = (e) => {
    params.newAddModal(e.inputValue);
  };
  const filter = createFilterOptions();
  return (
    <>
      <Controller
        control={params.control}
        name={params.name}
        rules={params.rules}
        render={({ field: { onChange, value, ref }, fieldState: { error } }) => {
          return (
            <Autocomplete
              disabled={params.is_local || params.disabled}
              tabIndex={params.tabIndex}
              name={params.name}
              options={params.options}
              value={value}
              onChange={(ev, e) => {
                if (typeof e === 'string') {
                  setTimeout(() => {
                    newAddModal(e);
                  });
                } else if (e && e.inputValue) {
                  newAddModal(e);
                } else {
                  onChange(e);
                }
              }}
              onClose={(ev) => {
                ev.preventDefault();
              }}
              filterOptions={(options, param) => {
                const filtered = filter(options, param);
                if (param.inputValue !== '' && params.addnew) {
                  filtered.push({
                    inputValue: param.inputValue,
                    label: `Add "${param.inputValue}"`,
                  });
                }
                return filtered;
              }}
              getOptionLabel={(option) => {
                if (typeof option === 'string') {
                  return option;
                }
                if (params.option_type === 'value') {
                  return option.value;
                }
                if (option.inputValue) {
                  return option.inputValue;
                }
                return option.label;
              }}
              renderOption={(props, option) => <li {...props}>{option.label}</li>}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              fullWidth
              componentsProps={{ popper: { style: { width: 'fit-content' } } }}
              renderInput={(paramb) => (
                <Tooltip title={params?.tooltip} placement="top">
                  <TextField
                    {...paramb}
                    inputRef={ref}
                    label={params.label}
                    error={error}
                    fullWidth
                    helperText={error && params.t(error.message)}
                  />
                </Tooltip>
              )}
            />
          );
        }}
      />
    </>
  );
}
