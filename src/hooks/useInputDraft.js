import { useCallback, useReducer, useRef } from "react";

/**
 * Text typed into an uncontrolled input stays out of the surrounding form's
 * render cycle. Submit handlers read the ref immediately, including the last
 * keystroke. Resetting a draft remounts its input; refreshing only updates
 * dependent copy (such as the email reason preview) after the input blurs.
 */
export default function useInputDraft(initialValue) {
  const draft = useRef(initialValue);
  const inputKey = useRef(0);
  const [, refresh] = useReducer(version => version + 1, 0);
  const reset = useCallback(value => {
    const next = typeof value === "function" ? value(draft.current) : value;
    if (Object.is(next, draft.current)) return;
    draft.current = next;
    inputKey.current += 1;
    refresh();
  }, []);
  return [draft, reset, inputKey.current, refresh];
}
