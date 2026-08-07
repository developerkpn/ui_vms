import { Skeleton, Stack } from "@mui/material";

/**
 * Shared loading placeholder for the text/detail-shaped sections of a modal —
 * the non-table sibling of TableLoadingRows.
 *
 * The request and approval modals fetch several of their sections after the
 * dialog is already on screen (form schema, rework mail thread, initial-screen
 * locations). Each of those used to announce itself differently, or not at all:
 * a spinner here, a caption there, and elsewhere a section that simply popped
 * into existence a beat after the modal opened. They all draw the same thing
 * now — a few wave skeleton lines standing where the copy is about to land.
 *
 * Presentation only. Which of these a section renders — and for how long —
 * stays with whatever owns the fetch.
 */

/** Default line count: enough to read as a paragraph of content, not a bar. */
export const SECTION_LOADING_LINE_COUNT = 3;

/**
 * Ragged right edge, so a stack of lines reads as text rather than as a stack
 * of loading bars. Cycled when more lines are asked for than there are widths.
 */
const SECTION_LOADING_LINE_WIDTHS = ["100%", "92%", "78%", "86%"];

/**
 * Skeleton text lines standing in for a section still in flight. Sized for the
 * 2-4 line sections these modals actually have; taller sections should still
 * stay in that range rather than mirror their full height, since the point is
 * to hold the place, not to fake the content.
 *
 * @param {object} props
 * @param {number} [props.lines] - How many placeholder lines to draw.
 * @param {number} [props.height] - Line height in px; matches body2 by default.
 * @param {number} [props.spacing] - MUI spacing between lines.
 */
export default function SectionLoadingSkeleton({
  lines = SECTION_LOADING_LINE_COUNT,
  height = 20,
  spacing = 1,
}) {
  const lineCount = Math.max(1, Number(lines) || SECTION_LOADING_LINE_COUNT);

  return (
    <Stack spacing={spacing} aria-hidden="true">
      {Array.from({ length: lineCount }, (_, lineIndex) => (
        <Skeleton
          key={`section-loading-line-${lineIndex}`}
          animation="wave"
          height={height}
          width={SECTION_LOADING_LINE_WIDTHS[lineIndex % SECTION_LOADING_LINE_WIDTHS.length]}
        />
      ))}
    </Stack>
  );
}
