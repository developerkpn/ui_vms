const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createDynamicFormState,
  applyMaterialGroupSchema,
  resetForMaterialGroupChange,
} = require("./materialRequestSchema.cjs");

test("applyMaterialGroupSchema creates request and template defaults from visible section fields", () => {
  const state = createDynamicFormState({
    plant: "PL01",
    storageLocation: "SL01",
    materialGroup: "MECH",
  });

  const schema = {
    materialGroup: {
      id: 10,
      code: "MECH",
      name: "Mechanical",
    },
    template: {
      templateCode: "MECH_TEMPLATE",
    },
    subgroups: [
      { id: 21, code: "BRG", name: "Bearing" },
      { id: 22, code: "BLT", name: "Bolt" },
    ],
    sections: [
      {
        key: "basic_info",
        title: "Basic Info",
        fields: [
          {
            fieldKey: "material_group",
            label: "Material Group",
            defaultValue: "MECH",
            sourceType: "USER_INPUT",
            isHidden: false,
          },
          {
            fieldKey: "material_description",
            label: "Material Description",
            defaultValue: null,
            sourceType: "COMPUTED_TEMPLATE",
            isHidden: false,
          },
        ],
      },
      {
        key: "specification",
        title: "Specification",
        fields: [
          {
            fieldKey: "manufacturer",
            label: "Manufacturer",
            defaultValue: "SKF",
            kind: "template_field",
            isHidden: false,
          },
          {
            fieldKey: "series",
            label: "Series",
            defaultValue: null,
            kind: "template_field",
            isHidden: false,
          },
        ],
      },
    ],
  };

  const nextState = applyMaterialGroupSchema(state, schema);

  assert.equal(nextState.materialGroup, "MECH");
  assert.deepEqual(nextState.subgroupOptions, [
    { value: 21, label: "BRG - Bearing", data: { id: 21, code: "BRG", name: "Bearing" } },
    { value: 22, label: "BLT - Bolt", data: { id: 22, code: "BLT", name: "Bolt" } },
  ]);
  assert.deepEqual(
    nextState.visibleSections.map(section => section.key),
    ["basic_info", "specification"]
  );
  assert.deepEqual(nextState.requestFieldValues, {
    material_group: "MECH",
    material_description: "",
  });
  assert.deepEqual(nextState.templateFieldValues, {
    manufacturer: "SKF",
    series: "",
  });
});

test("resetForMaterialGroupChange clears subgroup selection, computed description, and template values", () => {
  const state = {
    ...createDynamicFormState({
      materialGroup: "MECH",
      subgroup: "BRG",
    }),
    requestFieldValues: {
      material_group: "MECH",
      material_description: "SKF 6203",
      base_unit_of_measure: "EA",
    },
    templateFieldValues: {
      manufacturer: "SKF",
      series: "6203",
    },
  };

  const nextState = resetForMaterialGroupChange(state);

  assert.equal(nextState.subgroup, "");
  assert.deepEqual(nextState.templateFieldValues, {});
  assert.deepEqual(nextState.requestFieldValues, {});
});

test("applyMaterialGroupSchema filters hidden fields out of visible sections and defaults", () => {
  const state = createDynamicFormState();
  const schema = {
    materialGroup: null,
    template: null,
    subgroups: [],
    sections: [
      {
        key: "basic_info",
        title: "Basic Info",
        fields: [
          {
            fieldKey: "visible_field",
            defaultValue: "A",
            sourceType: "USER_INPUT",
            isHidden: false,
          },
          {
            fieldKey: "hidden_field",
            defaultValue: "B",
            sourceType: "USER_INPUT",
            isHidden: true,
          },
        ],
      },
    ],
  };

  const nextState = applyMaterialGroupSchema(state, schema);

  assert.deepEqual(
    nextState.visibleSections[0].fields.map(field => field.fieldKey),
    ["visible_field"]
  );
  assert.deepEqual(nextState.requestFieldValues, {
    visible_field: "A",
  });
});
