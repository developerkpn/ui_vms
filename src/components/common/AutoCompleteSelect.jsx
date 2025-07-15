import { Controller } from "react-hook-form";
import { Autocomplete, TextField } from "@mui/material";
import TextFieldDirty from "../templates/TextFieldDirty";
import { useState, useEffect } from "react";
import debounce from "lodash/debounce";

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
  dirty,
  sx,
}) {
  const [is_disabled, setDisabled] = useState(false);
  useEffect(() => {
    if (Array.isArray(disabled)) {
      if (disabled.includes(name)) {
        setDisabled(true);
      } else {
        setDisabled(false);
      }
    } else {
      setDisabled(false);
    }
    if (typeof disabled == "boolean" && disabled) {
      setDisabled(true);
    } else {
      setDisabled(false);
    }
  }, [disabled]);
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, value, ref }, fieldState: { error, isDirty } }) => {
        const value_onchange = debounce(value => {
          onChange(value);
        }, 500);
        let helpertext;
        if (t) {
          helpertext = error ? t(error.message) : t(helperText);
        } else {
          helpertext = error ? error.message : helperText;
        }

        return (
          <Autocomplete
            onChange={(e, newValue) => {
              console.log(newValue);
              if (onChangeovr != undefined) {
                onChangeovr(newValue);
              }
              if (freeSolo) {
                if (typeof newValue === "object") {
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
            onInputChange={(e, value) => {
              if (freeSolo && value) {
                value_onchange(value.toUpperCase());
              }
            }}
            fullWidth
            readOnly={readOnly}
            disabled={is_disabled}
            renderInput={params => (
              <TextFieldDirty
                {...params}
                label={label}
                error={error}
                inputRef={ref}
                helperText={helpertext}
                isDirty={isDirty && dirty}
              />
            )}
            sx={sx}
          />
        );
      }}
    />
  );
}
