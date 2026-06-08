import { Box, Tab, Tabs } from "@mui/material";

/**
 * Consistent tab strip used across Material pages.
 * Wraps MUI Tabs with the shared visual tokens:
 *  - bottom border divider
 *  - tab labels: textTransform none, fontWeight 700, fontSize 0.95rem
 *
 * Props:
 *  - value:      current active tab value
 *  - onChange:   (event, newValue) => void
 *  - tabs:       [{ value: string | number, label: string }]
 *  - sx?:        extra styling on the outer Box
 */
export default function PageTabs({ value, onChange, tabs, sx }) {
  return (
    <Box sx={{ mb: 3, borderBottom: 1, borderColor: "divider", ...sx }}>
      <Tabs
        value={value}
        onChange={onChange}
        sx={{
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.95rem",
            minWidth: 120,
          },
        }}
      >
        {tabs.map(tab => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </Tabs>
    </Box>
  );
}
