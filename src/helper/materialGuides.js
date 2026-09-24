// Material guides: the upload rules the Guide Upload page enforces before it
// sends anything, and the small decisions the Dashboard makes when rendering
// what came back.
//
// The limits here mirror backend/services/guideService.js. Checking client-side
// only saves the user a 100MB round trip to be told no; the server is still the
// one that decides.

export const GUIDE_MAX_FILE_SIZE_MB = 100;
export const GUIDE_MAX_FILE_SIZE_BYTES = GUIDE_MAX_FILE_SIZE_MB * 1024 * 1024;
export const GUIDE_MAX_FILES_PER_UPLOAD = 20;

export const GUIDE_VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "avi", "mkv"];
export const GUIDE_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];
export const GUIDE_DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
];

export const GUIDE_ALLOWED_EXTENSIONS = [
  ...GUIDE_DOCUMENT_EXTENSIONS,
  ...GUIDE_VIDEO_EXTENSIONS,
  ...GUIDE_IMAGE_EXTENSIONS,
];

export const GUIDE_ACCEPT_ATTRIBUTE = GUIDE_ALLOWED_EXTENSIONS.map(
  extension => `.${extension}`
).join(",");

export const GUIDE_SUPPORTED_FORMATS_TEXT = `Documents, images and video (${GUIDE_ALLOWED_EXTENSIONS.join(", ")})`;
export const GUIDE_SIZE_LIMIT_TEXT = `Up to ${GUIDE_MAX_FILE_SIZE_MB}MB per file, ${GUIDE_MAX_FILES_PER_UPLOAD} files per upload`;

export function guideExtensionOf(name) {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function isVideoGuide(guide) {
  if (typeof guide?.mimeType === "string" && guide.mimeType.startsWith("video/")) {
    return true;
  }
  return GUIDE_VIDEO_EXTENSIONS.includes(
    guideExtensionOf(guide?.originalName || guide?.storedName)
  );
}

export function isImageGuide(guide) {
  if (typeof guide?.mimeType === "string" && guide.mimeType.startsWith("image/")) {
    return true;
  }
  return GUIDE_IMAGE_EXTENSIONS.includes(
    guideExtensionOf(guide?.originalName || guide?.storedName)
  );
}

export function isPdfGuide(guide) {
  if (guide?.mimeType === "application/pdf") {
    return true;
  }
  return guideExtensionOf(guide?.originalName || guide?.storedName) === "pdf";
}

/**
 * Absolute URL for a guide's bytes.
 *
 * contentPath comes from the API already shaped as /material/guides/files/:id/content,
 * so this only prefixes the API origin the rest of the app uses.
 */
export function buildGuideUrl(guide) {
  const contentPath = typeof guide === "string" ? guide : guide?.contentPath;
  if (!contentPath) {
    return "";
  }
  // Optional chaining because import.meta.env exists under Vite but not under
  // the plain node runner the sibling test suite uses.
  const apiBase = import.meta.env?.VITE_URL_LOC ?? "";
  return `${apiBase}${contentPath}`;
}

export function buildGuideDownloadUrl(guide) {
  const url = buildGuideUrl(guide);
  return url ? `${url}?download=1` : "";
}

export function formatGuideSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) {
    return "";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Vet a file selection before any of it is uploaded.
 *
 * Returns every accepted file plus the first reason something was rejected, so
 * the page can show one clear message rather than a list of failures.
 */
export function validateGuideSelection(selected) {
  const files = Array.from(selected || []);

  if (files.length === 0) {
    return { files: [], error: "" };
  }

  if (files.length > GUIDE_MAX_FILES_PER_UPLOAD) {
    return {
      files: [],
      error: `Up to ${GUIDE_MAX_FILES_PER_UPLOAD} files can be uploaded at once.`,
    };
  }

  const rejectedType = files.find(
    file => !GUIDE_ALLOWED_EXTENSIONS.includes(guideExtensionOf(file.name))
  );
  if (rejectedType) {
    return {
      files: [],
      error: `${rejectedType.name} is not a supported file type.`,
    };
  }

  const rejectedSize = files.find(file => file.size > GUIDE_MAX_FILE_SIZE_BYTES);
  if (rejectedSize) {
    return {
      files: [],
      error: `${rejectedSize.name} is larger than ${GUIDE_MAX_FILE_SIZE_MB}MB.`,
    };
  }

  return { files, error: "" };
}

/**
 * A sensible starting name for an upload: the filename without its extension.
 *
 * The name is required, so prefilling it keeps a twenty-file batch to a glance
 * rather than twenty pieces of typing.
 */
export function defaultGuideName(fileName) {
  const raw = String(fileName || "").trim();
  if (raw === "") {
    return "";
  }
  const lastDot = raw.lastIndexOf(".");
  return lastDot > 0 ? raw.slice(0, lastDot) : raw;
}

/**
 * The first staged guide missing a name, or null when every one has one.
 */
export function findGuideMissingName(staged = []) {
  if (!Array.isArray(staged)) {
    return null;
  }
  return (
    staged.find(entry => String(entry?.name ?? "").trim() === "") || null
  );
}

/**
 * The multipart body the upload endpoint expects.
 *
 * Names and descriptions ride along as a JSON array matched to the files by
 * position. The name is required and the page blocks an upload without one; the
 * description is optional and may be empty.
 */
export function buildGuideUploadFormData({ files, folderId, meta = [] }) {
  const formData = new FormData();

  if (folderId !== null && folderId !== undefined && folderId !== "") {
    formData.append("folderId", String(folderId));
  }

  formData.append(
    "meta",
    JSON.stringify(
      files.map((file, index) => ({
        name: (meta[index]?.name || "").trim(),
        description: (meta[index]?.description || "").trim(),
      }))
    )
  );

  files.forEach(file => {
    formData.append("files", file);
  });

  return formData;
}

/**
 * Folders first in the order the API gave them, then the guides that belong to
 * no folder gathered under one pseudo-section, so the dashboard can render a
 * single list. A folder with nothing in it is kept: it is a real, if empty,
 * grouping and hiding it would make it look like the upload failed.
 */
export function buildGuideSections(tree) {
  const folders = Array.isArray(tree?.folders) ? tree.folders : [];
  const standalone = Array.isArray(tree?.files) ? tree.files : [];

  const sections = folders.map(folder => ({
    key: `folder-${folder.id}`,
    id: folder.id,
    title: folder.name,
    description: folder.description || "",
    isFolder: true,
    files: Array.isArray(folder.files) ? folder.files : [],
  }));

  if (standalone.length > 0) {
    sections.push({
      key: "standalone",
      id: null,
      title: "Other guides",
      description: "",
      isFolder: false,
      files: standalone,
    });
  }

  return sections;
}
