import { TextField, styled } from '@mui/material';

const TextFieldDirty = styled(TextField, { shouldForwardProp: (prop) => prop !== 'isDirty' })(({ isDirty, theme }) => {
  return {
    ...(isDirty && {
      '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.warning.dark,
      },
    }),
  };
});

export default TextFieldDirty;
