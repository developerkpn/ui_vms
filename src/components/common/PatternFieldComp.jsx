import { Controller } from 'react-hook-form';
import { PatternFormat } from 'react-number-format';
import { TextField, Tooltip, InputAdornment, styled } from '@mui/material';
import TextFieldDirty from '../templates/TextFieldDirty';

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
  disabled,
  useplaceholder,
  dirty,
  sx,
}) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error, isDirty } }) => {
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
                sx={sx}
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
                customInput={TextFieldDirty}
                patternChar={patternChar}
                isDirty={isDirty && dirty}
                inputProps={{
                  readOnly: readOnly,
                  disabled: disabled,
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
