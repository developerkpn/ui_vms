const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const helperModuleUrl = pathToFileURL(
  path.resolve(__dirname, "adminApprovalValidation.mjs")
).href;

async function loadHelper() {
  return import(helperModuleUrl);
}

test("buildApprovalSpecificationFields merges schema-only template fields into approval form", async () => {
  const { buildApprovalSpecificationFields } = await loadHelper();

  const fields = buildApprovalSpecificationFields({
    detailFields: [
      {
        key: "brand_merek",
        label: "Brand / Merek",
        historySections: [{ stage: "Approval 1" }],
        value: "ASDAAAA",
      },
    ],
    formSchema: {
      sections: [
        {
          key: "specification",
          fields: [
            {
              kind: "template_field",
              fieldKey: "type_bentuk",
              label: "Type / Bentuk",
              displayOrder: 1,
              isRequired: true,
              validationRuleType: "ALPHANUMERIC_CAPITAL",
            },
            {
              kind: "template_field",
              fieldKey: "brand_merek",
              label: "Brand / Merek",
              displayOrder: 2,
              isRequired: true,
              validationRuleType: "CAPITAL_ONLY",
            },
          ],
        },
      ],
    },
  });

  assert.deepEqual(
    fields.map(field => ({
      key: field.key,
      label: field.label,
      isRequired: field.isRequired,
      validationRuleType: field.validationRuleType,
    })),
    [
      {
        key: "type_bentuk",
        label: "Type / Bentuk",
        isRequired: true,
        validationRuleType: "ALPHANUMERIC_CAPITAL",
      },
      {
        key: "brand_merek",
        label: "Brand / Merek",
        isRequired: true,
        validationRuleType: "CAPITAL_ONLY",
      },
    ]
  );
  assert.deepEqual(fields[1].historySections, [{ stage: "Approval 1" }]);
});

test("validateApprovalDraft returns realtime errors for known approval-edit rules", async () => {
  const { validateApprovalDraft } = await loadHelper();

  const fieldErrors = validateApprovalDraft({
    draftValues: {
      material_sub_group_id: null,
      material_description:
        "DESCRIPTION-TOO-LONG-123456789012345678901234567890",
      base_uom: "",
      plant_code: "",
      sloc_code: "",
      long_text_1: "12345678901234567890123456789012345678901",
      template_payload: {
        templateValues: {
          type_bentuk: "abc-123",
          brand_merek: "",
        },
      },
    },
    formSchema: {
      sections: [
        {
          key: "basic_info",
          fields: [
            {
              kind: "request_rule",
              fieldKey: "plant",
              fieldLabel: "Plant",
              isRequired: true,
            },
            {
              kind: "request_rule",
              fieldKey: "storage_location",
              fieldLabel: "Storage Location",
              isRequired: true,
            },
          ],
        },
        {
          key: "specification",
          fields: [
            {
              kind: "template_field",
              fieldKey: "type_bentuk",
              label: "Type / Bentuk",
              isRequired: true,
              validationRuleType: "ALPHANUMERIC_CAPITAL",
            },
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
    },
  });

  assert.equal(fieldErrors.material_sub_group_id.message, "Sub material group is required");
  assert.match(fieldErrors.material_description.message, /maksimal 40 karakter/i);
  assert.equal(fieldErrors.base_uom.message, "Base UoM wajib diisi");
  assert.equal(fieldErrors.plant_code.message, "Plant wajib diisi");
  assert.equal(fieldErrors.sloc_code.message, "Storage Location wajib diisi");
  assert.match(fieldErrors.long_text_1.message, /maksimal 40 karakter/i);
  assert.match(fieldErrors.type_bentuk.message, /huruf kapital/i);
  assert.equal(fieldErrors.brand_merek.message, "Brand / Merek wajib diisi");
});

test("validateApprovalDraft ignores required request rules outside approval-edit scope", async () => {
  const { validateApprovalDraft } = await loadHelper();

  const fieldErrors = validateApprovalDraft({
    draftValues: {
      material_sub_group_id: 99,
      material_description: "VALID DESC",
      base_uom: "PC",
      plant_code: "P1",
      sloc_code: "S1",
      long_text_1: "",
      long_text_2: "",
      long_text_3: "",
      template_payload: {
        templateValues: {},
      },
    },
    formSchema: {
      sections: [
        {
          key: "basic_info",
          fields: [
            {
              kind: "request_rule",
              fieldKey: "profit_center",
              fieldLabel: "Profit Center",
              isRequired: true,
            },
            {
              kind: "request_rule",
              fieldKey: "valuation_class",
              fieldLabel: "Valuation Class",
              isRequired: true,
            },
          ],
        },
      ],
    },
  });

  assert.deepEqual(fieldErrors, {});
});

test("mapApprovalServerErrors remaps backend field keys to approval dialog field keys", async () => {
  const { mapApprovalServerErrors } = await loadHelper();

  const mapped = mapApprovalServerErrors([
    {
      fieldKey: "base_unit_of_measure",
      message: "Base UoM wajib diisi",
    },
    {
      fieldKey: "storage_location",
      message: "Storage Location wajib diisi",
    },
    {
      fieldKey: "type_bentuk",
      message: "Hanya huruf kapital dan angka",
    },
  ]);

  assert.deepEqual(mapped, {
    base_uom: { error: true, message: "Base UoM wajib diisi" },
    sloc_code: { error: true, message: "Storage Location wajib diisi" },
    type_bentuk: { error: true, message: "Hanya huruf kapital dan angka" },
  });
});
