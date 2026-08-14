import { TextField } from "@mui/material";

/**
 * The requester's own comment box, shared by every surface that collects one:
 * the optional dialog on a new single Create submit, and the three mandatory
 * resubmit-after-rework surfaces (mass, Change/Extend, single Create). Plain
 * and unwrapped so it works equally inside a Dialog or embedded in a page's
 * own form body — the single Create resubmit is a full page, not a dialog.
 *
 * Validation and error state stay with the caller (via requestComments.js'
 * validateRequesterComment), the same way every sibling field in these forms
 * already owns its own error state — this component only renders it.
 *
 * @param {object} props
 * @param {string} [props.value]
 * @param {(next: string) => void} [props.onChange]
 * @param {boolean} [props.required] - Mandatory copy/asterisk for a resubmit.
 * @param {boolean} [props.error]
 * @param {string} [props.helperText]
 * @param {boolean} [props.autoFocus]
 * @param {boolean} [props.disabled]
 * @param {string} [props.label] - Overrides the default Comment / Comment (optional) label.
 */
export default function RequesterCommentField({
  value = "",
  onChange,
  required = false,
  error = false,
  helperText = "",
  autoFocus = false,
  disabled = false,
  label,
}) {
  return (
    <TextField
      autoFocus={autoFocus}
      required={required}
      multiline
      minRows={3}
      maxRows={6}
      fullWidth
      label={label ?? (required ? "Comment" : "Comment (optional)")}
      value={value}
      onChange={event => onChange?.(event.target.value)}
      error={error}
      helperText={helperText}
      disabled={disabled}
    />
  );
}
