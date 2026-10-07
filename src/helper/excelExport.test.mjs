import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  buildMyApprovalSheetRows,
  buildMyRequestSheetRows,
  buildWorkbook,
  exportFileName,
  requestStatusLabel,
} from "./excelExport.js";

// The page passes the rows it already filtered, searched and sorted; these
// tests pin that the sheet keeps exactly those rows, in that order, with the
// table's columns and status text.

const singleRow = {
  ticketNumber: "1000000071",
  ticketType: "Create",
  finalCode: "937.096.093",
  materialDescription: "P/N 41C3478 RIM AS",
  uom: "PC",
  status: "DONE",
  sapPushStatus: "SYNCED",
  createdBy: "Mei Limbong",
  createdAt: "06/10/2026",
  assignedTo: "-",
};

test("My Request single rows keep the table's columns, order and SAP-aware status", () => {
  const rows = buildMyRequestSheetRows(
    [singleRow, { ...singleRow, ticketNumber: "1000000070", finalCode: null, sapPushStatus: null, status: "Submit" }],
    "single"
  );
  assert.deepEqual(Object.keys(rows[0]), [
    "Ticket Number", "Ticket Type", "Material Code", "Material Description",
    "UOM", "Status", "Requested by", "Requested at", "Assigned to",
  ]);
  assert.deepEqual(rows.map(row => row["Ticket Number"]), ["1000000071", "1000000070"]);
  assert.equal(rows[0].Status, "Done");
  assert.equal(rows[0]["Material Code"], "937.096.093");
  assert.equal(rows[1].Status, "Submit");
  assert.equal(rows[1]["Material Code"], "");
});

test("My Request mass rows carry the reason instead of a description", () => {
  const [row] = buildMyRequestSheetRows(
    [{ ticketNumber: "2000000008", ticketType: "Create", massRequestReason: "Part loader liugong", status: "Partial", sapPushStatus: "SYNCED" }],
    "mass"
  );
  assert.equal(row["Mass Request Reason"], "Part loader liugong");
  assert.equal("Material Description" in row, false);
  assert.equal(row.Status, "Partial"); // Partial outranks the SAP state
});

test("requestStatusLabel follows the status cell", () => {
  assert.equal(requestStatusLabel({ status: "DONE", sapPushStatus: "ERROR" }), "SAP Error");
  assert.equal(requestStatusLabel({ status: "Rework" }), "Rework");
  assert.equal(requestStatusLabel(null), "");
});

test("My Approval has a single and a mass shape", () => {
  const [single] = buildMyApprovalSheetRows([{ ...singleRow, sapPushStatus: "PENDING" }], "single");
  assert.equal(single.Status, "Waiting SAP");
  assert.equal(single["Ticket Number"], "1000000071");
  const [mass] = buildMyApprovalSheetRows(
    [{ massRequestNo: "2000000008", ticketType: "Create", massRequestReason: "Loader", status: "Partial", createdBy: "A", createdAt: "x", assignedTo: "B" }],
    "mass"
  );
  assert.deepEqual(Object.keys(mass), [
    "Ticket Number", "Ticket Type", "Mass Request Reason", "Status", "Requested by", "Requested at", "Assigned to",
  ]);
  assert.equal(mass["Ticket Number"], "2000000008");
  assert.equal(mass.Status, "Partial");
});

test("an empty list still downloads a sheet with its header row", () => {
  const workbook = buildWorkbook([], ["Ticket Number", "Status"], "Single Requests");
  const sheet = workbook.Sheets["Single Requests"];
  assert.deepEqual(XLSX.utils.sheet_to_json(sheet, { header: 1 }), [["Ticket Number", "Status"]]);
});

test("the workbook holds every given row in order, with sized columns", () => {
  const sheetRows = buildMyRequestSheetRows(
    Array.from({ length: 25 }, (_, i) => ({ ...singleRow, ticketNumber: String(1000000100 + i) })),
    "single"
  );
  const workbook = buildWorkbook(sheetRows, [], "Single Requests");
  const sheet = workbook.Sheets["Single Requests"];
  const back = XLSX.utils.sheet_to_json(sheet);
  assert.equal(back.length, 25); // all pages, not just the 10 on screen
  assert.equal(back[0]["Ticket Number"], "1000000100");
  assert.equal(back[24]["Ticket Number"], "1000000124");
  assert.ok(sheet["!cols"][3].wch >= "Material Description".length);
});

test("file names say which page and tab they came from", () => {
  const now = new Date(2026, 9, 7);
  assert.equal(exportFileName("My Request", "single", now), "My Request - Single - 2026-10-07.xlsx");
  assert.equal(exportFileName("My Approval", "mass", now), "My Approval - Mass - 2026-10-07.xlsx");
});
