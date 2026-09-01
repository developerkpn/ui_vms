import { Close } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

/**
 * @param {string} fileName - attachment file name, with or without an extension
 * @returns {string} the lowercased extension, or "" when the name carries none
 */
const fileExtension = fileName =>
  fileName && fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "";

/**
 * @param {string} fileName - attachment file name
 * @returns {boolean} true when the name ends in an extension rendered inline
 */
export const isImageFile = fileName => IMAGE_EXTENSIONS.includes(fileExtension(fileName));

/**
 * Absolute URL of a stored attachment. Only a stored attachment has a path — a
 * file staged in a dialog is a plain File with nothing on the server to fetch
 * yet, so it has no URL and is not viewable.
 *
 * @param {{ path?: string }} attachment - attachment row from the API, or a staged file
 * @returns {string} the fetch URL, or "" when there is nothing stored to fetch
 */
export const buildAttachmentUrl = attachment =>
  attachment?.path ? import.meta.env.VITE_URL_LOC + "/material/file/" + attachment.path : "";

// The endpoint does not always send file_type, so the MIME string arrives empty
// on rows that are perfectly previewable. The extension is the fallback signal —
// without it a stored PDF or PNG reads as "cannot be previewed".
const isImagePreview = file => Boolean(file?.type?.includes("image")) || isImageFile(file?.name);

const isPdfPreview = file =>
  Boolean(file?.type?.includes("pdf")) || fileExtension(file?.name) === "pdf";

function OpenFileButton({ file, sx }) {
  return (
    <Button variant="contained" href={file.url} target="_blank" rel="noopener noreferrer" sx={sx}>
      Open File
    </Button>
  );
}

/**
 * Shared attachment viewer for the approval dialogs. Renders images and PDFs
 * inline and falls back to an Open File link for anything else.
 *
 * @param {boolean} open - whether the viewer is showing
 * @param {{ name: string, url: string, type?: string }|null} file - file to display
 * @param {Function} onClose - called when the viewer is dismissed
 */
export default function AttachmentPreviewDialog({ open, file, onClose }) {
  const [imageError, setImageError] = useState(false);

  // A newly opened file gets a fresh chance to load: the previous file's failure
  // must not show through as an error on this one.
  useEffect(() => {
    setImageError(false);
  }, [file]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">{file?.name || "File Preview"}</Typography>
          <IconButton onClick={onClose} aria-label="Close preview">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent
        sx={{
          height: "70vh",
          p: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {file &&
          (isImagePreview(file) ? (
            imageError ? (
              <Box sx={{ textAlign: "center", p: 3 }}>
                <Typography variant="body1" gutterBottom color="error">
                  Unable to load image preview.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  The file may have been moved or deleted.
                </Typography>
                <OpenFileButton file={file} sx={{ mt: 1 }} />
              </Box>
            ) : (
              <img
                src={file.url}
                alt={file.name}
                onError={() => setImageError(true)}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            )
          ) : isPdfPreview(file) ? (
            <iframe
              src={file.url}
              title={file.name}
              width="100%"
              height="100%"
              style={{ border: "none" }}
            />
          ) : (
            <Box sx={{ textAlign: "center", p: 3 }}>
              <Typography variant="body1" gutterBottom>
                This file type cannot be previewed directly.
              </Typography>
              <OpenFileButton file={file} sx={{ mt: 2 }} />
            </Box>
          ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" href={file?.url} download={file?.name} disabled={!file}>
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
}
