import { Batch } from "@/services/batchService";

export const printBatch = (batch: Batch, onAfterPrint?: () => void) => {
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
    onAfterPrint?.();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Partiya #${batch.batchNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; position: relative; }
        .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
        .batch-box { position: absolute; top: 0; right: 0; border: 2px solid #333; padding: 5px 15px; font-size: 20px; font-weight: bold; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .info-table td { border: none; padding: 4px 0; font-size: 14px; }
        .info-table td:first-child { width: 120px; font-weight: bold; }

        .process-table { margin-top: 10px; }
        .process-table th, .process-table td { border: 1px solid #666; padding: 6px; font-size: 11px; text-align: left; }
        .process-table th { background-color: #f2f2f2; text-transform: uppercase; }
        .section-title { background-color: #eee !important; font-weight: bold; text-align: center !important; }
        .process-name { background-color: #d9d9d9 !important; font-weight: bold; text-align: center !important; font-size: 13px; text-transform: uppercase; padding: 8px !important; }

        .final-table { width: 50%; margin-top: 15px; }
        .final-table td { border: 1px solid #666; padding: 6px; font-size: 13px; font-weight: bold; }
        .final-table td:first-child { background-color: #f9f9f9; width: 60%; }

        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 10px; display: flex; justify-content: space-between; }
        
        .page-break { page-break-before: always; }
        
        .tracking-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .tracking-table th, .tracking-table td { border: 1px solid #000; padding: 6px 8px; text-align: center; font-size: 13px; height: 35px; }
        .tracking-table th { background-color: #f2f2f2; font-weight: bold; }
        .tracking-header { text-align: center; margin-bottom: 15px; }
        .tracking-header h2 { margin: 0; font-size: 18px; text-transform: uppercase; }

        .signature-section { margin-top: 25px; width: 100%; }
        .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .signature-item { margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 5px; display: flex; justify-content: space-between; align-items: flex-end; }
        .signature-label { font-weight: bold; font-size: 13px; }
        .signature-line { flex: 1; margin: 0 10px; border-bottom: 1px dotted #666; }

        @media print { 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="page-content">
        <div class="header">
          <h1>NAZORAT KARTASI</h1>
          <div class="batch-box">PARTIYA: ${batch.batchNumber}</div>
        </div>

        <table class="info-table">
          <tr><td>MIJOZ:</td><td>${batch.clientName || "MUTEX"}</td></tr>
          <tr><td>IP TURI:</td><td>${batch.threadType}</td></tr>
          <tr><td>RANG NOMI:</td><td>${batch.colorName}</td></tr>
          <tr><td>RANG KODI:</td><td>${batch.colorCode}</td></tr>
          <tr><td>OG'IRLIK:</td><td>${batch.weightKg?.toLocaleString() || ""} kg</td></tr>
          <tr><td>BOBINA SONI:</td><td>${batch.conesCount || ""}</td></tr>
        </table>

        <table class="process-table">
          <thead>
            <tr><th colspan="5" class="section-title">ISHLAB CHIQARISH JARAYONI</th></tr>
            <tr><th>F.I.O.</th><th>SMENA</th><th>BOSHLASH</th><th>TUGASH</th><th>IMZO</th></tr>
          </thead>
          <tbody>
            <tr><td colspan="5" class="process-name">TORTISH</td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>

            <tr><td colspan="5" class="process-name">BO'YASH</td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>

            <tr><td colspan="5" class="process-name">SIQISH</td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>

            <tr><td colspan="5" class="process-name">QURITISH</td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>

            <tr><td colspan="5" class="process-name">RANGLI O'RASH</td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>

            <tr><td colspan="5" class="process-name">SIFAT NAZORATI</td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>

            <tr><td colspan="5" class="process-name">TORTIB OLISH</td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>

        <table class="final-table">
          <tr><td colspan="2" class="section-title">YAKUNIY NATIJA</td></tr>
          <tr><td>QOPLAR SONI</td><td></td></tr>
          <tr><td>BOBINA SONI</td><td></td></tr>
          <tr><td>BRUTTO (KG)</td><td></td></tr>
          <tr><td>NETTO (KG)</td><td></td></tr>
        </table>

        <div class="footer">
          <span>Yaratilgan: ${new Date().toLocaleString("uz-UZ")}</span>
          <span>Sana: ${new Date(batch.createdAt || Date.now()).toLocaleDateString("uz-UZ")}</span>
        </div>
      </div>

      <!-- Second Page: Tracking List -->
      <div class="page-break"></div>
      <div class="tracking-header">
        <h2>MAXSULOTLARNI QO'LDA QAYD ETISH RO'YXATI</h2>
        <div style="margin-top: 8px; font-weight: bold; font-size: 14px;">
          PARTIYA: ${batch.batchNumber} | IP TURI: ${batch.threadType} | RANG: ${batch.colorName}
        </div>
      </div>

      <table class="tracking-table">
        <thead>
          <tr>
            <th style="width: 40px;">N</th>
            <th style="width: 150px;">Partiya (Lot)</th>
            <th>BRUTTO (kg)</th>
            <th>Konuslar</th>
            <th>Tara</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 15 }).map((_, i) => `
            <tr>
              <td>${i + 1}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="signature-section">
        <div class="signature-grid">
          <div>
            <div class="signature-item">
              <span class="signature-label">Ombor mudiri:</span>
              <span class="signature-line"></span>
            </div>
            <div class="signature-item">
              <span class="signature-label">Sifat nazorati:</span>
              <span class="signature-line"></span>
            </div>
          </div>
          <div>
            <div class="signature-item">
              <span class="signature-label">Qoplovchi:</span>
              <span class="signature-line"></span>
            </div>
            <div class="signature-item">
              <span class="signature-label">Sana:</span>
              <span class="signature-line"></span>
            </div>
          </div>
        </div>
        <div style="margin-top: 10px; font-size: 12px; font-style: italic;">
          Izoh: Jami og'irlik: _________ kg | Jami qoplar: _________ ta
        </div>
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
      onAfterPrint?.();
    }, 500);
  }, 250);
};
