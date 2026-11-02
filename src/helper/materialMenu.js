export const MATERIAL_REPORT_PATH = "/dashboard/materials/report";
export const MATERIAL_SLA_REPORT_PATH = `${MATERIAL_REPORT_PATH}/sla`;
export const MATERIAL_REPORT_PERMISSION = "Administrator";

// Report is a separate Materials submenu with the existing Materials admin
// audience. Give it an explicit permission key: "Report" already names the
// vendor report menu and must not determine access to material SLA reports.
export function withMaterialReportMenu(menu) {
  return Object.fromEntries(
    Object.entries(menu ?? {}).map(([key, parent]) => {
      if (parent.text !== "Materials") return [key, parent];

      const children = parent.children ?? [];
      const administratorIndex = children.findIndex(
        child => child.text === MATERIAL_REPORT_PERMISSION
      );
      if (administratorIndex < 0) return [key, parent];

      const report = {
        key: "materials-report",
        text: "Report",
        url: MATERIAL_REPORT_PATH,
        permissionKey: MATERIAL_REPORT_PERMISSION,
        access: [false, children[administratorIndex].access?.[1] ?? true, false, false],
      };
      const existingIndex = children.findIndex(child => child.url === MATERIAL_REPORT_PATH);
      if (existingIndex >= 0) {
        return [
          key,
          {
            ...parent,
            children: children.map((child, index) =>
              index === existingIndex ? { ...child, ...report } : child
            ),
          },
        ];
      }

      return [
        key,
        {
          ...parent,
          children: [
            ...children.slice(0, administratorIndex + 1),
            report,
            ...children.slice(administratorIndex + 1),
          ],
        },
      ];
    })
  );
}
