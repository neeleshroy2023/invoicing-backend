const Invoice = require('../models/Invoice');
const { validationResult } = require('express-validator');
const QRCode = require('qrcode');
const { generatePDF } = require('../utils/pdfGenerator');
const { sendInvoiceEmail } = require('../utils/emailSender');

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      client,
      items,
      dueDate,
      notes,
      terms,
      recurring,
      digitalSignature
    } = req.body;

    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber();

    // Generate QR code containing invoice details
    const qrCodeData = JSON.stringify({
      invoiceNumber,
      client: client.name,
      amount: items.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
      issueDate: new Date()
    });

    const qrCode = await QRCode.toDataURL(qrCodeData);

    // Calculate amounts for each item
    const calculatedItems = items.map(item => ({
      ...item,
      amount: item.quantity * item.rate
    }));

    // Calculate totals
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.amount, 0);
    const taxTotal = calculatedItems.reduce((sum, item) => sum + (item.amount * (item.tax / 100)), 0);
    const total = subtotal + taxTotal;

    // Create invoice
    const invoice = await Invoice.create({
      user: req.user._id,
      invoiceNumber,
      client,
      items: calculatedItems,
      dueDate,
      notes,
      terms,
      recurring,
      digitalSignature,
      qrCode,
      subtotal,
      taxTotal,
      total
    });

    // Generate PDF
    const pdfBuffer = await generatePDF(invoice);

    // Try to send email if client email is provided, but don't fail if email sending fails
    if (client.email) {
      try {
        await sendInvoiceEmail({
          to: client.email,
          subject: `Invoice ${invoiceNumber} from ${req.user.fullName}`,
          text: `Please find attached invoice ${invoiceNumber}`,
          pdfBuffer
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Continue with the response even if email fails
      }
    }

    res.status(201).json({
      success: true,
      data: invoice,
      message: client.email ? 'Invoice created but email sending failed' : 'Invoice created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invoices for logged in user
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res, next) => {
  try {
    let invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Don't allow updates if invoice is paid
    if (invoice.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a paid invoice'
      });
    }

    // Update invoice
    invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice status
// @route   PATCH /api/invoices/:id/status
// @access  Private
const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['Paid', 'Pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Don't allow deletion of paid invoices
    if (invoice.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a paid invoice'
      });
    }

    await invoice.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send invoice email
// @route   POST /api/invoices/:id/send
// @access  Private
const sendInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(invoice);

    // Send email
    await sendInvoiceEmail({
      to: invoice.client.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${req.user.fullName}`,
      text: `Please find attached invoice ${invoice.invoiceNumber}`,
      pdfBuffer
    });

    res.json({
      success: true,
      message: 'Invoice sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  sendInvoice
};