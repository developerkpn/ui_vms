const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const formPath = path.resolve(
  __dirname,
  "../../components/request-material/SingleMaterialForm.jsx"
);
const pagePath = path.resolve(__dirname, "SingleRequestPage.jsx");

test("single material form keeps requester rework material group editable", () => {
  const source = fs.readFileSync(formPath, "utf8");
  const materialGroupBlock = source.match(
    /Material Group[\s\S]*?<SearchableSelect[\s\S]*?\/>/
  );

  assert.ok(materialGroupBlock, "expected Material Group field block");
  assert.doesNotMatch(materialGroupBlock[0], /disabled=\{isReworkMode\}/);
  assert.match(source, /material\/requests\/single\/\$\{requestId\}\/rework/);
});

test("single material rework keeps plant and storage location in payload without rendering duplicate fields", () => {
  const source = fs.readFileSync(formPath, "utf8");

  assert.match(source, /getRequestValue\(requestSources,[\s\S]*"plant"[\s\S]*"plant_code"/);
  assert.match(
    source,
    /getRequestValue\(requestSources,[\s\S]*"storage_location"[\s\S]*"storageLocation"[\s\S]*"sloc_code"/
  );
  assert.match(source, /mergePersistentRequestFields\([\s\S]*nextState\.requestFieldValues/);
  assert.doesNotMatch(source, /showPlantStorageFields/);
  assert.doesNotMatch(source, /label="Plant"/);
  assert.doesNotMatch(source, /label="Storage Location"/);
});

test("single material form previews existing attachments via stored file path", () => {
  const source = fs.readFileSync(formPath, "utf8");

  assert.match(
    source,
    /const getAttachmentPreviewSrc = attachment =>[\s\S]*attachment\?\.path[\s\S]*\/material\/file\/\$\{attachment\.path\}/
  );
  assert.match(source, /src=\{getAttachmentPreviewSrc\(file\)\}/);
  assert.doesNotMatch(source, /\/material\/file\/\" \+ file\.name/);
});

test("single request rework starts from initial screen with existing plant and storage", () => {
  const pageSource = fs.readFileSync(pagePath, "utf8");
  const formSource = fs.readFileSync(formPath, "utf8");

  assert.match(pageSource, /const usesInitialScreen = isSingleCreateMode \|\| isReworkMode/);
  assert.match(pageSource, /usesInitialScreen && step === 1/);
  assert.match(pageSource, /Revise Material Request/);
  assert.match(pageSource, /Select initial master data for your revised item/);
  assert.match(pageSource, /material\/requests\/single\/\$\{requestId\}/);
  assert.match(pageSource, /plant_code/);
  assert.match(pageSource, /sloc_code/);
  assert.match(formSource, /buildReworkFormState\(\{[\s\S]*formData/);
  assert.match(formSource, /plant: getRequestValue\(requestSources,[\s\S]*"plant"[\s\S]*"plant_code"/);
});
