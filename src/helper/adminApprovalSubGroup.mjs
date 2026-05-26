export function buildApprovalSubGroupsRequestPath(row = {}) {
  const materialGroupId = row?.materialGroupId ?? row?.material_group_id;

  if (materialGroupId === undefined || materialGroupId === null || materialGroupId === "") {
    return null;
  }

  return `/material/subgroups/${materialGroupId}/dropdown`;
}

export function formatSubGroupOptionLabel(option = {}) {
  const code = String(option?.code ?? option?.subGroupCode ?? "").trim();
  const name = String(option?.name ?? option?.subGroupName ?? "").trim();

  if (code && name) {
    return `${code} - ${name}`;
  }

  if (name) {
    return name;
  }

  if (code) {
    return code;
  }

  return option?.id ? `Sub Group ${option.id}` : "";
}

export function buildCurrentSubGroupOption(row = {}) {
  const id =
    row?.materialSubGroupId ??
    row?.material_sub_group_id ??
    row?.subMaterialGroupId ??
    row?.sub_material_group_id;
  const code =
    row?.subMaterialGroupCode ?? row?.material_sub_group_code ?? row?.sub_group_code ?? "";
  const name =
    row?.subMaterialGroupName ?? row?.material_sub_group_name ?? row?.sub_group_name ?? "";

  if (id === undefined || id === null || id === "") {
    return null;
  }

  return {
    id,
    code,
    name,
  };
}

export function buildApprovalSubGroupOptions(subGroups = [], row = {}) {
  const currentOption = buildCurrentSubGroupOption(row);
  const options = Array.isArray(subGroups) ? [...subGroups] : [];

  if (!currentOption) {
    return options;
  }

  const exists = options.some(option => String(option?.id ?? "") === String(currentOption.id));
  if (!exists) {
    options.unshift(currentOption);
  }

  return options;
}

export function findSubGroupOptionById(subGroups = [], selectedId = null, fallbackRow = {}) {
  if (selectedId === undefined || selectedId === null || selectedId === "") {
    return null;
  }

  const options = buildApprovalSubGroupOptions(subGroups, fallbackRow);

  return options.find(option => String(option?.id ?? "") === String(selectedId)) || null;
}
