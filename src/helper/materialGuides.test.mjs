import test from "node:test";
import assert from "node:assert/strict";

import {
  GUIDE_ACCEPT_ATTRIBUTE,
  GUIDE_MAX_FILES_PER_UPLOAD,
  GUIDE_MAX_FILE_SIZE_BYTES,
  buildGuideSections,
  buildGuideUploadFormData,
  defaultGuideName,
  findGuideMissingName,
  buildGuideUrl,
  buildGuideDownloadUrl,
  formatGuideSize,
  isImageGuide,
  isPdfGuide,
  isVideoGuide,
  validateGuideSelection,
} from "./materialGuides.js";

const fakeFile = (name, size = 1024) => ({ name, size });

test("a mixed selection of allowed documents, images and video is accepted whole", () => {
  const files = [fakeFile("intro.mp4"), fakeFile("manual.pdf"), fakeFile("diagram.png")];
  const result = validateGuideSelection(files);

  assert.equal(result.error, "");
  assert.equal(result.files.length, 3);
});

test("an unsupported file type is named in the rejection", () => {
  const result = validateGuideSelection([fakeFile("ok.pdf"), fakeFile("payload.exe")]);

  assert.equal(result.files.length, 0);
  assert.match(result.error, /payload\.exe/);
  assert.match(result.error, /not a supported file type/);
});

test("a file over 100MB is rejected and says which one", () => {
  const result = validateGuideSelection([
    fakeFile("small.mp4", 1024),
    fakeFile("huge.mp4", GUIDE_MAX_FILE_SIZE_BYTES + 1),
  ]);

  assert.equal(result.files.length, 0);
  assert.match(result.error, /huge\.mp4/);
  assert.match(result.error, /100MB/);
});

test("a file of exactly 100MB is allowed, the limit is inclusive", () => {
  const result = validateGuideSelection([fakeFile("exact.mp4", GUIDE_MAX_FILE_SIZE_BYTES)]);

  assert.equal(result.error, "");
  assert.equal(result.files.length, 1);
});

test("too many files in one batch is refused before anything uploads", () => {
  const files = Array.from({ length: GUIDE_MAX_FILES_PER_UPLOAD + 1 }, (item, index) =>
    fakeFile(`guide-${index}.pdf`)
  );
  const result = validateGuideSelection(files);

  assert.equal(result.files.length, 0);
  assert.match(result.error, /Up to 20 files/);
});

test("an empty selection is not an error, just nothing to upload", () => {
  assert.deepEqual(validateGuideSelection([]), { files: [], error: "" });
  assert.deepEqual(validateGuideSelection(undefined), { files: [], error: "" });
});

test("the file picker filter covers every accepted extension", () => {
  for (const extension of [".mp4", ".mov", ".pdf", ".docx", ".pptx", ".png"]) {
    assert.equal(GUIDE_ACCEPT_ATTRIBUTE.includes(extension), true, extension);
  }
  assert.equal(GUIDE_ACCEPT_ATTRIBUTE.includes(".exe"), false);
});

test("a guide is recognised as video by mime type or by extension", () => {
  assert.equal(isVideoGuide({ mimeType: "video/mp4", originalName: "x" }), true);
  assert.equal(isVideoGuide({ mimeType: null, originalName: "clip.MOV" }), true);
  assert.equal(isVideoGuide({ mimeType: "application/pdf", originalName: "a.pdf" }), false);
});

test("images and PDFs are told apart for the right preview", () => {
  assert.equal(isImageGuide({ originalName: "shot.PNG" }), true);
  assert.equal(isPdfGuide({ originalName: "manual.pdf" }), true);
  assert.equal(isPdfGuide({ mimeType: "application/pdf", originalName: "no-ext" }), true);
  assert.equal(isImageGuide({ originalName: "manual.pdf" }), false);
});

test("a guide url ends at the range-capable content endpoint", () => {
  const url = buildGuideUrl({ contentPath: "/material/guides/files/3/content" });

  assert.equal(url.endsWith("/material/guides/files/3/content"), true);
  assert.equal(buildGuideDownloadUrl({ contentPath: "/material/guides/files/3/content" }).endsWith("?download=1"), true);
});

test("a guide with no content path yields no url instead of a broken one", () => {
  assert.equal(buildGuideUrl(undefined), "");
  assert.equal(buildGuideUrl({}), "");
  assert.equal(buildGuideDownloadUrl({}), "");
});

test("sizes read as a person would write them", () => {
  assert.equal(formatGuideSize(512), "512 B");
  assert.equal(formatGuideSize(2048), "2.0 KB");
  assert.equal(formatGuideSize(104857600), "100.0 MB");
  assert.equal(formatGuideSize(undefined), "");
});

test("folders become sections and loose guides gather into one of their own", () => {
  const sections = buildGuideSections({
    folders: [
      { id: 1, name: "Videos", description: "Walkthroughs", files: [{ id: 10 }] },
    ],
    files: [{ id: 20 }, { id: 21 }],
  });

  assert.equal(sections.length, 2);
  assert.equal(sections[0].title, "Videos");
  assert.equal(sections[0].isFolder, true);
  assert.equal(sections[1].isFolder, false);
  assert.equal(sections[1].files.length, 2);
});

test("an empty folder is still a section, so it does not look like a failed upload", () => {
  const sections = buildGuideSections({
    folders: [{ id: 1, name: "Empty", description: null, files: [] }],
    files: [],
  });

  assert.equal(sections.length, 1);
  assert.deepEqual(sections[0].files, []);
});

test("no standalone section appears when every guide has a folder", () => {
  const sections = buildGuideSections({
    folders: [{ id: 1, name: "All", files: [{ id: 2 }] }],
    files: [],
  });

  assert.equal(sections.length, 1);
  assert.equal(sections[0].isFolder, true);
});

test("an empty or malformed tree renders no sections rather than throwing", () => {
  assert.deepEqual(buildGuideSections(undefined), []);
  assert.deepEqual(buildGuideSections({}), []);
  assert.deepEqual(buildGuideSections({ folders: null, files: null }), []);
});


test("a guide name is prefilled from the filename, without the extension", () => {
  assert.equal(defaultGuideName("Panduan Material.mp4"), "Panduan Material");
  assert.equal(defaultGuideName("report.final.pdf"), "report.final");
  assert.equal(defaultGuideName("README"), "README");
});

test("a dotfile keeps its whole name rather than being emptied", () => {
  // lastIndexOf > 0 rather than >= 0: ".gitignore" is a name, not an extension
  // with nothing in front of it.
  assert.equal(defaultGuideName(".gitignore"), ".gitignore");
});

test("a missing filename prefills nothing, leaving the field to be typed", () => {
  assert.equal(defaultGuideName(""), "");
  assert.equal(defaultGuideName(undefined), "");
  assert.equal(defaultGuideName("   "), "");
});

test("an upload is blocked by the first guide left unnamed", () => {
  const staged = [
    { name: "Intro", file: { name: "a.mp4" } },
    { name: "   ", file: { name: "b.mp4" } },
    { name: "", file: { name: "c.mp4" } },
  ];

  assert.equal(findGuideMissingName(staged).file.name, "b.mp4");
});

test("a fully named batch reports nothing missing", () => {
  assert.equal(
    findGuideMissingName([{ name: "Intro", file: { name: "a.mp4" } }]),
    null
  );
  assert.equal(findGuideMissingName([]), null);
  assert.equal(findGuideMissingName(undefined), null);
});

test("the description stays optional and is sent as an empty string", () => {
  const body = buildGuideUploadFormData({
    files: [{ name: "a.mp4" }],
    folderId: null,
    meta: [{ name: "Intro", description: "" }],
  });

  assert.deepEqual(JSON.parse(body.get("meta")), [{ name: "Intro", description: "" }]);
});
