import TableSimpleVirtualized from "src/components/table/TableSimpleVirtualized";
import { createColumnHelper } from "@tanstack/react-table";
import { useMasterFetcher } from "src/hooks/MasterFetcher";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { Box, Button, Tooltip } from "@mui/material";
import SelectComp from "src/components/common/SelectComp";
import DatePickerComp from "src/components/common/DatePickerCompMoment";
import { DownloadOutlined } from "@mui/icons-material";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import { useSnackBar } from "src/provider/SnackbarProvider";

const colhelp = createColumnHelper();

export default function ReportTicketPosition() {
  const axios = useAxiosPrivate();
  const { openSnackbar } = useSnackBar();
  const { control, watch, getValues } = useForm({
    defaultValues: {
      bu: "",
      dept_id: "",
      from: null,
      to: null,
    },
  });

  const { data: bu_opt, loading: loading_bu } = useMasterFetcher({ link: "/master/bu" });
  const { data: dept_opt, loading: loading_dept } = useMasterFetcher({ link: "/master/budept" });
  const {
    data: report_sum,
    loading: rep_sum,
    refresh_data,
  } = useMasterFetcher({ link: "/report/sumpos" });

  useEffect(() => {
    let param = new Map();
    const values = getValues();
    if (values.bu) {
      param.set("bu_id", values.bu);
    }
    if (values.dept_id) {
      param.set("dept_id", values.dept_id);
    }
    if (values.from) {
      param.set("from", values.from.format("YYYY-MM-DD"));
    }
    if (values.to) {
      param.set("to", values.to.format("YYYY-MM-DD"));
    }

    refresh_data(Object.fromEntries(param));
  }, [watch("bu"), watch("dept_id"), watch("from"), watch("to")]);

  const optdept = useMemo(() => {
    if (!(dept_opt && getValues("bu"))) return [];
    return dept_opt[getValues("bu")];
  }, [dept_opt, watch("bu")]);

  const optbu = useMemo(() => {
    console.log(bu_opt);
    if (!bu_opt) return [];
    return bu_opt.map(value => ({ value: value.bu_code, label: value.bu_name }));
  }, [bu_opt]);

  const columns = useMemo(
    () => [
      colhelp.accessor("fullname", { header: "Requestor", cell: ({ getValue }) => getValue() }),
      // colhelp.accessor("Approving", {
      //   header: "Approving",
      //   cell: ({ getValue }) => getValue(),
      // }),
      // colhelp.accessor("Create", { header: "Create", cell: ({ getValue }) => getValue() }),
      // colhelp.accessor("Approved by Manager", {
      //   header: "Approved by Manager",
      //   cell: ({ getValue }) => getValue(),
      // }),
      // colhelp.accessor("Confirmed by MDM", {
      //   header: "Confirmed by MDM",
      //   cell: ({ getValue }) => getValue(),
      // }),
      // colhelp.accessor("Closed", { header: "Closed", cell: ({ getValue }) => getValue() }),
      // colhelp.accessor("Rejected by MDM", {
      //   header: "Rejected by MDM",
      //   cell: ({ getValue }) => getValue(),
      // }),
      colhelp.group({
        header: "Status",
        columns: [
          colhelp.accessor("Approving", {
            header: "Approving",
            cell: ({ getValue }) => getValue(),
          }),
          colhelp.accessor("Create", { header: "Create", cell: ({ getValue }) => getValue() }),
          colhelp.accessor("Approved by Manager", {
            header: "Approved by Manager",
            cell: ({ getValue }) => getValue(),
          }),
          colhelp.accessor("Confirmed by MDM", {
            header: "Confirmed by MDM",
            cell: ({ getValue }) => getValue(),
          }),
          colhelp.accessor("Closed", { header: "Closed", cell: ({ getValue }) => getValue() }),
          colhelp.accessor("Rejected by MDM", {
            header: "Rejected by MDM",
            cell: ({ getValue }) => getValue(),
          }),
        ],
      }),
    ],
    []
  );

  const data_row = useMemo(() => {
    return report_sum?.result ? report_sum.result : [];
  }, [report_sum]);

  const downloadReport = async () => {
    try {
      let param = new Map();
      const values = getValues();
      if (values.bu) {
        param.set("bu_id", values.bu);
      }
      if (values.dept_id) {
        param.set("dept_id", values.dept_id);
      }
      if (values.from) {
        param.set("from", values.from.format("YYYY-MM-DD"));
      }
      if (values.to) {
        param.set("to", values.to.format("YYYY-MM-DD"));
      }
      const search_param = new URLSearchParams(Object.fromEntries(param));
      const response = await axios.get("/report/repxls?" + search_param.toString(), {
        responseType: "blob",
        headers: {
          Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });

      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = Math.floor(Date.now() / 1000);
      const filename = `ReportSummaryTicket-${values.bu || "NAN"}-${
        values.dept_id || "NAN"
      }-${timestamp}.xlsx`;
      link.download = filename;
      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to download report";
      openSnackbar("error", errorMessage);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 2 }}>
      <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
        <SelectComp
          control={control}
          name="bu"
          options={optbu}
          label="Business Unit"
          sx={{ width: "20rem" }}
        />
        <SelectComp control={control} name="dept_id" options={optdept} label="Department" />
        <DatePickerComp control={control} name="from" label="From" />
        <DatePickerComp control={control} name="to" label="To" />
        <Tooltip title={"Download Excel"}>
          <Button onClick={() => downloadReport()}>
            <DownloadOutlined />
          </Button>
        </Tooltip>
      </Box>
      <TableSimpleVirtualized rowsData={data_row} columns={columns} />
    </Box>
  );
}
