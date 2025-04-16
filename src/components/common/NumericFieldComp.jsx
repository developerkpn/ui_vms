import { Controller } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { TextField } from "@mui/material";

export default function NumericFieldComp({
  name,
  label,
  control,
  currency,
  format,
  rules,
  readOnly,
  disabled,
  t,
  helperText,
  thousandSeparator = true,
  allowLeadingZeros = false,
}) {
  return (
    <>
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({
          field: { onChange, value, ref },
          fieldState: { error },
        }) => {
          let helpertext;
          if (t) {
            helpertext = error ? t(error.message) : t(helperText);
          } else {
            helpertext = error ? error.message : helperText;
          }
          return (
            <NumericFormat
              onChange={onChange}
              value={value}
              label={label}
              thousandSeparator={thousandSeparator}
              allowLeadingZeros={allowLeadingZeros}
              inputRef={ref}
              helperText={helpertext}
              customInput={TextField}
              prefix={currency && `${currency} `}
              error={error}
              fullWidth
              inputProps={{
                readOnly: readOnly,
                disabled: disabled,
              }}
            />
          );
        }}
      />
    </>
  );
}
