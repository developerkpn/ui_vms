// First-page thumbnails for PDF guides on Materials > Dashboard.
//
// Imported dynamically by the dashboard, so pdf.js (and its worker) only
// downloads for someone who actually scrolls a PDF card into view. The legacy
// build, because it still runs on the older browsers some offices are on.
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

import { pdfThumbnailScale } from "src/helper/materialGuides";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Draws the whole of page 1 of the PDF at `url` into `canvas`, as large as fits
 * in a `boxWidth` x `boxHeight` CSS-pixel area.
 *
 * The content endpoint answers Range requests, so with auto-fetch off pdf.js
 * reads only what page 1 needs rather than the whole file.
 *
 * @returns {{promise: Promise<void>, cancel: () => void}} cancel stops the
 *   download and the render, for a card that unmounts first
 */
export function renderPdfFirstPage(url, canvas, boxWidth, boxHeight) {
  const loadingTask = pdfjs.getDocument({
    url,
    disableAutoFetch: true,
    disableStream: true,
    isEvalSupported: false,
  });
  let renderTask = null;

  const promise = (async () => {
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const natural = page.getViewport({ scale: 1 });
    // Fit the page inside the box: its full width, unless that makes it too tall.
    const fitWidth = Math.min(boxWidth, boxHeight * (natural.width / natural.height));
    const scale = pdfThumbnailScale(natural.width, fitWidth, window.devicePixelRatio);
    const viewport = page.getViewport({ scale });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    renderTask = page.render({ canvas, viewport });
    await renderTask.promise;
  })();

  return {
    promise,
    cancel: () => {
      renderTask?.cancel();
      loadingTask.destroy();
    },
  };
}
