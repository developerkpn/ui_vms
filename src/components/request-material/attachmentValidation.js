const ALLOWED_ATTACHMENT_EXTENSIONS = ["pdf", "doc", "docx", "png", "jpg", "jpeg"];

const MIN_ATTACHMENTS = 1;
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_SIZE_MB = 5;
const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

// The two caption lines every attachment surface shows above its Browse
// control. Kept verbatim from the requester's single form — the one surface
// that already showed both — and single-sourced here so the requester's mass
// form and both approver forms show the same sentences rather than their own
// near-miss variants.
const ATTACHMENT_SUPPORTED_FORMATS_TEXT = `supported formats: ${ALLOWED_ATTACHMENT_EXTENSIONS.map(
  ext => ext.toUpperCase()
).join(", ")}`;

const ATTACHMENT_SIZE_LIMIT_TEXT = `file size limit: ${MAX_ATTACHMENT_SIZE_MB}MB`;

const getAttachmentExtension = fileName => {
  const normalizedName = String(fileName || "")
    .trim()
    .toLowerCase();
  const parts = normalizedName.split(".");

  if (parts.length < 2) {
    return "";
  }

  return parts.at(-1) || "";
};

const isAllowedAttachmentFile = file =>
  ALLOWED_ATTACHMENT_EXTENSIONS.includes(getAttachmentExtension(file?.name));

const normalizeAttachmentSelection = (selectedFiles = [], existingFiles = []) => {
  const incomingFiles = Array.from(selectedFiles || []);
  const currentFiles = Array.from(existingFiles || []);

  if (incomingFiles.length === 0) {
    return {
      files: currentFiles,
      error: "",
    };
  }

  const hasInvalidFile = incomingFiles.some(file => !isAllowedAttachmentFile(file));
  if (hasInvalidFile) {
    return {
      files: currentFiles,
      error: `Unsupported file format. Use ${ALLOWED_ATTACHMENT_EXTENSIONS.map(ext => ext.toUpperCase()).join(", ")}.`,
    };
  }

  const hasOversizedFile = incomingFiles.some(
    file => Number(file?.size) > MAX_ATTACHMENT_SIZE_BYTES
  );
  if (hasOversizedFile) {
    return {
      files: currentFiles,
      error: `File is too large. Maximum size is ${MAX_ATTACHMENT_SIZE_MB}MB.`,
    };
  }

  if (currentFiles.length >= MAX_ATTACHMENTS) {
    return {
      files: currentFiles.slice(0, MAX_ATTACHMENTS),
      error: `You can attach at most ${MAX_ATTACHMENTS} files.`,
    };
  }

  const availableSlots = MAX_ATTACHMENTS - currentFiles.length;
  const acceptedFiles = incomingFiles.slice(0, availableSlots);
  const files = [...currentFiles, ...acceptedFiles];

  return {
    files,
    error:
      incomingFiles.length > availableSlots
        ? `You can attach at most ${MAX_ATTACHMENTS} files.`
        : "",
  };
};

const getAttachmentValidationError = files => {
  const totalFiles = Array.isArray(files) ? files.length : 0;

  if (totalFiles < MIN_ATTACHMENTS) {
    return `Attach at least ${MIN_ATTACHMENTS} file.`;
  }

  if (totalFiles > MAX_ATTACHMENTS) {
    return `You can attach at most ${MAX_ATTACHMENTS} files.`;
  }

  return "";
};

export {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ATTACHMENT_SIZE_LIMIT_TEXT,
  ATTACHMENT_SUPPORTED_FORMATS_TEXT,
  MIN_ATTACHMENTS,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE_MB,
  getAttachmentExtension,
  isAllowedAttachmentFile,
  normalizeAttachmentSelection,
  getAttachmentValidationError,
};
