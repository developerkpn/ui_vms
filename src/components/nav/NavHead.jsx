import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { Suspense, lazy, useMemo } from "react";

const getIcon = icon => {
  // add as many icons as you need
  switch (icon) {
    case "ConfirmationNumber":
      return lazy(() => import("@mui/icons-material/ConfirmationNumber"));
    case "TurnedIn":
      return lazy(() => import("@mui/icons-material/TurnedIn"));
    case "SupervisedUserCircle":
      return lazy(() => import("@mui/icons-material/SupervisedUserCircle"));
    case "Calculate":
      return lazy(() => import("@mui/icons-material/Calculate"));
    case "Extension":
      return lazy(() => import("@mui/icons-material/Extension"));
    case "Gavel":
      return lazy(() => import("@mui/icons-material/Gavel"));
    case "Computer":
      return lazy(() => import("@mui/icons-material/Computer"));
    case "Inventory":
      return lazy(() => import("@mui/icons-material/Inventory"));
    case "Approval":
      return lazy(() => import("@mui/icons-material/Approval"));
    case "Summarize":
      return lazy(() => import("@mui/icons-material/Summarize"));
    case "Coupa":
      return lazy(() => import("@mui/icons-material/PrecisionManufacturing"));
    case "AdminPanelSettings":
      return lazy(() => import("@mui/icons-material/AdminPanelSettings"));
    default:
      return HelpOutlineIcon;
  }
};

export default function NavHead({ keyhead, text, icon, curstate, upNav }) {
  const updateNavcol = item => () => {
    upNav(item);
  };

  const SelectedIcon = useMemo(() => getIcon(icon), [icon]);
  return (
    <ListItem disablePadding key={`item-${keyhead}`} sx={{ display: "block" }}>
      <ListItemButton
        key={`button-${keyhead}`}
        onClick={updateNavcol(keyhead)}
        selected={keyhead === curstate.head}
      >
        <ListItemIcon key={`icon-${keyhead}`}>
          <ListItemIcon key={`icon-${keyhead}`}>
            <Suspense fallback={<HelpOutlineIcon />}>
              <SelectedIcon />
            </Suspense>
          </ListItemIcon>
        </ListItemIcon>
        <ListItemText key={`text-${keyhead}`} primary={text} />
      </ListItemButton>
    </ListItem>
  );
}
