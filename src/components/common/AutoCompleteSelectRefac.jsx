import { Controller } from "react-hook-form";
import { Autocomplete, TextField } from "@mui/material";
import TextFieldDirty from "../templates/TextFieldDirty";
import { useState, useEffect } from "react";

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
      render={({
        field: { onChange, value, ref },
        fieldState: { error, isDirty },
      }) => {
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
                if (typeof newValue === "object") {
                  onChange(newValue);
                } else {
                  onChange(newValue?.toUpperCase());
                }
              } else {
                onChange(
                  typeof newValue == "string" ? newValue : newValue?.value
                );
              }
            }}
            value={
              options.find(option => {
                return value == option.value;
              }) ?? null
            }
            getOptionLabel={option =>
              typeof option === "string" ? option : option.label
            }
            onInputChange={(_, data, reason) => {
              console.log(reason);
              console.log(data);
              // if (data) onChange(data);
              if (reason == "clear") {
                onChange("");
              }
            }}
            error={error}
            options={options}
            freeSolo={freeSolo}
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
