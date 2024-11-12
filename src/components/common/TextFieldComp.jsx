import { TextField, Tooltip } from '@mui/material';
import { Controller } from 'react-hook-form';
import { useState, useEffect } from 'react';
import TextFieldDirty from '../templates/TextFieldDirty';

export const TextFieldComp = ({
  control,
  label,
  name,
  rules,
  valueovr,
  readOnly,
  dirty,
  onChangeovr,
  toUpperCase,
  toLowerCase,
  Number,
  NPWP,
  helperText,
  tooltip,
  multiline,
  disabled,
  arrayDisabled,
  t,
  maxLength,
  sx,
}) => {
  const [is_disabled, setDisabled] = useState(false);
  useEffect(() => {
    if (Array.isArray(arrayDisabled)) {
      if (arrayDisabled.includes(name)) setDisabled(true);
    } else if (typeof disabled === 'boolean' && disabled) {
      {
        setDisabled(true);
      }
    }
  }, [disabled, arrayDisabled]);
  return (
    <>
      <Controller
        name={name}
        control={control}
        rules={rules}
        defaultValue={valueovr}
        render={({ field: { onChange, value, ref }, fieldState: { error, isDirty } }) => {
          let helpertext;
          if (t !== undefined) {
            helpertext = error ? t(error.message) : t(helperText);
          } else {
            helpertext = error ? error.message : helperText;
          }
          return (
            <Tooltip title={tooltip} disableHoverListener={!tooltip} followCursor enterDelay={1000}>
              <TextFieldDirty
                isDirty={isDirty && dirty}
                helperText={helpertext}
                error={!!error}
                onChange={(e) => {
                  if (maxLength && e.target.value.length >= maxLength) {
                    return;
                  }
                  if (Number) {
                    if (e.target.value.match(/[a-zA-Z!@#$%^&*(),.?":{}|<>-]/g) === null) {
                      onChange(e.target.value);
                    }
                  } else if (NPWP) {
                    let value = e.target.value.replace(/[A-Za-z\W\s_]+/g, '');
                    let split = 6;
                    const dots = [];

                    for (let i = 0, len = value.length; i < len; i += split) {
                      split = i >= 2 && i <= 6 ? 3 : i >= 8 && i <= 12 ? 4 : 2;
                      dots.push(value.substr(i, split));
                    }

                    const temp = dots.join('.');
                    onChange(temp.length > 12 ? `${temp.substr(0, 12)}-${temp.substr(12, 7)}` : temp);
                  } else {
                    if (toUpperCase) {
                      onChange(e.target.value.toUpperCase());
                    } else if (toLowerCase) {
                      onChange(e.target.value.toLowerCase());
                    } else {
                      onChange(e);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (onChangeovr !== undefined) {
                    onChangeovr(e.target.value);
                  }
                }}
                inputRef={ref}
                value={value}
                label={label}
                variant="outlined"
                inputProps={{ readOnly: readOnly }}
                fullWidth
                multiline={multiline}
                disabled={is_disabled}
                sx={sx}
              />
            </Tooltip>
          );
        }}
      />
    </>
  );
};
