import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export async function exportMindMapPdf(
  element: HTMLElement,
  leiNome: string,
  artigo: string
) {
  const toastId = toast.loading('Gerando PDF...');

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#030712',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgW = canvas.width;
    const imgH = canvas.height;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const headerH = 18;
    const footerH = 10;
    const contentW = pageW - margin * 2;
    const contentH = pageH - headerH - footerH - margin;

    const ratio = contentW / (imgW / 2); // scale:2 so divide
    const scaledH = (imgH / 2) * ratio;

    const addHeaderFooter = (pageNum: number, totalPages: number) => {
      // Header bar
      pdf.setFillColor(3, 7, 18);
      pdf.rect(0, 0, pageW, headerH, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(234, 179, 8);
      pdf.text(leiNome, margin, 8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(180, 180, 180);
      pdf.text(`${artigo} — Mapa Mental`, margin, 14);

      // Footer
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text('Vacatio — Mapa Mental', margin, pageH - 4);
      pdf.text(`${pageNum}/${totalPages}`, pageW - margin, pageH - 4, { align: 'right' });
    };

    if (scaledH <= contentH) {
      // Single page
      addHeaderFooter(1, 1);
      pdf.addImage(imgData, 'PNG', margin, headerH, contentW, scaledH);
    } else {
      // Multi-page: slice the canvas
      const sliceHeightPx = (contentH / ratio) * 2; // in canvas pixels
      const totalPages = Math.ceil(imgH / sliceHeightPx);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();

        const srcY = i * sliceHeightPx;
        const srcH = Math.min(sliceHeightPx, imgH - srcY);
        const destH = (srcH / 2) * ratio;

        // Create a slice canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgW;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, srcH);

        const sliceData = sliceCanvas.toDataURL('image/png');
        addHeaderFooter(i + 1, totalPages);
        pdf.addImage(sliceData, 'PNG', margin, headerH, contentW, destH);
      }
    }

    const fileName = `mapa-mental-${artigo.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`;
    pdf.save(fileName);
    toast.success('PDF exportado!', { id: toastId });
  } catch (err) {
    console.error(err);
    toast.error('Erro ao gerar PDF', { id: toastId });
  }
}
