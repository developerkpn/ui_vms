import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { Controller } from "react-hook-form";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";

export default function DatePickerComp({ name, label, control, rules, inputFormat, ...props }) {
  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <DatePicker
            onChange={onChange}
            value={value}
            label={label}
            format={inputFormat}
            slotProps={{
              textField: { error: !!error, helperText: error?.message },
              ...props.additional,
            }}
            {...props}
          />
        )}
      ></Controller>
    </LocalizationProvider>
  );
}
