const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send invoice email with PDF attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Email text content
 * @param {Buffer} options.pdfBuffer - PDF file buffer
 * @param {string} [options.invoiceNumber] - Invoice number for the PDF filename
 */
const sendInvoiceEmail = async ({ to, subject, text, pdfBuffer, invoiceNumber = 'invoice' }) => {
  try {
    // Verify transporter connection
    await transporter.verify();

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"Invoice Service" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Invoice</h2>
          <p>${text}</p>
          <p>Please find the invoice attached to this email.</p>
          <p style="margin-top: 20px;">
            Thank you for your business!
          </p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send invoice email');
  }
};

// Test email connection on startup
const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email server connection established');
  } catch (error) {
    console.error('Email server connection failed:', error);
  }
};

module.exports = {
  sendInvoiceEmail,
  testEmailConnection
};