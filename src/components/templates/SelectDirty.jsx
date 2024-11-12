import { Select, styled } from '@mui/material';

const SelectDirty = styled(Select, { shouldForwardProp: (prop) => prop !== 'isDirty' })(({ isDirty, theme }) => {
  return {
    ...(isDirty && {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.warning.dark,
      },
    }),
  };
});

export default SelectDirty;
