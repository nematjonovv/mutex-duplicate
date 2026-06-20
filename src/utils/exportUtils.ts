import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './index';
import { Invoice } from '@/types';

// Interface for Invoice Data
export interface InvoiceExportData {
  invoiceNumber: string;
  customerName: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  driverName?: string;
  carNumber?: string;
  submitterName?: string;
  note?: string;
  items: Array<{
    productName: string;
    colorName?: string;
    colorCode?: string;
    bagsCount?: number;
    weightKg?: number;
    quantity: number;
    price: number;
    total: number;
  }>;
}

// Function to export invoices list to Excel
export const exportInvoicesListToExcel = (invoices: Invoice[], currency: string, rates: any) => {
  try {
    const convert = (amount: number) => amount / rates[currency];

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Headers
    const headers = [
      'Faktura Raqami',
      'Mijoz',
      'Sana',
      'Jami Summa',
      'To\'langan',
      'Qoldiq',
      'Holati'
    ];

    // Data
    const data = invoices.map(invoice => [
      invoice.invoiceNo,
      invoice.clientMeta.name,
      formatDate(invoice.createdAt),
      formatCurrency(convert(invoice.netTotal), currency),
      formatCurrency(convert(invoice.paid), currency),
      formatCurrency(convert(invoice.balance), currency),
      invoice.balance === 0 ? "To'langan" : invoice.paid > 0 ? "Qisman to'langan" : "To'lanmagan"
    ]);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Set column widths
    const wscols = [
      { wch: 15 }, // Invoice No
      { wch: 25 }, // Client Name
      { wch: 15 }, // Date
      { wch: 15 }, // Total
      { wch: 15 }, // Paid
      { wch: 15 }, // Balance
      { wch: 15 }  // Status
    ];
    ws['!cols'] = wscols;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Fakturalar');

    // Save file
    XLSX.writeFile(wb, `Fakturalar_${formatDate(new Date().toISOString())}.xlsx`);
  } catch (error) {
    console.error("Excel eksportida xatolik:", error);
    alert("Excel faylni yaratishda xatolik yuz berdi.");
  }
};

// Function to print invoices list (HTML Print)
export const printInvoicesList = (invoices: Invoice[], currency: string, rates: any) => {
  try {
    const convert = (amount: number) => amount / rates[currency];

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Chop etish oynasini ochib bo'lmadi. Pop-up bloklanmaganligini tekshiring.");
      return;
    }

    const totalNet = invoices.reduce((sum, inv) => sum + inv.netTotal, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid, 0);
    const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance, 0);

    const htmlContent = `
      <html>
        <head>
          <title>Fakturalar Ro'yxati</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; margin-bottom: 20px; }
            .meta { margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .text-right { text-align: right; }
            .totals { margin-top: 20px; float: right; width: 300px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold; }
            
            @media print {
              @page { margin: 1cm; size: landscape; }
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Fakturalar Ro'yxati</h1>
          <div class="meta">
            <strong>Sana:</strong> ${formatDate(new Date().toISOString())}<br>
            <strong>Jami fakturalar soni:</strong> ${invoices.length} ta
          </div>

          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Faktura</th>
                <th>Mijoz</th>
                <th>Sana</th>
                <th class="text-right">Jami Summa</th>
                <th class="text-right">To'langan</th>
                <th class="text-right">Qoldiq</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map((invoice, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${invoice.invoiceNo}</td>
                  <td>${invoice.clientMeta.name}</td>
                  <td>${formatDate(invoice.createdAt)}</td>
                  <td class="text-right">${formatCurrency(convert(invoice.netTotal), currency)}</td>
                  <td class="text-right">${formatCurrency(convert(invoice.paid), currency)}</td>
                  <td class="text-right">${formatCurrency(convert(invoice.balance), currency)}</td>
                  <td>${invoice.balance === 0 ? "To'langan" : invoice.paid > 0 ? "Qisman" : "To'lanmagan"}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Jami Savdo:</span>
              <span>${formatCurrency(convert(totalNet), currency)}</span>
            </div>
            <div class="total-row">
              <span>Jami To'langan:</span>
              <span>${formatCurrency(convert(totalPaid), currency)}</span>
            </div>
            <div class="total-row">
              <span>Jami Qarzdorlik:</span>
              <span>${formatCurrency(convert(totalBalance), currency)}</span>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } catch (error) {
    console.error("Chop etishda xatolik:", error);
    alert("Chop etish oynasini ochishda xatolik yuz berdi.");
  }
};

// Function to print single invoice (HTML Print)
export const printInvoice = (invoice: InvoiceExportData, currency: string = "USD") => {
  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up bloklanmaganligini tekshiring.");
      return;
    }

    const emptyRows = Math.max(0, 12 - invoice.items.length);

    const htmlContent = `
      <html>
        <head>
          <title>Faktura - ${invoice.invoiceNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 12px; }
            .page { max-width: 780px; margin: 0 auto; }

            .top-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
            .faktura-no-label { background: #ffff00; border: 1.5px solid #000; padding: 4px 10px; font-weight: bold; font-size: 13px; }
            .faktura-no-value { background: #ffff00; border: 1.5px solid #000; padding: 4px 16px; font-size: 28px; font-weight: bold; }
            .logo-area { margin-left: auto; text-align: center; }
            .logo-text { font-size: 20px; font-weight: bold; color: #2c3e50; letter-spacing: 2px; }
            .logo-sub { font-size: 9px; color: #555; }

            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
            .info-table td { border: 1px solid #000; padding: 3px 6px; font-size: 11px; vertical-align: middle; }
            .info-table .label { font-weight: bold; background: #f5f5f5; white-space: nowrap; }
            .yellow-bg { background: #ffff99 !important; }
            .right-summary { text-align: right; }

            .section-header { background: #c8e6c9; border: 1px solid #000; padding: 3px 8px; font-weight: bold; font-size: 11px; text-align: center; margin-top: 6px; }

            .main-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .main-table th { background: #e8f5e9; border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold; text-align: center; }
            .main-table td { border: 1px solid #000; padding: 3px 4px; font-size: 10px; text-align: center; height: 20px; }
            .main-table td.left { text-align: left; }
            .main-table .total-row td { background: #ffff99; font-weight: bold; }

            .bottom-row { display: flex; justify-content: space-between; margin-top: 16px; align-items: flex-end; }
            .sign-line { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 4px; font-size: 11px; font-weight: bold; }

            @media print {
              @page { margin: 0.8cm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="top-header">
              <div class="faktura-no-label">FAKTURA №</div>
              <div class="faktura-no-value">${invoice.invoiceNumber}</div>
              <div class="logo-area">
                <div class="logo-text">MUTex</div>
                <div class="logo-sub">Textile of Uzbekistan</div>
              </div>
            </div>

            <table class="info-table">
              <tr>
                <td class="label" style="width:100px;">KLIENT</td>
                <td style="width:150px; font-weight:bold;">${invoice.customerName}</td>
                <td class="label" style="width:130px;">KLIENT TEL. RAQAMI</td>
                <td style="width:130px;">${invoice.customerPhone || '-'}</td>
                <td class="label" style="width:110px;">TOVAR SUMMASI</td>
                <td class="yellow-bg right-summary" style="width:20px;">$</td>
                <td class="yellow-bg right-summary" style="width:80px; color:#c00;">${invoice.totalAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="label">${invoice.submitterName || '-'}</td>
                <td></td>
                <td class="label">XAYDOVCHI IMZOSI</td>
                <td>${invoice.driverName || '-'}</td>
                <td class="label">XOZIRGI QOLDIQ</td>
                <td class="yellow-bg right-summary">$</td>
                <td class="yellow-bg right-summary" style="color:#c00;">${invoice.paidAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="label">SANA</td>
                <td>${formatDate(invoice.date)}</td>
                <td class="label">AVTOMOBIL RAQAMI</td>
                <td>${invoice.carNumber || '-'}</td>
                <td class="label">JAMI QOLDIQ</td>
                <td class="yellow-bg right-summary">$</td>
                <td class="yellow-bg right-summary" style="color:#c00;">${invoice.remainingAmount.toFixed(2)}</td>
              </tr>
            </table>

            <div class="section-header">YUK NAKLADNOYI</div>

            <table class="main-table">
              <thead>
                <tr>
                  <th style="width:44px;">SANA</th>
                  <th style="width:52px;">RANGI</th>
                  <th style="width:44px;">RANG №</th>
                  <th style="width:54px;">IP №</th>
                  <th style="width:54px;">QOP SONI</th>
                  <th style="width:44px;">TOIFASI</th>
                  <th style="width:34px;">USL</th>
                  <th style="width:34px;">VOZ</th>
                  <th style="width:44px;">KG</th>
                  <th style="width:14px;">$</th>
                  <th style="width:50px;">NARXI</th>
                  <th style="width:64px;">JAMI</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map(item => `
                  <tr>
                    <td>${formatDate(invoice.date)}</td>
                    <td class="left">${item.colorName || '-'}</td>
                    <td>${item.colorCode || '-'}</td>
                    <td>${item.productName}</td>
                    <td>${item.bagsCount || '-'}</td>
                    <td>${item.colorName?.includes('OCH') ? 'OCH' : "TO'Q"}</td>
                    <td></td>
                    <td></td>
                    <td>${item.weightKg || item.quantity}</td>
                    <td>$</td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>$${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
                ${'<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>$</td><td>-</td><td></td></tr>'.repeat(emptyRows)}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="4" style="text-align:left;">JAMI QOP:</td>
                  <td>${invoice.items.reduce((s, i) => s + (i.bagsCount || 0), 0)}</td>
                  <td></td><td></td><td></td>
                  <td>${invoice.items.reduce((s, i) => s + (i.weightKg || i.quantity || 0), 0).toFixed(2)}</td>
                  <td>$</td>
                  <td></td>
                  <td>$${invoice.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div class="bottom-row">
              <div class="sign-line">TOPSHIRDI: ${invoice.submitterName || '_____________'}</div>
              <div class="sign-line">QABUL QILDI: ${invoice.customerName}</div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } catch (error) {
    console.error("Chop etishda xatolik:", error);
    alert("Chop etishda xatolik yuz berdi.");
  }
};

// Function to export invoice to Excel
export const exportInvoiceToExcel = (invoice: InvoiceExportData, currency: string = "UZS") => {
  try {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Header Info
    const headerData = [
      ['Faktura Raqami:', invoice.invoiceNumber],
      ['Yuboruvchi:', 'MUTex'],
      ['Mijoz:', invoice.customerName],
      ['Sana:', formatDate(invoice.date)],
      ['Holati:', invoice.status],
      [''], // Empty row
      ['Mahsulotlar Ro\'yxati'],
    ];

    // Table Headers
    const tableHeaders = [['Mahsulot Nomi', 'Rangi', 'Rang Kodi', 'Qop', 'Jami Kg', 'Narxi (1kg)', 'Jami']];

    // Table Data
    const tableData = invoice.items.map(item => [
      item.productName,
      item.colorName || '-',
      item.colorCode || '-',
      item.bagsCount || 0,
      item.weightKg || item.quantity,
      formatCurrency(item.price, currency),
      formatCurrency(item.total, currency)
    ]);

    // Footer Data (Totals)
    const footerData = [
      [''],
      ['Jami Summa:', '', '', formatCurrency(invoice.totalAmount, currency)],
      ['To\'langan:', '', '', formatCurrency(invoice.paidAmount, currency)],
      ['Qoldiq:', '', '', formatCurrency(invoice.remainingAmount, currency)]
    ];

    // Combine all data
    const wsData = [...headerData, ...tableHeaders, ...tableData, ...footerData];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const wscols = [
      { wch: 30 }, // Product Name
      { wch: 15 }, // Color Name
      { wch: 10 }, // Color Code
      { wch: 10 }, // Bags
      { wch: 10 }, // Weight
      { wch: 20 }, // Price
      { wch: 20 }  // Total
    ];
    ws['!cols'] = wscols;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Faktura');

    // Save file
    XLSX.writeFile(wb, `Faktura_${invoice.invoiceNumber}.xlsx`);
  } catch (error) {
    console.error("Excel eksportida xatolik:", error);
    alert("Excel faylni yaratishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
  }
};

// Function to export invoice to PDF (Print)
export const exportInvoiceToPDF = (invoice: InvoiceExportData) => {
  try {
    const doc = new jsPDF();

    // Company/Header Info
    doc.setFontSize(36);
    doc.setTextColor(44, 62, 80); // Dark blue-grey
    doc.text('MUTex', 14, 25); // Left aligned

    doc.setTextColor(0, 0, 0); // Reset to black
    doc.setFontSize(18);
    doc.text('Faktura', 196, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100); // Grey
    doc.text(`№ ${invoice.invoiceNumber}`, 196, 26, { align: 'right' });
    doc.text(`Sana: ${formatDate(invoice.date)}`, 196, 31, { align: 'right' });

    doc.setTextColor(0, 0, 0); // Reset
    doc.setFontSize(12);
    doc.text(`Mijoz: ${invoice.customerName}`, 14, 45);
    doc.text(`Holati: ${invoice.status}`, 14, 53);

    // Table
    const tableColumn = ["Mahsulot Nomi", "Rangi", "Rang Kodi", "Qop", "Jami Kg", "Narxi (1kg)", "Jami"];
    const tableRows: any[] = [];

    invoice.items.forEach(item => {
      const invoiceData = [
        item.productName,
        item.colorName || '-',
        item.colorCode || '-',
        item.bagsCount || '-',
        item.weightKg || item.quantity,
        formatCurrency(item.price),
        formatCurrency(item.total)
      ];
      tableRows.push(invoiceData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 80,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] }, // Dark grey header
      styles: { fontSize: 10, cellPadding: 3 },
    });

    // Footer (Totals)
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.text(`Jami Summa: ${formatCurrency(invoice.totalAmount)}`, 140, finalY);
    doc.text(`To'langan: ${formatCurrency(invoice.paidAmount)}`, 140, finalY + 8);
    doc.text(`Qoldiq: ${formatCurrency(invoice.remainingAmount)}`, 140, finalY + 16);

    // Save PDF
    doc.save(`Faktura_${invoice.invoiceNumber}.pdf`);

    // Open print dialog
    doc.autoPrint();
    // For autoPrint to work in some browsers, we might need to open it in a new window
    // window.open(doc.output('bloburl'), '_blank'); 
  } catch (error) {
    console.error("PDF eksportida xatolik:", error);
    alert("PDF faylni yaratishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
  }
};

// Interface for Soft Hank Data
export interface SoftHankExportData {
  batchNumber: string;
  dyehouseName: string;
  rawMaterialName: string;
  weight: number;
  date: string;
  comment: string;
}

// Function to export soft hanks to Excel
export const exportSoftHanksToExcel = (data: SoftHankExportData[]) => {
  try {
    const wb = XLSX.utils.book_new();

    const exportData = data.map(item => ({
      "Partiya raqami": item.batchNumber || "-",
      "Bo'yoqxona nomi": item.dyehouseName,
      "Xom ashyo nomi": item.rawMaterialName,
      "Og'irligi (kg)": item.weight,
      "Sana": formatDate(item.date),
      "Izoh": item.comment || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const wscols = [
      { wch: 15 }, // Partiya raqami
      { wch: 25 }, // Bo'yoqxona nomi
      { wch: 20 }, // Xom ashyo nomi
      { wch: 12 }, // Og'irligi (kg)
      { wch: 12 }, // Sana
      { wch: 30 }, // Izoh
    ];
    ws["!cols"] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Yumshoq motkalar");
    XLSX.writeFile(wb, `yumshoq_motkalar_${formatDate(new Date())}.xlsx`);
  } catch (error) {
    console.error("Excel eksportida xatolik:", error);
    alert("Excel faylni yaratishda xatolik yuz berdi.");
  }
};

// Function to export soft hanks to PDF (Print)
export const exportSoftHanksToPDF = (data: SoftHankExportData[]) => {
  try {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text("Yumshoq motkalar ro'yxati", 105, 20, { align: "center" });

    // Date
    doc.setFontSize(10);
    doc.text(`Sana: ${formatDate(new Date())}`, 14, 30);

    // Table
    const tableColumn = ["Partiya", "Bo'yoqxona", "Xom ashyo", "Vazn (kg)", "Sana", "Izoh"];
    const tableRows = data.map(item => [
      item.batchNumber || "-",
      item.dyehouseName,
      item.rawMaterialName,
      formatCurrency(item.weight).replace("UZS", "").trim(), // Just formatting number
      formatDate(item.date),
      item.comment || "-"
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 8, cellPadding: 2 },
    });

    // Totals
    const totalWeight = data.reduce((sum, item) => sum + item.weight, 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.text(`Jami vazn: ${formatCurrency(totalWeight).replace("UZS", "").trim()} kg`, 14, finalY);
    doc.text(`Jami soni: ${data.length} ta`, 14, finalY + 6);

    // doc.autoPrint(); // Don't autoPrint here, let the blob url handle it or user choice
    window.open(doc.output('bloburl'), '_blank');
  } catch (error) {
    console.error("PDF eksportida xatolik:", error);
    alert("PDF faylni yaratishda xatolik yuz berdi.");
  }
};
