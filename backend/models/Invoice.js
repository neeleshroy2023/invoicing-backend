const mongoose = require('mongoose');

const serviceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Service description is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  amount: {
    type: Number,
    required: true
  }
});

const invoiceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  client: {
    name: {
      type: String,
      required: [true, 'Client name is required']
    },
    email: {
      type: String,
      required: [true, 'Client email is required'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    address: {
      type: String,
      required: [true, 'Client address is required']
    },
    phone: String
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: [serviceItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  taxTotal: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Paid', 'Pending'],
    default: 'Pending'
  },
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
      required: function() {
        return this.recurring.isRecurring;
      }
    },
    nextInvoiceDate: {
      type: Date,
      required: function() {
        return this.recurring.isRecurring;
      }
    }
  },
  notes: String,
  terms: String,
  digitalSignature: {
    type: String,  // Base64 encoded signature image
    required: true
  },
  qrCode: {
    type: String,  // Base64 encoded QR code image
    required: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function(next) {
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  
  // Calculate tax total
  this.taxTotal = this.items.reduce((sum, item) => sum + (item.quantity * item.rate * (item.tax / 100)), 0);
  
  // Calculate total
  this.total = this.subtotal + this.taxTotal;
  
  next();
});

// Static method to generate the next invoice number
invoiceSchema.statics.generateInvoiceNumber = async function() {
  const lastInvoice = await this.findOne().sort({ invoiceNumber: -1 });
  if (!lastInvoice) {
    return 'INV-0001';
  }
  
  const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
  const nextNumber = lastNumber + 1;
  return `INV-${String(nextNumber).padStart(4, '0')}`;
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;