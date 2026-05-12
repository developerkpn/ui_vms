# Spec: Approval Remark Pop-up

## Context
The user wants to add a remark/message field to the "Approve", "Rework", and "Reject" actions in the request approval form at the route `https://localhost:3000/dashboard/administrator/approval`.
When any of these 3 buttons are clicked, a pop-up appears to enter a remark/reason.

## Design
Based on the provided image, the pop-up will have:
- Title: "Reason" with a warning icon.
- Subtitle: "Please enter the reason before proceeding."
- A multiline text area field for the remark.
- Buttons: "Close" (gray) and "Save" (blue).

The design will be consistent across all three actions, but the "Save" behavior will differ based on which action triggered the pop-up.

## Scope
### Affected Files
- `src/components/admin-approval/AdminApprovalFormDialog.jsx`: Add the pop-up dialog and trigger it on button click.
- `src/pages/dashboard/AdminApprovalView.jsx`: Update `handleApprovalAction` to handle the remark.

### Out of Scope
- Modifying existing data display in `AdminApprovalFormDialog`.
- Changing the main action buttons' appearance.

## Proposed Changes
### `AdminApprovalFormDialog.jsx`
- Add a new state `remarkDialogOpen` (boolean).
- Add a new state `currentAction` (string: 'Approve' | 'Rework' | 'Reject').
- Add a new state `remarkText` (string).
- Implement a `Dialog` component matching the image.
- Update the `onClick` handlers of the Approve, Rework, and Reject buttons to open this dialog instead of calling `onAction` directly.
- The "Save" button in the dialog will call `onAction(currentAction, detail, remarkText)` and close the dialog.

### `AdminApprovalView.jsx`
- Update `handleApprovalAction` to accept `remark` as a parameter.
- Update the snackbar message to include the remark (or log it).

## Validation
- The remark field will be mandatory for "Rework" and "Reject" (Save button disabled if empty).
- For "Approve", it might be optional (or mandatory if the user prefers, but based on "apa alasannya" for reject and "apa pesannya" for approve, it seems they want to capture text for all. I will make it required for all to be safe, or allow empty for Approve if it's just a "message").
- Let's make it required for Rework and Reject, and optional for Approve by default, but customizable.

## Testing
- Click Approve -> Pop-up appears -> Enter text -> Click Save -> Verify action triggered.
- Click Rework -> Pop-up appears -> Verify validation if empty.
- Click Reject -> Pop-up appears -> Verify validation if empty.
