import { pdfjsLib, getPdfDocumentParams } from '@/lib/pdfWorkerConfig';

/**
 * Extracts the first page of a PDF file as a JPEG Data URL.
 * 
 * @param fileData The ArrayBuffer of the PDF file
 * @param scale The rendering scale to control quality/size (default 1.0)
 * @returns A promise that resolves to the JPEG Data URL of the first page
 */
export async function extractFirstPageAsCover(fileData: ArrayBuffer, scale = 1.0): Promise<string> {
  const loadingTask = pdfjsLib.getDocument(getPdfDocumentParams(fileData));
  const pdfDoc = await loadingTask.promise;
  
  if (pdfDoc.numPages === 0) {
    throw new Error('PDF has no pages');
  }

  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale });

  // Create an off-screen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get 2d context from canvas');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // Render PDF page into canvas context
  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  // Convert to highly compressed JPEG to save storage space
  return canvas.toDataURL('image/jpeg', 0.85);
}
