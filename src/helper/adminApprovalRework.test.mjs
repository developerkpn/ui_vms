import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The helper is an ES module inside a package that defaults to CommonJS, so a
// plain import of the .js path would be parsed as CJS and blow up on `export`.
// The module has no imports of its own, so loading its source through a data:
// URL gives the real exports without a bundler.
const helperPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "adminApprovalRework.js"
);
const helper = await import(
  `data:text/javascript;base64,${fs.readFileSync(helperPath).toString("base64")}`
);

const {
  buildMassReworkRequestBody,
  buildNewApproverOptions,
  buildReworkDestinationPayload,
  buildReworkDestinationSlots,
  buildSingleReworkRequestBody,
  canAddReworkApprover,
  describeReworkDestination,
  formatReworkStepLabel,
  normalizeNotifyVia,
  resolveReworkRequester,
  resolveReworkToLevel,
  validateReworkDestination,
  NOTIFY_VIA_APP,
  NOTIFY_VIA_EMAIL,
  REWORK_TO_NEW_APPROVER,
  REWORK_TO_REQUESTER,
} = helper;

const approvedStep = {
  level: 1,
  kind: "MANUAL",
  label: "Approval 1",
  status: "APPROVED",
  approverName: "Budi Santoso",
};
const skippedStep = {
  level: 2,
  kind: "MANUAL",
  label: "Approval 2",
  status: "SKIPPED",
  approverName: "Citra Dewi",
};
const mdmStep = { level: 3, kind: "MDM", label: "Master Data", status: "WAITING" };

test("step labels append the email only when the payload carries one", () => {
  assert.equal(formatReworkStepLabel(approvedStep), "Approval 1 - Budi Santoso");
  assert.equal(
    formatReworkStepLabel({ ...approvedStep, approverEmail: "budi@kpn.co.id" }),
    "Approval 1 - Budi Santoso - budi@kpn.co.id"
  );
  assert.equal(formatReworkStepLabel({ level: 3 }), "Approval 3");
});

test("rows are the requester plus the real manual steps, never padded", () => {
  const slots = buildReworkDestinationSlots({
    approvalSteps: [approvedStep, skippedStep, mdmStep],
    requesterLabel: "requester@kpn.co.id",
  });

  assert.equal(slots.length, 3);
  assert.equal(slots[0].label, "Requestor - requester@kpn.co.id");
  assert.equal(slots[0].value, REWORK_TO_REQUESTER);
  assert.equal(slots[0].selectable, true);
  // An approved step is a rewind target; a step nobody acted on is not.
  assert.equal(slots[1].label, "Approval 1 - Budi Santoso");
  assert.equal(slots[1].value, "1");
  assert.equal(slots[1].selectable, true);
  assert.equal(slots[2].label, "Approval 2 - Citra Dewi");
  assert.equal(slots[2].selectable, false);
  assert.match(slots[2].disabledReason, /approved/i);
  // No placeholder rows, and a request with a chain never offers the button.
  assert.equal(slots.some(slot => slot.label.includes("N/A")), false);
  assert.equal(canAddReworkApprover(slots), false);
});

test("a chainless request renders no approval row and offers the add button", () => {
  const slots = buildReworkDestinationSlots({
    approvalSteps: [mdmStep],
    requesterLabel: "requester@kpn.co.id",
  });

  assert.equal(slots.length, 1);
  assert.equal(slots[0].value, REWORK_TO_REQUESTER);
  assert.equal(canAddReworkApprover(slots), true);
  assert.equal(canAddReworkApprover(null), false);
});

test("a picked user becomes a selectable Approval 1 row and hides the button", () => {
  const slots = buildReworkDestinationSlots({
    approvalSteps: [mdmStep],
    requesterLabel: "requester@kpn.co.id",
    newApprover: { id: "u-1", fullName: "Siti Aminah", email: "siti@kpn.co.id" },
  });

  assert.equal(slots.length, 2);
  assert.equal(slots[1].label, "Approval 1 - Siti Aminah - siti@kpn.co.id");
  assert.equal(slots[1].value, REWORK_TO_NEW_APPROVER);
  assert.equal(slots[1].kind, "NEW_APPROVER");
  assert.equal(slots[1].selectable, true);
  assert.equal(canAddReworkApprover(slots), false);

  // A request that already has a chain ignores a picked user entirely.
  const withChain = buildReworkDestinationSlots({
    approvalSteps: [approvedStep, mdmStep],
    requesterLabel: "requester@kpn.co.id",
    newApprover: { id: "u-1", fullName: "Siti Aminah" },
  });
  assert.equal(withChain.length, 2);
  assert.equal(withChain.some(slot => slot.kind === "NEW_APPROVER"), false);
});

test("mass requests render real steps but never allow a rewind", () => {
  const slots = buildReworkDestinationSlots({
    approvalSteps: [approvedStep, mdmStep],
    requesterLabel: "requester",
    allowStepRewind: false,
  });

  assert.equal(slots.length, 2);
  assert.equal(slots[1].selectable, false);
  assert.match(slots[1].disabledReason, /requester/i);
  assert.equal(slots[0].selectable, true);
});

test("a chainless mass request can still add an approver", () => {
  const empty = buildReworkDestinationSlots({
    approvalSteps: [mdmStep],
    requesterLabel: "requester",
    allowStepRewind: false,
  });
  assert.equal(canAddReworkApprover(empty), true);

  const added = buildReworkDestinationSlots({
    approvalSteps: [mdmStep],
    requesterLabel: "requester",
    newApprover: { id: "u-1", fullName: "Siti Aminah", email: "siti@kpn.co.id" },
    allowStepRewind: false,
  });
  // The newApprovers path works on mass even though a level rewind does not.
  assert.equal(added[1].selectable, true);
  assert.equal(added[1].value, REWORK_TO_NEW_APPROVER);
});

test("the requester destination still resolves to a null level", () => {
  assert.equal(resolveReworkToLevel(REWORK_TO_REQUESTER), null);
  assert.equal(resolveReworkToLevel(REWORK_TO_NEW_APPROVER), null);
  assert.equal(resolveReworkToLevel("2"), 2);
});

test("a hand-picked approver travels as a one-element array, never with a level", () => {
  const payload = buildReworkDestinationPayload({
    selectedValue: REWORK_TO_NEW_APPROVER,
    newApprover: { id: "u-1" },
    notifyVia: "email",
  });

  assert.deepEqual(payload, { newApprovers: ["u-1"], notifyVia: NOTIFY_VIA_EMAIL });
  assert.equal("reworkToLevel" in payload, false);

  assert.deepEqual(
    buildReworkDestinationPayload({ selectedValue: REWORK_TO_REQUESTER }),
    { reworkToLevel: null }
  );
  assert.deepEqual(buildReworkDestinationPayload({ selectedValue: "2" }), {
    reworkToLevel: 2,
  });
});

test("request bodies keep the legacy shape until newApprovers is involved", () => {
  assert.deepEqual(
    buildSingleReworkRequestBody({ reason: "fix it", destination: { reworkToLevel: null } }),
    { reason: "fix it", reworkToLevel: null }
  );
  assert.deepEqual(
    buildSingleReworkRequestBody({
      reason: "fix it",
      destination: { newApprovers: ["u-1"], notifyVia: NOTIFY_VIA_APP },
    }),
    { reason: "fix it", newApprovers: ["u-1"], notifyVia: NOTIFY_VIA_APP }
  );
  assert.deepEqual(buildMassReworkRequestBody({ reason: "fix it", destination: {} }), {
    reason: "fix it",
  });
  assert.deepEqual(
    buildMassReworkRequestBody({
      reason: "fix it",
      destination: { newApprovers: ["u-1"], notifyVia: "EMAIL" },
    }),
    { reason: "fix it", newApprovers: ["u-1"], notifyVia: NOTIFY_VIA_EMAIL }
  );
});

test("notifyVia falls back to the in-app default", () => {
  assert.equal(normalizeNotifyVia("email"), NOTIFY_VIA_EMAIL);
  assert.equal(normalizeNotifyVia("EMAIL"), NOTIFY_VIA_EMAIL);
  assert.equal(normalizeNotifyVia("sms"), NOTIFY_VIA_APP);
  assert.equal(normalizeNotifyVia(undefined), NOTIFY_VIA_APP);
});

test("the added approver rejects an empty pick, the requester, and the actor", () => {
  const requesterIdentifiers = ["req-1", "requester"];
  const actorIdentifiers = ["mdm-1", "mdmuser"];

  assert.match(
    validateReworkDestination({
      selectedValue: REWORK_TO_NEW_APPROVER,
      requesterIdentifiers,
      actorIdentifiers,
    }),
    /Pilih user/
  );
  assert.match(
    validateReworkDestination({
      selectedValue: REWORK_TO_NEW_APPROVER,
      newApprover: { id: "req-1" },
      requesterIdentifiers,
      actorIdentifiers,
    }),
    /requester/
  );
  assert.match(
    validateReworkDestination({
      selectedValue: REWORK_TO_NEW_APPROVER,
      newApprover: { id: "u-9", username: "mdmuser" },
      requesterIdentifiers,
      actorIdentifiers,
    }),
    /diri Anda/
  );
  assert.equal(
    validateReworkDestination({
      selectedValue: REWORK_TO_NEW_APPROVER,
      newApprover: { id: "u-9", username: "someone" },
      requesterIdentifiers,
      actorIdentifiers,
    }),
    ""
  );
  // Requester and rewind destinations are never blocked.
  assert.equal(validateReworkDestination({ selectedValue: REWORK_TO_REQUESTER }), "");
  assert.equal(validateReworkDestination({ selectedValue: "2" }), "");
});

test("picker options are labelled Name - email and drop excluded identifiers", () => {
  const options = buildNewApproverOptions({
    users: [
      { id: "u-1", value: "siti", username: "siti", fullName: "Siti", email: "siti@kpn.co.id" },
      { id: "req-1", value: "requester", username: "requester", fullName: "Rangga", email: "r@kpn.co.id" },
      { id: "", value: "", fullName: "Broken" },
    ],
    excludeIdentifiers: ["req-1", ""],
  });

  assert.deepEqual(
    options.map(option => option.label),
    ["Siti - siti@kpn.co.id"]
  );
  assert.equal(options[0].id, "u-1");
});

test("the requester falls back to the username when no email is exposed", () => {
  const single = resolveReworkRequester({
    createdBy: "rangga",
    rawRow: { requester_user_id: "req-1", created_by: "rangga" },
  });
  assert.equal(single.label, "rangga");
  assert.ok(single.identifiers.includes("req-1"));
  assert.ok(single.identifiers.includes("rangga"));

  const withEmail = resolveReworkRequester({ rawRow: { requester_email: "r@kpn.co.id" } });
  assert.equal(withEmail.label, "r@kpn.co.id");

  const mass = resolveReworkRequester({ createdBy: "rangga", requesterUserId: "req-1" });
  assert.equal(mass.label, "rangga");
  assert.ok(mass.identifiers.includes("req-1"));
});

test("the success message names a non-requester destination only", () => {
  const slots = buildReworkDestinationSlots({
    approvalSteps: [approvedStep, mdmStep],
    requesterLabel: "rangga",
  });

  assert.equal(describeReworkDestination({ slots, selectedValue: REWORK_TO_REQUESTER }), null);
  assert.equal(
    describeReworkDestination({ slots, selectedValue: "1" }),
    "Approval 1 - Budi Santoso"
  );
});
