/**
 * Multipart bodies for the two approval dialogs.
 *
 * An approve or rework action normally posts plain JSON. It only becomes
 * multipart when the reviewer staged an attachment change, because files
 * cannot travel in a JSON body — so these builders exist to carry the same
 * request that would otherwise have been sent, plus the files.
 */

/**
 * Copies a plain request body into a FormData, one key at a time.
 *
 * A string is appended as-is; anything else is JSON-stringified, because
 * FormData only carries strings and blobs. undefined is skipped rather than
 * appended.
 *
 * @param {FormData} formPayload - the payload being built, mutated in place
 * @param {object} requestBody - the JSON body this action would otherwise send
 */
function appendRequestBodyFields(formPayload, requestBody) {
  Object.entries(requestBody || {}).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    formPayload.append(
      key,
      typeof value === "string" ? value : JSON.stringify(value)
    );
  });
}

/**
 * Multipart body for a SINGLE request's approve/rework carrying a staged
 * attachment change.
 *
 * One keep/add set covers the whole action, matching the contract the
 * requester's own resubmit path already uses.
 *
 * @param {object} requestBody - the JSON body this action would otherwise send
 * @param {object} attachmentChange
 * @param {Array<number|string>} attachmentChange.keepAttachmentIds - ids of the
 *        existing attachments that survive; anything omitted is removed
 * @param {File[]} attachmentChange.files - newly picked files to add
 * @returns {FormData}
 */
export function buildRequestFormData(
  requestBody,
  { keepAttachmentIds, files }
) {
  const formPayload = new FormData();

  appendRequestBodyFields(formPayload, requestBody);

  formPayload.append("attachments", JSON.stringify({ keepAttachmentIds }));
  (files || []).forEach(file => {
    formPayload.append("files", file);
  });

  return formPayload;
}

/**
 * Multipart body for a MASS request's approve/rework carrying staged
 * attachment changes for one or more items.
 *
 * An attachment row on a mass request is stored against the item rather than
 * the batch, so this sends per-item sets instead of one set for the whole
 * action: each item's kept ids travel together in `itemAttachments`, and each
 * new file is paired with the item it belongs to via a parallel `fileItemId`
 * entry — the same positional pairing the requester's mass form uses for
 * `fileRowIndex`.
 *
 * @param {object} requestBody - the JSON body this action would otherwise send
 * @param {Array<{id: number|string, keepAttachmentIds: Array<number|string>, files: File[]}>} itemAttachmentChanges
 *        one entry per item the reviewer actually touched
 * @returns {FormData}
 */
export function buildMassRequestFormData(requestBody, itemAttachmentChanges) {
  const formPayload = new FormData();
  const changes = itemAttachmentChanges || [];

  appendRequestBodyFields(formPayload, requestBody);

  formPayload.append(
    "itemAttachments",
    JSON.stringify(
      changes.map(({ id, keepAttachmentIds }) => ({ id, keepAttachmentIds }))
    )
  );

  changes.forEach(({ id, files }) => {
    (files || []).forEach(file => {
      formPayload.append("files", file);
      formPayload.append("fileItemId", String(id));
    });
  });

  return formPayload;
}
