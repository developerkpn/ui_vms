import { Box } from "@mui/material";
import { useState } from "react";
import PageHeader from "src/components/common/PageHeader";
import PageTabs from "src/components/common/PageTabs";
import MaterialDashboardOverview from "src/components/material-dashboard/MaterialDashboardOverview";
import MaterialsGuideDashboard from "./MaterialsGuideDashboard";

export default function MaterialsDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  return (
    <Box sx={{ pb: { xs: 4, md: 6 } }}>
      <PageHeader
        title="Dashboard"
        subtitle={
          activeTab === "dashboard"
            ? "Monitor material request progress through approval and SAP"
            : "Guides and videos for the Material Management System"
        }
      />
      <PageTabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        tabs={[
          { value: "dashboard", label: "Dashboard" },
          { value: "guide", label: "User Guide" },
        ]}
      />
      {/* Keep the filters and fetched dashboard while users consult a guide. */}
      <Box hidden={activeTab !== "dashboard"}>
        <MaterialDashboardOverview />
      </Box>
      {activeTab === "guide" && <MaterialsGuideDashboard embedded />}
    </Box>
  );
}
