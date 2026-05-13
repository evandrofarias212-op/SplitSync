// =============================================
// FILE: utils/invoiceGenerator.js
// Generates a professional invoice PDF
// using PDFKit — no browser needed!
// =============================================

const PDFDocument = require('pdfkit');

const generateInvoicePDF = (invoiceData) => {
  return new Promise((resolve, reject) => {

    const {
      invoiceNumber,
      companyName,
      companyCNPJ,
      clientName,
      groupName,
      items,
      totalValue,
      paymentDate,
      dueDate,
      isInstallment,
      installmentInfo,
    } = invoiceData;

    const formatCurrency = (value) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const formatDate = (dateStr) => {
      if (!dateStr) return '—';
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
    };

    // ── Create document ──
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: true,
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Colors ──
    const purple    = '#6c63ff';
    const dark      = '#1a1a2e';
    const gray      = '#888888';
    const lightGray = '#f5f5ff';
    const white     = '#ffffff';
    const green     = '#22c55e';

    // ── Page dimensions ──
    const W = 595; // A4 width in points
    const L = 50;  // Left margin
    const R = W - 50; // Right margin
    const CW = R - L; // Content width

    let y = 0; // Current Y position

    // ══════════════════════════════════════
    // HEADER
    // ══════════════════════════════════════
    doc.rect(0, 0, W, 90).fill(purple);

    // Company name
    doc.fillColor(white).font('Helvetica-Bold').fontSize(20)
       .text(companyName, L, 20, { width: 250 });

    // CNPJ
    doc.fillColor('rgba(255,255,255,0.75)').font('Helvetica').fontSize(10)
       .text(`CNPJ/CPF: ${companyCNPJ}`, L, 46);

    // Invoice title
    doc.fillColor(white).font('Helvetica-Bold').fontSize(22)
       .text('NOTA FISCAL', L, 18, { width: CW, align: 'right' });

    // Invoice number
    doc.fillColor('rgba(255,255,255,0.75)').font('Helvetica').fontSize(10)
       .text(`Nº ${invoiceNumber}`, L, 46, { width: CW, align: 'right' });

    // Status badge
    doc.roundedRect(R - 80, 62, 80, 18, 9).fill(green);
    doc.fillColor(white).font('Helvetica-Bold').fontSize(9)
       .text('✓ PAGO', R - 80, 67, { width: 80, align: 'center' });

    y = 108;

    // ══════════════════════════════════════
    // INFO BOXES
    // ══════════════════════════════════════
    const boxW = (CW - 12) / 2;
    const boxH = 72;

    // Left box - Client
    doc.roundedRect(L, y, boxW, boxH, 6).fill(lightGray);
    doc.fillColor(purple).font('Helvetica-Bold').fontSize(8)
       .text('DADOS DO CLIENTE', L + 12, y + 10);
    doc.moveTo(L + 12, y + 21).lineTo(L + boxW - 12, y + 21)
       .strokeColor(purple).lineWidth(0.5).stroke();

    doc.fillColor(gray).font('Helvetica').fontSize(9).text('Nome:', L + 12, y + 27);
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(9)
       .text(clientName, L + 50, y + 27, { width: boxW - 62 });

    doc.fillColor(gray).font('Helvetica').fontSize(9).text('Grupo:', L + 12, y + 42);
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(9)
       .text(groupName, L + 50, y + 42, { width: boxW - 62 });

    // Right box - Payment
    const rx = L + boxW + 12;
    doc.roundedRect(rx, y, boxW, boxH, 6).fill(lightGray);
    doc.fillColor(purple).font('Helvetica-Bold').fontSize(8)
       .text('DADOS DO PAGAMENTO', rx + 12, y + 10);
    doc.moveTo(rx + 12, y + 21).lineTo(rx + boxW - 12, y + 21)
       .strokeColor(purple).lineWidth(0.5).stroke();

    doc.fillColor(gray).font('Helvetica').fontSize(9).text('Pagamento:', rx + 12, y + 27);
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(9)
       .text(formatDate(paymentDate), rx + 70, y + 27);

    doc.fillColor(gray).font('Helvetica').fontSize(9).text('Vencimento:', rx + 12, y + 42);
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(9)
       .text(formatDate(dueDate), rx + 70, y + 42);

    doc.fillColor(gray).font('Helvetica').fontSize(9).text('Parcelado:', rx + 12, y + 57);
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(9)
       .text(isInstallment ? 'Sim' : 'Não', rx + 70, y + 57);

    y += boxH + 16;

    // ══════════════════════════════════════
    // ITEMS TABLE
    // ══════════════════════════════════════
    doc.fillColor(purple).font('Helvetica-Bold').fontSize(8)
       .text('ITENS / SERVIÇOS', L, y);

    y += 12;

    // Table header
    doc.rect(L, y, CW, 20).fill(purple);
    doc.fillColor(white).font('Helvetica-Bold').fontSize(8);
    doc.text('#',           L + 6,       y + 6);
    doc.text('DESCRIÇÃO',   L + 22,      y + 6);
    doc.text('QTD',         L + 270,     y + 6);
    doc.text('VALOR UNIT.', L + 310,     y + 6);
    doc.text('TOTAL',       L + 400,     y + 6);

    y += 20;

    // Table rows
    const rowH = 18;
    items.forEach((item, index) => {
      const bg = index % 2 === 0 ? white : lightGray;
      doc.rect(L, y, CW, rowH).fill(bg);

      doc.fillColor(dark).font('Helvetica').fontSize(8);
      doc.text(String(index + 1),               L + 6,   y + 5);
      doc.text(item.description,                 L + 22,  y + 5, { width: 240, ellipsis: true });
      doc.text(String(item.quantity || 1),        L + 270, y + 5);
      doc.text(formatCurrency(item.unit_price),   L + 310, y + 5);
      doc.fillColor(purple).font('Helvetica-Bold').fontSize(8)
         .text(formatCurrency(item.total_price),  L + 400, y + 5);

      y += rowH;
    });

    // Table border
    doc.rect(L, y - (items.length * rowH) - 20, CW, (items.length * rowH) + 20)
       .strokeColor('#e0e0f0').lineWidth(0.5).stroke();

    y += 8;

    // ══════════════════════════════════════
    // INSTALLMENT INFO (if applicable)
    // ══════════════════════════════════════
    if (isInstallment && installmentInfo) {
      doc.roundedRect(L, y, CW, 22, 4).fill('#fff8e6');
      doc.fillColor('#8a6d00').font('Helvetica-Bold').fontSize(8)
         .text('Parcelamento: ', L + 10, y + 7, { continued: true });
      doc.font('Helvetica').text(installmentInfo);
      y += 30;
    }

    // ══════════════════════════════════════
    // TOTAL
    // ══════════════════════════════════════
    y += 4;
    doc.roundedRect(R - 160, y, 160, 36, 6).fill(purple);
    doc.fillColor('rgba(255,255,255,0.75)').font('Helvetica').fontSize(8)
       .text('VALOR TOTAL', R - 160, y + 6, { width: 160, align: 'center' });
    doc.fillColor(white).font('Helvetica-Bold').fontSize(16)
       .text(formatCurrency(totalValue), R - 160, y + 17, { width: 160, align: 'center' });

    y += 52;

    // ══════════════════════════════════════
    // FOOTER
    // ══════════════════════════════════════
    doc.moveTo(L, y).lineTo(R, y).strokeColor('#eeeeee').lineWidth(0.5).stroke();
    y += 8;

    doc.fillColor(purple).font('Helvetica-Bold').fontSize(10)
       .text('SplitSync', L, y);
    doc.fillColor(gray).font('Helvetica').fontSize(8)
       .text('Sistema de Gestão de Grupos', L, y + 13);

    doc.fillColor(gray).font('Helvetica').fontSize(8)
       .text(`Emitida em: ${new Date().toLocaleDateString('pt-BR')}`, L, y, { width: CW, align: 'right' })
       .text('Documento gerado automaticamente', L, y + 13, { width: CW, align: 'right' });

    doc.end();
  });
};

module.exports = { generateInvoicePDF };