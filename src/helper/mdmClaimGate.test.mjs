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
  "mdmClaimGate.js"
);
const helper = await import(
  `data:text/javascript;base64,${fs.readFileSync(helperPath).toString("base64")}`
);

const {
  applyOptimisticMdmClaim,
  buildClaimMdmPath,
  evaluateMdmClaimGate,
  extractClaimedApprovalSteps,
  hasApprovedEarlierStep,
  identifiersMatch,
  isBlankIdentifier,
  isMdmStep,
  MDM_CLAIM_ERROR_FALLBACK,
  MDM_CLAIM_NOTICE_CLAIMED_BY_OTHER,
  MDM_CLAIM_NOTICE_UNCLAIMED,
  resolveMdmClaimErrorMessage,
  resolveStepApproverUserId,
  resolveStepKind,
} = helper;

const MDM_USER_ID = 42;

function buildSteps({ mdmApproverUserId = null, approval1UserId = 7 } = {}) {
  return [
    {
      level: 1,
      kind: "MANUAL",
      status: "APPROVED",
      approverUserId: approval1UserId,
    },
    {
      level: 2,
      kind: "MDM",
      status: "WAITING",
      approverUserId: mdmApproverUserId,
    },
  ];
}

function gateFor(overrides = {}) {
  return evaluateMdmClaimGate({
    approvalSteps: buildSteps(),
    isMdmStageActive: true,
    mdmApproverUserId: null,
    currentUserId: MDM_USER_ID,
    isMdmUser: true,
    canSubmitApprovalAction: true,
    ...overrides,
  });
}

test("identifiersMatch compares across payload types and never matches nobody", () => {
  assert.equal(identifiersMatch(42, "42"), true);
  assert.equal(identifiersMatch(" 42 ", 42), true);
  assert.equal(identifiersMatch(null, null), false);
  assert.equal(identifiersMatch("", ""), false);
  assert.equal(identifiersMatch(undefined, 42), false);
  assert.equal(identifiersMatch(42, 43), false);
});

test("isBlankIdentifier reads an unclaimed step's approver as nobody", () => {
  assert.equal(isBlankIdentifier(null), true);
  assert.equal(isBlankIdentifier(undefined), true);
  assert.equal(isBlankIdentifier("   "), true);
  assert.equal(isBlankIdentifier(0), false);
  assert.equal(isBlankIdentifier("42"), false);
});

test("step readers accept either payload casing", () => {
  assert.equal(resolveStepKind({ stage_kind: "mdm" }), "MDM");
  assert.equal(resolveStepKind({ kind: "MANUAL" }), "MANUAL");
  assert.equal(resolveStepKind({}), "");
  assert.equal(isMdmStep({ stage_kind: "MDM" }), true);
  assert.equal(isMdmStep({ kind: "MANUAL" }), false);
  assert.equal(resolveStepApproverUserId({ approver_user_id: 9 }), 9);
  assert.equal(resolveStepApproverUserId({ approverUserId: 9 }), 9);
  assert.equal(resolveStepApproverUserId({}), null);
});

test("hasApprovedEarlierStep only counts this user's non-MDM steps", () => {
  const steps = buildSteps({ approval1UserId: MDM_USER_ID });

  assert.equal(hasApprovedEarlierStep({ approvalSteps: steps, userId: MDM_USER_ID }), true);
  assert.equal(hasApprovedEarlierStep({ approvalSteps: buildSteps(), userId: MDM_USER_ID }), false);
  // Holding the MDM step itself is not "an earlier step".
  assert.equal(
    hasApprovedEarlierStep({
      approvalSteps: buildSteps({ mdmApproverUserId: MDM_USER_ID }),
      userId: MDM_USER_ID,
    }),
    false
  );
  assert.equal(hasApprovedEarlierStep({ approvalSteps: null, userId: MDM_USER_ID }), false);
  assert.equal(hasApprovedEarlierStep(), false);
});

test("buildClaimMdmPath keys the two request tables apart", () => {
  assert.equal(
    buildClaimMdmPath({ requestId: 12, isMassRequest: true }),
    "/material/requests/mass/12/claim-mdm"
  );
  assert.equal(
    buildClaimMdmPath({ requestId: 12 }),
    "/material/requests/single/12/claim-mdm"
  );
  assert.equal(buildClaimMdmPath({ requestId: null, isMassRequest: true }), "");
  assert.equal(buildClaimMdmPath(), "");
});

test("an MDM user sees the grab on an unclaimed, actionable Master Data stage", () => {
  const gate = gateFor();

  assert.equal(gate.canGrabMdm, true);
  assert.equal(gate.isMdmUnclaimed, true);
  assert.equal(gate.isMdmClaimedByMe, false);
  assert.equal(gate.claimNotice, MDM_CLAIM_NOTICE_UNCLAIMED);
});

test("the claimer acts instead of grabbing, and is told nothing", () => {
  const gate = gateFor({
    approvalSteps: buildSteps({ mdmApproverUserId: MDM_USER_ID }),
    mdmApproverUserId: MDM_USER_ID,
  });

  assert.equal(gate.isMdmClaimedByMe, true);
  assert.equal(gate.canGrabMdm, false);
  assert.equal(gate.claimNotice, "");
});

test("a step claimed by another MDM user is neither grabbable nor mine", () => {
  const gate = gateFor({
    approvalSteps: buildSteps({ mdmApproverUserId: 99 }),
    mdmApproverUserId: 99,
  });

  assert.equal(gate.canGrabMdm, false);
  assert.equal(gate.isMdmClaimedByMe, false);
  assert.equal(gate.isMdmUnclaimed, false);
  assert.equal(gate.claimNotice, MDM_CLAIM_NOTICE_CLAIMED_BY_OTHER);
});

test("separation of duties hides the grab from an earlier approver", () => {
  const steps = buildSteps({ approval1UserId: MDM_USER_ID });
  const gate = gateFor({ approvalSteps: steps });

  assert.equal(gate.hasApprovedEarlierStep, true);
  assert.equal(gate.canGrabMdm, false);
  // No notice either: this user is never getting the button, so explaining a
  // missing one would only invite them to wait for it.
  assert.equal(gate.claimNotice, "");
});

test("non-MDM users and non-MDM stages get no grab and no notice", () => {
  const nonMdmUser = gateFor({ isMdmUser: false });
  assert.equal(nonMdmUser.canGrabMdm, false);
  assert.equal(nonMdmUser.claimNotice, "");

  const manualStage = gateFor({ isMdmStageActive: false, mdmApproverUserId: 7 });
  assert.equal(manualStage.canGrabMdm, false);
  assert.equal(manualStage.isMdmClaimedByMe, false);
  assert.equal(manualStage.isMdmUnclaimed, false);
  assert.equal(manualStage.claimNotice, "");
});

test("a request that is no longer actionable cannot be grabbed", () => {
  const gate = gateFor({ canSubmitApprovalAction: false });

  assert.equal(gate.canGrabMdm, false);
  assert.equal(gate.claimNotice, "");
});

test("evaluateMdmClaimGate defaults to a closed gate", () => {
  const gate = evaluateMdmClaimGate();

  assert.deepEqual(gate, {
    isMdmUnclaimed: false,
    isMdmClaimedByMe: false,
    hasApprovedEarlierStep: false,
    canGrabMdm: false,
    claimNotice: "",
  });
});

test("extractClaimedApprovalSteps unwraps every envelope the endpoints use", () => {
  const steps = buildSteps();

  assert.deepEqual(extractClaimedApprovalSteps({ data: { approvalSteps: steps } }), steps);
  assert.deepEqual(extractClaimedApprovalSteps({ data: { approval_steps: steps } }), steps);
  assert.deepEqual(extractClaimedApprovalSteps({ approvalSteps: steps }), steps);
  assert.deepEqual(extractClaimedApprovalSteps({ approval_steps: steps }), steps);
  assert.deepEqual(extractClaimedApprovalSteps({ data: steps }), steps);
  assert.equal(extractClaimedApprovalSteps({ success: true }), null);
  assert.equal(extractClaimedApprovalSteps(undefined), null);
});

test("applyOptimisticMdmClaim marks the open Master Data step as mine", () => {
  const steps = buildSteps();
  const next = applyOptimisticMdmClaim({
    approvalSteps: steps,
    currentStageLevel: 2,
    userId: MDM_USER_ID,
  });

  assert.equal(next.length, 2);
  assert.equal(next[1].approverUserId, MDM_USER_ID);
  assert.equal(next[1].status, "WAITING");
  // The earlier steps are untouched, and the input is not mutated.
  assert.equal(next[0], steps[0]);
  assert.equal(steps[1].approverUserId, null);
});

test("applyOptimisticMdmClaim stands up the claimed step when there are none", () => {
  assert.deepEqual(
    applyOptimisticMdmClaim({ currentStageLevel: 3, userId: MDM_USER_ID }),
    [{ level: 3, kind: "MDM", status: "WAITING", approverUserId: MDM_USER_ID }]
  );
});

test("applyOptimisticMdmClaim appends when no open Master Data step is present", () => {
  const steps = buildSteps({ mdmApproverUserId: 99 });
  const next = applyOptimisticMdmClaim({
    approvalSteps: steps,
    currentStageLevel: 2,
    userId: MDM_USER_ID,
  });

  assert.equal(next.length, 3);
  assert.equal(next[1].approverUserId, 99);
  assert.equal(next[2].approverUserId, MDM_USER_ID);
});

test("resolveMdmClaimErrorMessage prefers the backend's reason", () => {
  assert.equal(
    resolveMdmClaimErrorMessage({
      response: {
        data: {
          code: "MASS_REQUEST_MDM_CLAIM_PRIOR_APPROVER",
          message:
            "Forbidden: you already acted as an approver on this request and cannot claim its Master Data step",
        },
      },
    }),
    "Forbidden: you already acted as an approver on this request and cannot claim its Master Data step"
  );
  assert.equal(resolveMdmClaimErrorMessage(new Error("Network Error")), MDM_CLAIM_ERROR_FALLBACK);
  assert.equal(resolveMdmClaimErrorMessage(), MDM_CLAIM_ERROR_FALLBACK);
});
