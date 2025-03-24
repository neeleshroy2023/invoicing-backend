const PDFDocument = require('pdfkit');

const generatePDF = (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });
      
      // Create a buffer to store the PDF
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Add company logo (if available)
      // doc.image('path/to/logo.png', 50, 45, { width: 50 })

      // Add invoice title
      doc
        .fontSize(20)
        .text('INVOICE', { align: 'center' })
        .moveDown();

      // Add invoice details
      doc
        .fontSize(12)
        .text(`Invoice Number: ${invoice.invoiceNumber}`)
        .text(`Date: ${invoice.issueDate.toLocaleDateString()}`)
        .text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`)
        .moveDown();

      // Add company details
      doc
        .fontSize(12)
        .text('From:')
        .text(invoice.user.fullName)
        .text(invoice.user.company?.name || '')
        .text(invoice.user.company?.address || '')
        .text(invoice.user.company?.phone || '')
        .moveDown();

      // Add client details
      doc
        .text('Bill To:')
        .text(invoice.client.name)
        .text(invoice.client.email)
        .text(invoice.client.address)
        .text(invoice.client.phone || '')
        .moveDown();

      // Create table header
      const tableTop = doc.y;
      doc
        .fontSize(10)
        .text('Description', 50, tableTop)
        .text('Quantity', 200, tableTop)
        .text('Rate', 280, tableTop)
        .text('Tax', 350, tableTop)
        .text('Amount', 450, tableTop)
        .moveDown();

      // Add line items
      let position = doc.y;
      invoice.items.forEach(item => {
        doc
          .text(item.description, 50, position)
          .text(item.quantity.toString(), 200, position)
          .text(`$${item.rate.toFixed(2)}`, 280, position)
          .text(`${item.tax}%`, 350, position)
          .text(`$${item.amount.toFixed(2)}`, 450, position);
        position = doc.y + 20;
      });

      // Add totals
      doc
        .moveDown()
        .text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, { align: 'right' })
        .text(`Tax Total: $${invoice.taxTotal.toFixed(2)}`, { align: 'right' })
        .text(`Total Amount: $${invoice.total.toFixed(2)}`, { align: 'right' })
        .moveDown();

      // Add notes if available
      if (invoice.notes) {
        doc
          .moveDown()
          .fontSize(10)
          .text('Notes:')
          .text(invoice.notes);
      }

      // Add terms if available
      if (invoice.terms) {
        doc
          .moveDown()
          .fontSize(10)
          .text('Terms and Conditions:')
          .text(invoice.terms);
      }

      // Add digital signature
      if (invoice.digitalSignature) {
        doc
          .moveDown()
          .fontSize(10)
          .text('Digital Signature:')
          .image(Buffer.from(invoice.digitalSignature.split(',')[1], 'base64'), {
            fit: [200, 100],
            align: 'center'
          });
      }

      // Add QR code
      if (invoice.qrCode) {
        doc
          .moveDown()
          .image(Buffer.from(invoice.qrCode.split(',')[1], 'base64'), {
            fit: [100, 100],
            align: 'right'
          });
      }

      // Finalize the PDF
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePDF };