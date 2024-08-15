import { Visibility, VisibilityOff } from '@mui/icons-material';
import { FormControl, InputLabel, OutlinedInput, InputAdornment, IconButton } from '@mui/material';
import { Controller } from 'react-hook-form';
import { useState } from 'react';

export const PasswordWithEyes = ({ control, label, name, rules }) => {
  const [showPassword, setPwd] = useState(false);

  const handleClickShowPassword = () => setPwd((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };
  return (
    <>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <FormControl fullWidth variant="outlined">
            <InputLabel htmlFor="outlined-adornment-password">{label}</InputLabel>
            <OutlinedInput
              id="outlined-adornment-password"
              type={showPassword ? 'text' : 'password'}
              onChange={onChange}
              value={value}
              error={error}
              inputProps={{ autoComplete: 'new-password' }}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              label={label}
            />
          </FormControl>
        )}
      />
    </>
  );
};
