import { FormControl, InputLabel, MenuItem, Select, FormHelperText, Tooltip, ListSubheader } from '@mui/material';
import { Controller } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';
import SelectDirty from '../templates/SelectDirty';

export default function SelectComp({
  name,
  control,
  label,
  options,
  onChangeovr,
  rules,
  disabled,
  readOnly,
  valueovr,
  tooltip,
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
    if (typeof disabled == 'boolean' && disabled) {
      setDisabled(true);
    } else {
      setDisabled(false);
    }
  }, [disabled]);

  const generateSingleOptions = () => {
    if (!Array.isArray(options)) {
      let optionsHTML = [];
      Object.keys(options).map((keys) => {
        optionsHTML.push(<ListSubheader key={keys}>{keys}</ListSubheader>);
        options[keys].map((item) => {
          optionsHTML.push(
            <MenuItem key={item.comp_id} value={item.comp_id}>
              {item.name} {`(${item.code})`}
            </MenuItem>
          );
        });
      });
      return optionsHTML;
    } else {
      return options.map((item) => (
        <MenuItem key={item.value} value={item.value}>
          {item.label}
        </MenuItem>
      ));
    }
  };

  const [openTooltip, setOpenTooltip] = useState(false);
  const [runTimeout, setRunTimeout] = useState(false);
  const timeoutId = useRef();

  useEffect(() => {
    if (runTimeout) {
      timeoutId.current = setTimeout(() => {
        console.log('tooltip opened');
        setOpenTooltip(true);
      }, 1000);
      setRunTimeout(false);
    }
  }, [runTimeout]);

  return (
    <FormControl fullWidth sx={sx} disabled={is_disabled}>
      <Controller
        render={({ field: { onChange, value, ref }, fieldState: { error, isDirty } }) => {
          // if (disabled) {
          //   value = '';
          // }
          let helpertext;
          if (t) {
            helpertext = error ? t(error.message) : t(helperText);
          } else {
            helpertext = error ? error.message : helperText;
          }
          return (
            <>
              <InputLabel error={!!error}>{label}</InputLabel>
              <Tooltip
                title={tooltip}
                disableHoverListener={!tooltip}
                followCursor
                enterDelay={1000}
                open={openTooltip}
              >
                <div>
                  <SelectDirty
                    fullWidth
                    error={!!error}
                    label={label}
                    value={value}
                    inputRef={ref}
                    isDirty={isDirty && dirty}
                    onChange={(e) => {
                      onChange(e);
                      if (onChangeovr != undefined) {
                        onChangeovr(e.target.value);
                      }
                    }}
                    onMouseEnter={() => {
                      setRunTimeout(true);
                    }}
                    onMouseLeave={() => {
                      clearTimeout(timeoutId.current);
                      setOpenTooltip(false);
                    }}
                    onOpen={() => {
                      clearTimeout(timeoutId.current);
                      setOpenTooltip(false);
                    }}
                  >
                    {generateSingleOptions()}
                  </SelectDirty>
                </div>
              </Tooltip>
              <FormHelperText error={!!error}>{helpertext}</FormHelperText>
            </>
          );
        }}
        control={control}
        name={name}
        rules={rules}
        defaultValue={valueovr}
      />
    </FormControl>
  );
}
