// Indonesian rupiah input formatting for price fields (e.g. Moving Avg Price).
//
// The form state / validation / SAP payload all keep the PLAIN numeric string
// ("1500000.5", dot decimal, no separators) — only the rendered <input> shows
// the Indonesian display form ("1.500.000,5": dots for thousands, comma for
// decimals). formatIdrInput / parseIdrInput convert between the two on every
// keystroke, so nothing downstream of the TextField changes.

// "1500000.5" -> "1.500.000,5"; preserves a trailing decimal separator while
// the user is still typing ("1500." -> "1.500,").
export function formatIdrInput(raw) {
  const s = String(raw ?? "");
  if (s === "") return "";
  const [intPart = "", decPart] = s.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart === undefined ? grouped : `${grouped},${decPart}`;
}

// "1.500.000,5" -> "1500000.5" (strip thousand dots, comma -> dot decimal).
export function parseIdrInput(display) {
  return String(display ?? "")
    .replace(/\./g, "")
    .replace(",", ".");
}
