const ALLOWED_ATTACHMENT_EXTENSIONS = ["pdf", "doc", "docx", "png", "jpg", "jpeg"];

const MIN_ATTACHMENTS = 1;
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_SIZE_MB = 5;
const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

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
      error: "Format file tidak didukung. Gunakan PDF, DOC, DOCX, PNG, JPG, atau JPEG.",
    };
  }

  const hasOversizedFile = incomingFiles.some(
    file => Number(file?.size) > MAX_ATTACHMENT_SIZE_BYTES
  );
  if (hasOversizedFile) {
    return {
      files: currentFiles,
      error: `Ukuran file maksimal ${MAX_ATTACHMENT_SIZE_MB}MB.`,
    };
  }

  if (currentFiles.length >= MAX_ATTACHMENTS) {
    return {
      files: currentFiles.slice(0, MAX_ATTACHMENTS),
      error: `Maksimal ${MAX_ATTACHMENTS} attachment.`,
    };
  }

  const availableSlots = MAX_ATTACHMENTS - currentFiles.length;
  const acceptedFiles = incomingFiles.slice(0, availableSlots);
  const files = [...currentFiles, ...acceptedFiles];

  return {
    files,
    error: incomingFiles.length > availableSlots ? `Maksimal ${MAX_ATTACHMENTS} attachment.` : "",
  };
};

const getAttachmentValidationError = files => {
  const totalFiles = Array.isArray(files) ? files.length : 0;

  if (totalFiles < MIN_ATTACHMENTS) {
    return `Minimal ${MIN_ATTACHMENTS} attachment.`;
  }

  if (totalFiles > MAX_ATTACHMENTS) {
    return `Maksimal ${MAX_ATTACHMENTS} attachment.`;
  }

  return "";
};

export {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  MIN_ATTACHMENTS,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE_MB,
  getAttachmentExtension,
  isAllowedAttachmentFile,
  normalizeAttachmentSelection,
  getAttachmentValidationError,
};
