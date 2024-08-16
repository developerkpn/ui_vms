import { FormControl, MenuItem, Select, InputLabel } from '@mui/material';

export default function SelectCompNoCont({
  name,
  label,
  value,
  options,
  onChangeovr,
  disabled,
  readOnly,
  onOpen,
  lazy,
  multiple,
  ...props
}) {
  const generateSingleOptions = () => {
    if (lazy) {
      let optionses = options.map((item) => {
        return (
          <MenuItem key={item.value} value={item.value}>
            {item.label}
          </MenuItem>
        );
      });
      if (props.isLoading) {
        optionses.unshift(
          <MenuItem key="loading" value="">
            Loading...
          </MenuItem>
        );
      }
      return optionses;
    } else {
      return options.map((item) => {
        return (
          <MenuItem key={item.value} value={item.value}>
            {item.label}
          </MenuItem>
        );
      });
    }
  };
  return (
    <FormControl {...props}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value}
        defaultValue={[]}
        inputProps={{
          readOnly: readOnly,
          disabled: disabled,
        }}
        onChange={(e) => {
          console.log(e);
          onChangeovr(e.target.value);
        }}
        onOpen={onOpen}
        multiple={multiple}
      >
        {generateSingleOptions()}
      </Select>
    </FormControl>
  );
}
