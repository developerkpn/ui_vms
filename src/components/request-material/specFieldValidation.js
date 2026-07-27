/**
 * Real-time validation for specification fields based on template rules.
 *
 * validation_rule_type values from the database:
 *   - PREFIX           → must start with prefix_value (e.g. "P/N", "P/N|POS")
 *   - CAPITAL_NO_SPECIAL_CHARS → uppercase A-Z and 0-9 only, no special chars
 *   - ALPHANUMERIC_CAPITAL     → uppercase A-Z and 0-9 only
 *   - CAPITAL_ONLY             → uppercase A-Z only (and spaces)
 *   - MIXED_ALPHA_NUM_UNIT     → alphanumeric + common unit chars (/, ., -, etc.)
 *   - NUMERIC_ONLY             → digits only (and decimal point)
 *   - NONE                     → no validation
 */

/**
 * Validate a single specification field value against its rule.
 *
 * @param {string} value        – the current input value
 * @param {object} field        – the field definition from the schema
 * @returns {{ error: boolean, message: string }}
 */
export function validateSpecField(value, field) {
  // No validation needed
  if (!value || !field) {
    return { error: false, message: "" };
  }

  const ruleType = (field.validationRuleType || field.validation_rule_type || "NONE").toUpperCase();
  const prefixRaw = field.prefixValue || field.prefix_value || "";
  const ruleDetail = field.ruleDetail || field.rule_detail || "";

  switch (ruleType) {
    case "PREFIX": {
      // prefix_value can be "P/N" or "P/N|POS" (multiple options separated by |)
      const prefixes = prefixRaw
        .split("|")
        .map(p => p.trim())
        .filter(Boolean);
      if (prefixes.length === 0) {
        return { error: false, message: "" };
      }

      const startsWithAny = prefixes.some(prefix => value.startsWith(prefix));

      if (!startsWithAny) {
        const prefixDisplay =
          prefixes.length === 1 ? `"${prefixes[0]}"` : prefixes.map(p => `"${p}"`).join(" atau ");
        return {
          error: true,
          message: `Harus diawali dengan ${prefixDisplay}`,
        };
      }

      return { error: false, message: "" };
    }

    // Special characters are allowed in every spec input: the CAPITAL_* rules
    // only reject lowercase letters and NUMERIC_ONLY only rejects letters
    // (mirrors backend materialService TEMPLATE_VALIDATORS).
    case "CAPITAL_NO_SPECIAL_CHARS":
    case "ALPHANUMERIC_CAPITAL":
    case "CAPITAL_ONLY": {
      if (!/^[^a-z]*$/.test(value)) {
        return {
          error: true,
          message: "Gunakan huruf kapital (huruf kecil tidak diperbolehkan)",
        };
      }
      return { error: false, message: "" };
    }

    case "MIXED_ALPHA_NUM_UNIT": {
      return { error: false, message: "" };
    }

    case "NUMERIC_ONLY": {
      // Digits and special characters; letters are not allowed
      if (!/^[^A-Za-z]*$/.test(value)) {
        return {
          error: true,
          message: "Hanya angka dan karakter khusus yang diperbolehkan",
        };
      }
      return { error: false, message: "" };
    }

    case "NONE":
    default:
      return { error: false, message: "" };
  }
}

/**
 * Get a human-readable hint text for a validation rule (shown in tooltip).
 *
 * @param {object} field – the field definition
 * @returns {string}
 */
export function getValidationHint(field) {
  if (!field) return "";

  const ruleType = (field.validationRuleType || field.validation_rule_type || "NONE").toUpperCase();
  const ruleDetail = field.ruleDetail || field.rule_detail || "";
  const prefixRaw = field.prefixValue || field.prefix_value || "";

  // Use ruleDetail from database if available, otherwise generate from ruleType
  if (ruleDetail && ruleType !== "NONE") {
    return ruleDetail;
  }

  switch (ruleType) {
    case "PREFIX": {
      const prefixes = prefixRaw
        .split("|")
        .map(p => p.trim())
        .filter(Boolean);
      return `Diawali "${prefixes.join('" atau "')}"`;
    }
    case "CAPITAL_NO_SPECIAL_CHARS":
    case "ALPHANUMERIC_CAPITAL":
    case "CAPITAL_ONLY":
      return "Huruf kapital, karakter khusus diperbolehkan";
    case "MIXED_ALPHA_NUM_UNIT":
      return "Bebas (huruf, angka, karakter khusus)";
    case "NUMERIC_ONLY":
      return "Angka dan karakter khusus";
    case "NONE":
      return "Tidak ada ketentuan input";
    default:
      return "";
  }
}
