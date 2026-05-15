# Spec: Material Administrator Approver Assignment

## Context
The route `https://localhost:3000/dashboard/materials/administrator` currently shows a material administrator table with `Approval 1`, `Approval 2`, and `Approval 3`, but it does not persist administrator approver assignments yet.

The requested behavior is:
- `Approval 1` is selected manually from a dropdown.
- `Approval 2` is selected manually from a dropdown.
- `Approval 3` is assigned automatically by the system from users in the `MDM_MATERIAL` group.
- All three approvers must be different users.
- Users from `MDM_MATERIAL` must never appear in the `Approval 1` or `Approval 2` dropdowns.
- `Approval 1` and `Approval 2` must exclude each other in both directions.
- `Approval 1` and `Approval 2` can only be changed while their own status is still `WAITING`.
- `Approval 3` is read-only and cannot be changed manually.
- The UI may show `Reject`, but the database status remains `REJECTED`.

## Schema Findings
The database already has a dedicated approval snapshot table for single material requests:
- `public.mat_single_request`
- `public.mat_single_request_approval`

The approval snapshot stores:
- `request_id`
- `requester_user_id`
- `approval_1_user_id`, `approval_1_status`, `approval_1_at`, `approval_1_remark`
- `approval_2_user_id`, `approval_2_status`, `approval_2_at`, `approval_2_remark`
- `approval_3_user_id`, `approval_3_status`, `approval_3_at`, `approval_3_remark`
- `updated_at`

The existing migration also shows that `MDM_MATERIAL` users are discovered through:
- `mst_user`
- joined to `mst_page_access`
- using `mst_user.user_group = mst_page_access.user_group_id`
- filtered by `mst_page_access.user_group_name = 'MDM_MATERIAL'`

That join path should be reused so the new assignment logic matches the current database model instead of introducing a different group lookup.

## Design

### Frontend behavior
The page will remain at `src/pages/dashboard/MaterialsAdministratorPlaceholder.jsx`.

When the page loads:
- Fetch the request inbox rows from `/material/requests/single/approval-inbox`.
- Fetch users from `/user/`.
- Normalize users into two effective groups in the UI:
  - manual approver candidates: active users not in `MDM_MATERIAL`
  - system approver candidates: active users in `MDM_MATERIAL`

Dropdown behavior:
- `Approval 1` dropdown shows only active non-`MDM_MATERIAL` users.
- `Approval 2` dropdown shows only active non-`MDM_MATERIAL` users.
- If `Approval 1` is selected, that same user is excluded from `Approval 2`.
- If `Approval 2` is selected, that same user is excluded from `Approval 1`.
- `Approval 1` dropdown is disabled if `approval_1_status` is not `WAITING`.
- `Approval 2` dropdown is disabled if `approval_2_status` is not `WAITING`.
- `Approval 3` stays display-only with a chip or helper text and has no editable control.

Auto-save behavior:
- Changing `Approval 1` or `Approval 2` immediately calls a new dedicated assignment API.
- The affected row enters a saving state while the request is in flight.
- On success, the row is refreshed from the API response and a success notification is shown.
- On failure, the UI restores the previous row value and shows an error notification.

Suggested success notifications:
- `Approval 1 berhasil disimpan.`
- `Approval 2 berhasil disimpan.`
- `Approver berhasil diperbarui. Approval 3 sudah ditentukan oleh sistem.`

Suggested error notifications:
- `Approval 1 tidak dapat diubah karena status sudah Approved.`
- `Approval 2 harus berbeda dengan Approval 1.`
- `Approval 3 gagal ditentukan karena user group MDM_MATERIAL tidak tersedia.`

### Backend API
Add a new endpoint dedicated to administrator assignment instead of changing the existing approval action API:

`PATCH /material/requests/single/:id/assign-approvers`

Example payload:

```json
{
  "approval1UserId": "user-a",
  "approval2UserId": "user-b"
}
```

This endpoint is responsible for:
- loading the request from `mat_single_request`
- loading or creating the request snapshot in `mat_single_request_approval`
- validating all assignment rules
- assigning `Approval 3` automatically when appropriate
- updating `mat_single_request.assigned_to` if the stage label should stay in sync

The API must support partial updates because the page auto-saves after each dropdown change. That means:
- if only `approval1UserId` changes, the API still validates against the current `approval_2_user_id`
- if only `approval2UserId` changes, the API still validates against the current `approval_1_user_id`

### Backend validation rules
The API must enforce the following rules even if the frontend already filters options:

1. The request must exist.
2. The approval snapshot row must exist or be created on demand.
3. `approval_1_status`, `approval_2_status`, and `approval_3_status` should be treated as `WAITING` when null for editability checks.
4. A submitted `approval1UserId` must belong to an active user.
5. A submitted `approval2UserId` must belong to an active user.
6. `approval1UserId` must not belong to `MDM_MATERIAL`.
7. `approval2UserId` must not belong to `MDM_MATERIAL`.
8. `approval1UserId` and `approval2UserId` must be different users.
9. `approval1UserId` can only be changed if `approval_1_status = 'WAITING'`.
10. `approval2UserId` can only be changed if `approval_2_status = 'WAITING'`.
11. `approval3UserId` is never accepted from the client.
12. `approval_3_user_id` cannot be manually changed from this endpoint.

### Approval 3 assignment rule
After applying the manual updates:
- if `approval_3_user_id` is already filled, keep it unchanged
- if `approval_3_user_id` is empty and both `approval_1_user_id` and `approval_2_user_id` are present:
  - find active `MDM_MATERIAL` users using the existing `mst_user` + `mst_page_access` join pattern
  - exclude the selected `approval_1_user_id`
  - exclude the selected `approval_2_user_id`
  - choose one candidate randomly
  - save it into `approval_3_user_id`
  - keep `approval_3_status` as `WAITING`

This is intentionally different from the legacy migration that auto-approved `Approval 3`. The new behavior only auto-assigns the user and does not auto-complete the stage.

### Stage synchronization
To keep the request header aligned with the latest approval state, the backend should continue syncing `mat_single_request.assigned_to` based on the snapshot:
- `Approval 1` when Approval 1 is still pending
- `Approval 2` when Approval 1 is approved and Approval 2 is still pending
- `Approval 3` when Approval 1 and Approval 2 are approved and Approval 3 is still pending
- `Completed` when Approval 3 is approved

The assign endpoint should only adjust `assigned_to` if the recalculated stage differs from the current value.

## Scope

### Affected frontend files
- `src/pages/dashboard/MaterialsAdministratorPlaceholder.jsx`: add filtered dropdown options, per-row saving state, auto-save calls, rollback, notifications, and disabled behavior.

### Affected backend areas
- material single request routes
- material single request controller/service
- approval snapshot query/update logic

### Out of scope
- changing the existing `/material/requests/single/:id/approve` endpoint behavior
- changing the schema for `mat_single_request_approval`
- allowing manual override for `Approval 3`
- changing the existing approval history UI

## Testing
- `Approval 1` dropdown excludes `MDM_MATERIAL` users.
- `Approval 2` dropdown excludes `MDM_MATERIAL` users.
- Selecting a user in `Approval 1` removes the same user from `Approval 2`.
- Selecting a user in `Approval 2` removes the same user from `Approval 1`.
- Changing `Approval 1` while status is `WAITING` auto-saves successfully.
- Changing `Approval 2` while status is `WAITING` auto-saves successfully.
- Trying to reuse the same user for `Approval 1` and `Approval 2` is rejected.
- When both manual approvers are filled and `Approval 3` is empty, the API auto-assigns a random `MDM_MATERIAL` user.
- The generated `Approval 3` user is never equal to `Approval 1` or `Approval 2`.
- Once `approval_1_status` is `APPROVED`, `REWORK`, or `REJECTED`, `Approval 1` is disabled.
- Once `approval_2_status` is `APPROVED`, `REWORK`, or `REJECTED`, `Approval 2` is disabled.
- `Approval 3` remains read-only in all states.
