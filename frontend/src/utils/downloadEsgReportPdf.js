import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function sanitizeFilename(name) {
  return String(name || 'FoodLoop')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'FoodLoop';
}

/**
 * Renders the ESG print layout off-screen and saves a multi-page A4 PDF.
 * @param {string} elementId - DOM id of `.esg-print-root`
 * @param {{ company?: string; periodLabel?: string }} meta
 */
export async function downloadEsgReportPdf(elementId, meta = {}) {
  const source = document.getElementById(elementId);
  if (!source) {
    throw new Error('Report layout not found. Refresh and try again.');
  }

  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;';

  const clone = source.cloneNode(true);
  clone.style.display = 'block';
  clone.style.visibility = 'visible';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const company = sanitizeFilename(meta.company);
    const period = sanitizeFilename(meta.periodLabel || 'report');
    pdf.save(`${company}-ESG-CSR-${period}.pdf`);
  } finally {
    document.body.removeChild(wrapper);
  }
}
