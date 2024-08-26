import { Controller } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';

export default function AutoCompleteSelect({
  name,
  label,
  control,
  options,
  onChangeovr,
  freeSolo,
  readOnly,
  disabled,
  rules,
  t,
  helperText,
}) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, value, ref }, fieldState: { error } }) => {
        let helpertext;
        if (t) {
          helpertext = error ? t(error.message) : t(helperText);
        } else {
          helpertext = error ? error.message : helperText;
        }

        return (
          <Autocomplete
            onChange={(e, newValue) => {
              if (onChangeovr != undefined) {
                onChangeovr(newValue);
              }
              if (freeSolo) {
                if (typeof newValue === 'object') {
                  onChange(newValue);
                } else {
                  onChange(newValue?.toUpperCase());
                }
              } else {
                onChange(newValue);
              }
            }}
            value={value}
            error={error}
            options={options}
            freeSolo={freeSolo}
            autoSelect={freeSolo}
            fullWidth
            readOnly={readOnly}
            disabled={disabled}
            renderInput={(params) => (
              <TextField {...params} label={label} error={error} inputRef={ref} helperText={helpertext} />
            )}
          />
        );
      }}
    />
  );
}
