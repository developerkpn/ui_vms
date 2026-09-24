import test from "node:test";
import assert from "node:assert/strict";

import {
  ALL_REQUEST_STATUS_FILTER,
  REQUEST_STATUS_FILTER_OPTIONS,
  REQUEST_STATUS_FILTER_PREFERENCE_KEY,
  filterRequestRowsByStatus,
  getRequestStatusLabel,
  isAllRequestStatusFilter,
  resolveStoredRequestStatusFilter,
} from "./myRequestFilters.js";
import { STATUS_FILTER_PREFERENCE_KEY } from "./adminApprovalView.js";

test("the options offered match My Approval's, minus its Master Data extras", () => {
  assert.deepEqual(
    REQUEST_STATUS_FILTER_OPTIONS.map(option => option.value),
    ["All", "Submit", "Rework", "Cancel", "Done", "Waiting SAP", "SAP Error"]
  );
});

test("this page's preference key cannot collide with My Approval's", () => {
  assert.equal(REQUEST_STATUS_FILTER_PREFERENCE_KEY, "my_request.status_filter");
  assert.notEqual(REQUEST_STATUS_FILTER_PREFERENCE_KEY, STATUS_FILTER_PREFERENCE_KEY);
});

test("All is recognised whatever case or padding it arrives in", () => {
  for (const value of ["All", "all", "ALL", "  all  "]) {
    assert.equal(isAllRequestStatusFilter(value), true, value);
  }
  assert.equal(isAllRequestStatusFilter("Submit"), false);
});

test("a plain request filters under its approval status", () => {
  assert.equal(getRequestStatusLabel({ status: "SUBMIT" }), "Submit");
  assert.equal(getRequestStatusLabel({ status: "REWORK" }), "Rework");
  assert.equal(getRequestStatusLabel({ status: "CANCELLED" }), "Cancel");
  assert.equal(getRequestStatusLabel({ status: "DONE" }), "Done");
});

test("a rewound request filters as Submit, matching the pill this page shows", () => {
  // My Approval reports this row as Rework; the requester sees Submit because a
  // rewind between approval steps is not theirs to act on. The filter follows
  // what the requester sees.
  const rewound = {
    status: "SUBMIT",
    approvalSteps: [
      { level: 1, status: "APPROVE" },
      { level: 2, status: "REWORK" },
    ],
    assignmentCaption: "Waiting for Master Data",
  };

  assert.equal(getRequestStatusLabel(rewound), "Submit");
});

test("once pushed to SAP the staging state wins over the approval status", () => {
  // sap_push_status values, per helper/sapStatus.js: PENDING/PUSHED are still
  // waiting, SYNCED means SAP created it, ERROR means SAP rejected it.
  assert.equal(getRequestStatusLabel({ status: "DONE", sapPushStatus: "PENDING" }), "Waiting SAP");
  assert.equal(getRequestStatusLabel({ status: "DONE", sapPushStatus: "PUSHED" }), "Waiting SAP");
  assert.equal(getRequestStatusLabel({ status: "SUBMIT", sapPushStatus: "SYNCED" }), "Done");
  assert.equal(getRequestStatusLabel({ status: "DONE", sapPushStatus: "ERROR" }), "SAP Error");

  // Not pushed yet: the approval status stands.
  assert.equal(getRequestStatusLabel({ status: "DONE", sapPushStatus: null }), "Done");
  assert.equal(getRequestStatusLabel({ status: "DONE", sapPushStatus: "" }), "Done");
});

test("All returns every row untouched, including the same array contents", () => {
  const rows = [{ status: "SUBMIT" }, { status: "DONE" }, { status: "REWORK" }];

  assert.equal(filterRequestRowsByStatus(rows, "All").length, 3);
  assert.equal(filterRequestRowsByStatus(rows).length, 3);
});

test("a chosen status keeps only the rows showing it", () => {
  const rows = [
    { id: 1, status: "SUBMIT" },
    { id: 2, status: "DONE" },
    { id: 3, status: "REWORK" },
    { id: 4, status: "DONE", sapPushStatus: "PENDING" },
  ];

  assert.deepEqual(
    filterRequestRowsByStatus(rows, "Done").map(row => row.id),
    [2]
  );
  assert.deepEqual(
    filterRequestRowsByStatus(rows, "Waiting SAP").map(row => row.id),
    [4]
  );
  assert.deepEqual(filterRequestRowsByStatus(rows, "Cancel"), []);
});

test("filtering a missing or malformed list yields nothing rather than throwing", () => {
  assert.deepEqual(filterRequestRowsByStatus(undefined, "Done"), []);
  assert.deepEqual(filterRequestRowsByStatus(null, "All"), []);
});

test("a stored preference is applied only when it is still a real option", () => {
  assert.equal(resolveStoredRequestStatusFilter("Rework"), "Rework");
  assert.equal(resolveStoredRequestStatusFilter("SAP Error"), "SAP Error");
});

test("an unknown, empty or stale stored preference falls back to All", () => {
  for (const stored of ["", null, undefined, "Assigned To Me", "Nonsense", 42]) {
    assert.equal(
      resolveStoredRequestStatusFilter(stored),
      ALL_REQUEST_STATUS_FILTER,
      String(stored)
    );
  }
});
