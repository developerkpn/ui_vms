import { Controller } from 'react-hook-form';
import { PatternFormat } from 'react-number-format';
import { TextField, Tooltip, InputAdornment } from '@mui/material';

export default function PatternFieldComp({
  name,
  control,
  rules,
  label,
  format,
  mask,
  onChangeovr,
  readOnly,
  isNumString,
  patternChar,
  tooltip,
  t,
  helperText,
  useplaceholder,
}) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => {
        let helpertext;
        if (t) {
          helpertext = error ? t(error.message) : t(helperText);
        } else {
          helpertext = error ? error.message : helperText;
        }
        return (
          <Tooltip title={tooltip} disableHoverListener={!tooltip} followCursor enterDelay={1000}>
            <span>
              <PatternFormat
                value={field.value}
                format={format}
                mask={mask}
                valueIsNumericString={isNumString}
                onChange={(e) => {
                  if (onChangeovr !== undefined) {
                    onChangeovr(e.target.value);
                  }
                  field.onChange(e.target.value);
                }}
                label={label}
                error={error}
                inputRef={field.ref}
                customInput={TextField}
                patternChar={patternChar}
                inputProps={{
                  readOnly: readOnly,
                  placeholder: useplaceholder && format.replace(/#/g, '_'),
                }}
                helperText={helpertext}
                fullWidth
              />
            </span>
          </Tooltip>
        );
      }}
    />
  );
}
