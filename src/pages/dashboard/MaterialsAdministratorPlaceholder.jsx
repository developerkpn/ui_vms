
import {
  Autocomplete,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PageHeader from "src/components/common/PageHeader";
import PageTablePaper, { PAGE_TABLE_HEADER_SX } from "src/components/common/PageTablePaper";
import PageSearchField from "src/components/common/PageSearchField";
import { useEffect, useMemo, useState } from "react";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { useSnackBar } from "src/provider/SnackbarProvider";
import {
  buildAssignApproverPayload,
  buildAssignmentSuccessMessage,
  getApproverSelectOptions,
  mergeAdministratorMasterRow,
  normalizeAdministratorMasterRows,
  normalizeApproverOptions,
} from "src/helper/materialAdministratorAssignment.mjs";

export default function MaterialsAdministratorPlaceholder() {
  const axiosPrivate = useAxiosPrivate();
  const { openSnackbar } = useSnackBar();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [approverRows, setApproverRows] = useState([]);
  const [savingRows, setSavingRows] = useState({});

  const approverPools = useMemo(() => normalizeApproverOptions(approverRows), [approverRows]);

  useEffect(() => {
    let mounted = true;
    const loadPageData = async () => {
      setLoading(true);
      const [masterResult, userListResult] = await Promise.allSettled([
        axiosPrivate.get("/material/requests/single/approver-masters"),
        axiosPrivate.get("/user/"),
      ]);
      if (!mounted) return;
      setApproverRows(userListResult.status === "fulfilled" ? userListResult.value?.data?.data || [] : []);
      setRows(
        masterResult.status === "fulfilled"
          ? normalizeAdministratorMasterRows(masterResult.value?.data?.data)
          : []
      );
      setLoading(false);
    };
    loadPageData();
    return () => {
      mounted = false;
    };
  }, [axiosPrivate]);

  const visibleRows = useMemo(() => {
    const query = String(searchQuery).trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(row =>
      [row.requesterUsername, row.requesterUserId].some(value =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [rows, searchQuery]);

  const handleApproverChange = async (row, field, option) => {
    const nextValue = option?.id || "";
    const payload = buildAssignApproverPayload({ previousRow: row, nextField: field, nextValue });
    if (Object.keys(payload).length === 0) return;

    const optimisticRow = { ...row, [field]: nextValue };
    setRows(previous => previous.map(item => (item.id === row.id ? optimisticRow : item)));
    setSavingRows(previous => ({ ...previous, [row.id]: true }));

    try {
      const response = await axiosPrivate.patch(
        `/material/requests/single/approver-masters/${row.requesterUserId}`,
        payload
      );
      const nextRow = mergeAdministratorMasterRow(optimisticRow, response.data?.data);
      setRows(previous => previous.map(item => (item.id === row.id ? nextRow : item)));
      openSnackbar("success", buildAssignmentSuccessMessage());
    } catch (error) {
      setRows(previous => previous.map(item => (item.id === row.id ? row : item)));
      openSnackbar("error", error.response?.data?.message || "Gagal menyimpan approver.");
    } finally {
      setSavingRows(previous => ({ ...previous, [row.id]: false }));
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="Material Administrator"
        subtitle="Assign approvers for material requests"
      />
      <Box>
        <PageSearchField
          placeholder="Search username..."
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
        />
      </Box>
      <PageTablePaper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={PAGE_TABLE_HEADER_SX}>No</TableCell>
              <TableCell sx={PAGE_TABLE_HEADER_SX}>Username</TableCell>
              <TableCell sx={PAGE_TABLE_HEADER_SX}>Approval 1</TableCell>
              <TableCell sx={PAGE_TABLE_HEADER_SX}>Approval 2</TableCell>
              <TableCell sx={PAGE_TABLE_HEADER_SX}>Approval 3</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} align="center">Loading...</TableCell>
              </TableRow>
            )}
            {!loading && visibleRows.map((row, index) => {
              const approval1Options = getApproverSelectOptions({
                manualApprovers: approverPools.manualApprovers,
                requesterUserId: row.requesterUserId,
                requesterUsername: row.requesterUsername,
                selectedApproval1UserId: row.approval1UserId,
                selectedApproval2UserId: row.approval2UserId,
                field: "approval1",
              });
              const approval2Options = getApproverSelectOptions({
                manualApprovers: approverPools.manualApprovers,
                requesterUserId: row.requesterUserId,
                requesterUsername: row.requesterUsername,
                selectedApproval1UserId: row.approval1UserId,
                selectedApproval2UserId: row.approval2UserId,
                field: "approval2",
              });
              return (
                <TableRow key={row.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Typography>{row.requesterUsername}</Typography>
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={approval1Options}
                      value={approval1Options.find(o => o.id === row.approval1UserId) || null}
                      disabled={savingRows[row.id] === true}
                      onChange={(event, value) => handleApproverChange(row, "approval1UserId", value)}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                      getOptionLabel={option => option.label || ""}
                      renderInput={params => <TextField {...params} placeholder="Pilih Approval 1" />}
                    />
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={approval2Options}
                      value={approval2Options.find(o => o.id === row.approval2UserId) || null}
                      disabled={savingRows[row.id] === true}
                      onChange={(event, value) => handleApproverChange(row, "approval2UserId", value)}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                      getOptionLabel={option => option.label || ""}
                      renderInput={params => <TextField {...params} placeholder="Pilih Approval 2" />}
                    />
                  </TableCell>
                  <TableCell>
                    {row.approval3UserName ? (
                      <Chip label={row.approval3UserName} size="small" color="default" />
                    ) : (
                      <Chip label="By system" size="small" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </PageTablePaper>
    </Box>
  );
}