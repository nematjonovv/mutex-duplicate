import { Batch } from "@/services/batchService";
import { formatDateTime, formatNumber } from "@/utils";

interface PrintOptions {
  title?: string;
  filterInfo?: string;
}

export const printBatchList = (batches: Batch[], options: PrintOptions = {}) => {
  const { title = "Partiyalar ro'yxati", filterInfo } = options;

  // Calculate totals
  const totalInputWeight = batches.reduce((sum, b) => sum + (b.weightKg || 0), 0);
  const totalOutputWeight = batches.reduce((sum, b) => {
    const packages = b.packages || [];
    return sum + packages.reduce((pSum, pkg) => pSum + (pkg.nettoKg || 0), 0);
  }, 0);
  const totalDiff = totalOutputWeight - totalInputWeight;

  // Create hidden iframe for printing
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.left = "-9999px";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error("Could not access iframe document");
    document.body.removeChild(iframe);
    return;
  }

  const rows = batches.map((batch, index) => {
    const packages = batch.packages || [];
    const outputWeight = packages.reduce((sum, pkg) => sum + (pkg.nettoKg || 0), 0);
    const diff = outputWeight - (batch.weightKg || 0);
    const diffPercent = batch.weightKg ? (diff / batch.weightKg) * 100 : 0;
    const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';
    const sign = diff > 0 ? '+' : '';

    return `
      <tr>
        <td class="center">${index + 1}</td>
        <td class="batch-number">${batch.batchNumber}</td>
        <td>${batch.threadType}<br><small>${batch.threadNumber}</small></td>
        <td>${batch.colorName}<br><small>(${batch.colorCode})</small></td>
        <td>${batch.clientName || '-'}</td>
        <td class="right">${formatNumber(batch.weightKg)}</td>
        <td class="right">${formatNumber(outputWeight)}</td>
        <td class="right ${diffClass}">${sign}${formatNumber(diff)} (${sign}${formatNumber(diffPercent, 1)}%)</td>
        <td class="center">${formatDateTime(batch.createdAt)}</td>
        <td class="center">${formatDateTime(batch.updatedAt)}</td>
      </tr>
    `;
  }).join('');

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 15px; color: #333; font-size: 11px; }

        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
        .header h1 { font-size: 18px; text-transform: uppercase; margin-bottom: 5px; }
        .header .filter-info { font-size: 12px; color: #666; }
        .header .date { font-size: 10px; color: #888; margin-top: 5px; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; font-size: 10px; text-transform: uppercase; }

        .center { text-align: center; }
        .right { text-align: right; }
        .batch-number { font-family: monospace; font-weight: bold; color: #1890ff; }

        .positive { color: #52c41a; }
        .negative { color: #f5222d; }

        small { color: #888; font-size: 9px; }

        .totals { margin-top: 15px; }
        .totals table { width: auto; }
        .totals th, .totals td { padding: 6px 12px; }
        .totals th { background-color: #e6f7ff; }

        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9px; display: flex; justify-content: space-between; }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: landscape; margin: 10mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        ${filterInfo ? `<div class="filter-info">${filterInfo}</div>` : ''}
        <div class="date">Chop etilgan: ${new Date().toLocaleString("uz-UZ")}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="center" style="width: 30px;">№</th>
            <th style="width: 80px;">Partiya</th>
            <th>Ip turi / Raqami</th>
            <th>Rang</th>
            <th>Mijoz</th>
            <th class="right" style="width: 70px;">Kirish (kg)</th>
            <th class="right" style="width: 70px;">Chiqish (kg)</th>
            <th class="right" style="width: 100px;">Farq</th>
            <th class="center" style="width: 90px;">Kirish</th>
            <th class="center" style="width: 90px;">Yangilanish</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <th>Jami partiyalar:</th>
            <td>${batches.length} ta</td>
            <th>Jami kirish:</th>
            <td>${formatNumber(totalInputWeight)} kg</td>
            <th>Jami chiqish:</th>
            <td>${formatNumber(totalOutputWeight)} kg</td>
            <th>Jami farq:</th>
            <td class="${totalDiff > 0 ? 'positive' : totalDiff < 0 ? 'negative' : ''}">${totalDiff > 0 ? '+' : ''}${formatNumber(totalDiff)} kg</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <span>MUTEX - Partiyalar boshqaruvi</span>
        <span>Sahifa: 1</span>
      </div>
    </body>
    </html>
  `);

  iframeDoc.close();

  // Wait for content to load then print
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Remove iframe after printing
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 500);
  }, 250);
};
