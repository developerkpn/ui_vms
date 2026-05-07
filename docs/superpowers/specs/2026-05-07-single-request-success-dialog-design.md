# Single Request Material Success Dialog Design

## Summary

Add a blocking success dialog to the single material request flow at `/dashboard/materials/request/single`.

Today, a successful save immediately redirects the user to `/dashboard/materials/request`. The new behavior should pause on the form page, show a success pop-up, and redirect only after the user explicitly clicks `OK`.

## Current Context

- Route page: `src/pages/dashboard/SingleRequestPage.jsx`
- Form component: `src/components/request-material/SingleMaterialForm.jsx`
- Save behavior currently lives inside `SingleMaterialForm`
- On successful `POST /material/requests/single`, the form immediately calls `navigate("/dashboard/materials/request")`
- Existing codebase already uses MUI `Dialog` components in multiple dashboard pages, so the new UI should follow that pattern

## Goal

After a successful save in the single request material form:

1. Show a success dialog with a message like `Saved successfully`
2. Prevent the dialog from closing via backdrop click or `Esc`
3. Redirect to `/dashboard/materials/request` only after the user clicks `OK`

## Non-Goals

- No API changes
- No backend changes
- No change to mass request flow
- No additional success snackbar for this action
- No form reset flow after save success

## Approach Options

### Option 1: Handle success dialog inside `SingleMaterialForm`

Keep the submit and redirect flow inside the form component. Replace the immediate redirect with a local dialog state and perform redirect from the dialog confirmation action.

Pros:

- Smallest code change
- Keeps success handling near the submit logic
- Lowest risk of unintended side effects

Cons:

- Success dialog state stays local to the form component

### Option 2: Lift success state to `SingleRequestPage`

Move post-save success handling to the page component by passing an `onSaveSuccess` callback from the page to the form.

Pros:

- Parent owns navigation
- Easier reuse if page-level post-submit logic grows later

Cons:

- More wiring across components
- More moving parts for a simple requirement

### Option 3: Snackbar plus delayed redirect

Show a toast/snackbar and redirect automatically after a short delay.

Pros:

- Fastest implementation

Cons:

- Does not meet the requirement that user must confirm before leaving

## Decision

Use Option 1.

Reasoning:

- The current submit flow already lives in `SingleMaterialForm`
- The requirement is isolated to the single request form
- The change should be minimal and easy to validate

## Detailed Design

### User Flow

1. User fills in the single material request form
2. User clicks `Save`
3. Frontend runs existing validation
4. Frontend submits `POST /material/requests/single`
5. If request fails:
   - Show existing inline error message behavior
   - Do not open the success dialog
6. If request succeeds:
   - Do not navigate immediately
   - Open a modal success dialog
7. User clicks `OK`
8. Frontend closes the dialog and navigates to `/dashboard/materials/request`

## Component Changes

### `src/components/request-material/SingleMaterialForm.jsx`

Add:

- Local boolean state for success dialog visibility
- A handler for confirming the dialog and triggering navigation
- A MUI `Dialog` rendered in the component tree

Change:

- Replace the current immediate redirect in `handleSave` with `setSuccessDialogOpen(true)`

Keep unchanged:

- Attachment validation
- Existing submit error handling
- Existing disabled state for `Save` button while submitting
- `onBack` behavior

## Dialog Behavior

- Message text: `Saved successfully`
- Primary action: `OK`
- Dialog close policy:
  - Must not close on backdrop click
  - Must not close on `Esc`
  - Must close only from `OK`
  - Implementation should ignore MUI `onClose` calls when reason is `backdropClick`
- Redirect target after confirmation: `/dashboard/materials/request`

## UX Notes

- The dialog should feel like a completion checkpoint, not a warning
- The layout can stay simple and follow existing MUI dialog styling already used in the repo
- The button label should use `OK` because the user explicitly requested a click-to-confirm action

## Error Handling

- API failure continues to use the existing inline `submitError` message
- Validation failure continues to block submission before API call
- If dialog confirmation handler runs, navigation should happen immediately without extra API work

## Testing Strategy

### Manual Checks

1. Save success opens the success dialog
2. Save success does not immediately redirect
3. Clicking outside the dialog does nothing
4. Pressing `Esc` does nothing
5. Clicking `OK` redirects to `/dashboard/materials/request`
6. Save failure shows error and does not open the dialog
7. Attachment validation failure still blocks submit as before

## Implementation Scope

Expected files:

- `src/components/request-material/SingleMaterialForm.jsx`

Possible file:

- `src/pages/dashboard/SingleRequestPage.jsx`

This second file should remain unchanged unless implementation reveals a small prop or flow adjustment is needed.

## Risks

- Low risk: change is local to the single request form
- Main regression risk: introducing a dialog that accidentally allows close by backdrop or `Esc`
- Main UX risk: changing success flow in a way that affects submit button state or duplicate submissions

## Acceptance Criteria

- Successful single material request save shows a success pop-up
- Pop-up stays visible until user clicks `OK`
- User returns to `/dashboard/materials/request` only after clicking `OK`
- Existing validation and error behavior still works
