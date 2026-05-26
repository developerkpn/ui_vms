const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(
  path.resolve(__dirname, "singleMaterialFormValidation.mjs")
).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("validateRequesterDraft returns field-level errors for invalid requester inputs", async () => {
  const { validateRequesterDraft } = await loadHelper();

  const fieldErrors = validateRequesterDraft({
    formState: {
      materialGroup: "",
      subgroup: "",
      visibleSections: [
        {
          key: "specification",
          fields: [
            {
              kind: "template_field",
              fieldKey: "brand_merek",
              label: "Brand / Merek",
              isRequired: true,
              validationRuleType: "CAPITAL_ONLY",
            },
          ],
        },
      ],
      requestFieldValues: {
        material_description:
          "DESCRIPTION-TOO-LONG-123456789012345678901234567890",
        base_unit_of_measure: "",
        long_text_1: "12345678901234567890123456789012345678901",
      },
      templateFieldValues: {
        brand_merek: "abc123",
      },
    },
  });

  assert.equal(fieldErrors.materialGroup.message, "Material group wajib dipilih.");
  assert.equal(fieldErrors.subgroup.message, "Sub material group wajib dipilih.");
  assert.match(fieldErrors.material_description.message, /maksimal 40 karakter/i);
  assert.equal(fieldErrors.base_unit_of_measure.message, "Base UoM wajib diisi.");
  assert.match(fieldErrors.long_text_1.message, /maksimal 40 karakter/i);
  assert.match(fieldErrors.brand_merek.message, /huruf kapital/i);
});

test("mapRequesterServerErrors remaps backend field keys to requester form field keys", async () => {
  const { mapRequesterServerErrors } = await loadHelper();

  const mapped = mapRequesterServerErrors([
    {
      fieldKey: "material_group",
      message: "Material group wajib dipilih.",
    },
    {
      fieldKey: "material_sub_group_id",
      message: "Sub material group wajib dipilih.",
    },
    {
      fieldKey: "base_unit_of_measure",
      message: "Base UoM wajib diisi.",
    },
    {
      fieldKey: "brand_merek",
      message: "Hanya huruf kapital (A-Z) yang diperbolehkan",
    },
  ]);

  assert.deepEqual(mapped, {
    materialGroup: { error: true, message: "Material group wajib dipilih." },
    subgroup: { error: true, message: "Sub material group wajib dipilih." },
    base_unit_of_measure: { error: true, message: "Base UoM wajib diisi." },
    brand_merek: {
      error: true,
      message: "Hanya huruf kapital (A-Z) yang diperbolehkan",
    },
  });
});
