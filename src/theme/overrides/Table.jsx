// ----------------------------------------------------------------------

export default function Table(theme) {
  return {
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: theme.palette.background.neutral,
        },
      },
    },
  };
}
