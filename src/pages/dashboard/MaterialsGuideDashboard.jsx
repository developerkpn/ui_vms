import CloseIcon from "@mui/icons-material/Close";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import FolderIcon from "@mui/icons-material/Folder";
import ImageIcon from "@mui/icons-material/Image";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";

import PageHeader from "src/components/common/PageHeader";
import useAxiosPrivate from "src/hooks/useAxiosPrivate";
import useCollapsedFolders from "src/hooks/useCollapsedFolders";
import { useSnackBar } from "src/provider/SnackbarProvider";
import {
  buildGuideDownloadUrl,
  buildGuideSections,
  buildGuideUrl,
  formatGuideSize,
  isImageGuide,
  isPdfGuide,
  isVideoGuide,
} from "src/helper/materialGuides";

const guideIconFor = guide => {
  if (isVideoGuide(guide)) {
    return PlayCircleOutlineIcon;
  }
  if (isImageGuide(guide)) {
    return ImageIcon;
  }
  return DescriptionIcon;
};

/**
 * The top of a card: the picture itself for an image guide, the kind icon for
 * everything else.
 *
 * Every card gets the same height of media area whatever it holds, so a grid of
 * mixed images and documents still lines up.
 */
function GuideThumbnail({ guide }) {
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = guideIconFor(guide);
  const showImage = isImageGuide(guide) && !imageFailed;

  return (
    <Box
      sx={{
        position: "relative",
        height: 148,
        borderRadius: "10px",
        overflow: "hidden",
        bgcolor: showImage ? "grey.100" : "primary.main",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "primary.contrastText",
      }}
    >
      {showImage ? (
        <Box
          component="img"
          src={buildGuideUrl(guide)}
          alt={guide.displayName}
          // Lazy: a dashboard with a folder of screenshots would otherwise pull
          // every one of them on load.
          loading="lazy"
          // A guide whose bytes have gone missing falls back to the icon rather
          // than leaving a broken-image frame on the card.
          onError={() => setImageFailed(true)}
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <Icon sx={{ fontSize: 40 }} />
      )}
    </Box>
  );
}

function GuideCard({ guide, onOpen }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px",
        height: "100%",
        transition: "border-color 120ms ease, box-shadow 120ms ease",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
        },
      }}
    >
      {/* A column, so the size can be pinned to the bottom: the text block takes
          the slack and the chip sits on the floor of the card. Without this the
          chip rides directly under the description and lands at a different
          height on every card, depending on whether there is a description and
          how long it is. */}
      <CardActionArea
        onClick={onOpen}
        sx={{
          height: "100%",
          p: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          textAlign: "left",
        }}
      >
        <GuideThumbnail guide={guide} />

        <Box sx={{ minWidth: 0, mt: 1.5, flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 700 }} noWrap title={guide.displayName}>
            {guide.displayName}
          </Typography>
          {/* Always rendered. An absent description is said rather than left as
              a gap, so a card with one and a card without read as the same
              layout with different content. */}
          <Typography
            variant="body2"
            color={guide.description ? "text.secondary" : "text.disabled"}
            sx={{
              mt: 0.5,
              fontStyle: guide.description ? "normal" : "italic",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {guide.description || "No description available"}
          </Typography>
        </Box>

        <Box sx={{ mt: 1.5 }}>
          <Chip size="small" label={formatGuideSize(guide.sizeBytes)} />
        </Box>
      </CardActionArea>
    </Card>
  );
}

function GuideViewer({ guide, onClose }) {
  const url = buildGuideUrl(guide);

  return (
    <Dialog open={Boolean(guide)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700, pr: 1 }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700 }}>
            {guide?.displayName}
          </Typography>
          {guide?.description && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
              {guide.description}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {guide && isVideoGuide(guide) && (
          // The content endpoint answers Range requests, so the player can seek
          // without downloading the whole file first.
          <video
            key={guide.id}
            src={url}
            controls
            preload="metadata"
            style={{ width: "100%", maxHeight: "70vh", background: "#000", borderRadius: 8 }}
          />
        )}

        {guide && isImageGuide(guide) && (
          <Box
            component="img"
            src={url}
            alt={guide.displayName}
            sx={{ width: "100%", height: "auto", borderRadius: 1 }}
          />
        )}

        {guide && isPdfGuide(guide) && (
          <Box
            component="iframe"
            src={url}
            title={guide.displayName}
            sx={{ width: "100%", height: "70vh", border: 0 }}
          />
        )}

        {guide && !isVideoGuide(guide) && !isImageGuide(guide) && !isPdfGuide(guide) && (
          // Office documents and the like cannot render in the browser, so the
          // honest offer is the download rather than a viewer that shows nothing.
          <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
            <DescriptionIcon sx={{ fontSize: 48, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary">
              This guide cannot be previewed in the browser.
            </Typography>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              href={buildGuideDownloadUrl(guide)}
              sx={{ textTransform: "none", borderRadius: "10px" }}
            >
              Download
            </Button>
          </Stack>
        )}
      </DialogContent>

      <Stack direction="row" justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
        <Button
          startIcon={<DownloadIcon />}
          href={buildGuideDownloadUrl(guide)}
          sx={{ textTransform: "none" }}
        >
          Download
        </Button>
      </Stack>
    </Dialog>
  );
}

export default function MaterialsGuideDashboard() {
  const axiosPrivate = useAxiosPrivate();
  const { openSnackbar } = useSnackBar();

  const [tree, setTree] = useState({ folders: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const { isCollapsed, toggleFolder } = useCollapsedFolders(
    "material-guides.dashboard.collapsed-folders"
  );

  const loadGuides = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosPrivate.get("/material/guides");
      setTree(data?.data || { folders: [], files: [] });
    } catch (error) {
      openSnackbar("error", error?.response?.data?.message || "Failed to load guides.");
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate, openSnackbar]);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  const sections = useMemo(() => buildGuideSections(tree), [tree]);
  const guideCount = useMemo(
    () => sections.reduce((total, section) => total + section.files.length, 0),
    [sections]
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pb: { xs: 4, md: 6 } }}>
      <PageHeader
        title="Dashboard"
        subtitle="Guides and videos for the Material Management System"
      />

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && guideCount === 0 && (
        <Paper
          elevation={0}
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: "12px",
            px: 3,
            py: 8,
            textAlign: "center",
          }}
        >
          <DescriptionIcon sx={{ fontSize: 48, color: "text.disabled" }} />
          <Typography variant="h6" sx={{ mt: 2, fontWeight: 700 }}>
            No guides yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            An administrator can add them from Administrator, then Guide Upload.
          </Typography>
        </Paper>
      )}

      {!loading &&
        sections.map(section => {
          if (section.files.length === 0) {
            return null;
          }

          const collapsed = isCollapsed(section.key);

          return (
            <Box key={section.key}>
              {/* The whole header is the toggle, not just the chevron: a heading
                  with a caret beside it is a bigger, more obvious target. */}
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                onClick={() => toggleFolder(section.key)}
                role="button"
                tabIndex={0}
                aria-expanded={!collapsed}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleFolder(section.key);
                  }
                }}
                sx={{
                  mb: 2,
                  cursor: "pointer",
                  userSelect: "none",
                  borderRadius: "8px",
                  p: 1,
                  ml: -1,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                {section.isFolder && <FolderIcon color="primary" />}
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {section.title}
                  </Typography>
                  {section.description && (
                    <Typography variant="body2" color="text.secondary">
                      {section.description}
                    </Typography>
                  )}
                </Box>
                <Chip
                  size="small"
                  label={`${section.files.length} guide${section.files.length === 1 ? "" : "s"}`}
                />
                <Box sx={{ flexGrow: 1 }} />
                <IconButton
                  size="small"
                  aria-label={collapsed ? `Expand ${section.title}` : `Collapse ${section.title}`}
                  // The Stack already handles the click; this is a visual
                  // affordance and a focus target, so it must not toggle twice.
                  onClick={event => event.stopPropagation()}
                  onMouseDown={event => event.preventDefault()}
                  tabIndex={-1}
                >
                  {collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                </IconButton>
              </Stack>

              <Collapse in={!collapsed} timeout="auto" unmountOnExit>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      lg: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 2,
                  }}
                >
                  {section.files.map(guide => (
                    <GuideCard key={guide.id} guide={guide} onOpen={() => setActive(guide)} />
                  ))}
                </Box>
              </Collapse>
            </Box>
          );
        })}

      {active && <GuideViewer guide={active} onClose={() => setActive(null)} />}
    </Box>
  );
}
