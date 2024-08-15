import { TextField } from '@mui/material';
import { Controller } from 'react-hook-form';

export const PasswordFieldComp = ({ control, label, name, rules }) => {
  return (
    <>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <TextField
            helperText={error ? error.message : null}
            error={!!error}
            onChange={onChange}
            value={value}
            label={label}
            variant="outlined"
            type="password"
            fullWidth
            sx={{ mt: 2, mb: 2 }}
          />
        )}
      />
    </>
  );
};
