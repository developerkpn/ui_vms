import { Switch, Box } from "@mui/material";
import { Controller } from "react-hook-form";

import React from "react";

export default function SwitchComponent({
  control,
  rules,
  name,
  frontlabel,
  backlabel,
  disabled,
}) {
  return (
    <Controller
      control={control}
      rules={rules}
      name={name}
      render={({ field: { onChange, value } }) => (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {backlabel && <p>{backlabel}</p>}
          <Switch checked={value} onChange={onChange} disabled={disabled} />
          {frontlabel && <p>{frontlabel}</p>}
        </Box>
      )}
    />
  );
}
