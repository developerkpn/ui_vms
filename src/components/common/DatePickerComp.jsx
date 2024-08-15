import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { Controller } from 'react-hook-form';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

export default function DatePickerComp({ name, label, control, rules }) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <DatePicker
            sx={{ width: '100%' }}
            onChange={onChange}
            value={dayjs(value)}
            label={label}
            slotProps={{ textField: { error: !!error, helperText: error?.message } }}
          />
        )}
      ></Controller>
    </LocalizationProvider>
  );
}
