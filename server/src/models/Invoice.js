import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema(
  {
    batchCode: {
      type: String,
      // required: [true, "Batch code is required"], // Made optional for backward compatibility or aggregation
      trim: true,
    },
    batchCodes: {
      type: [String],
      default: [],
    },
    isManual: { // NEW: Flag to indicate manual entry
      type: Boolean,
      default: false,
    },
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    colorName: {
      type: String,
      required: [true, "Color name is required"],
      trim: true,
    },
    colorCode: {
      type: String,
      trim: true,
    },
    weightKg: {
      type: Number,
      required: [true, "Weight is required"],
      min: [0, "Weight cannot be negative"],
    },
    bagsCount: {
      type: Number,
      required: [true, "Bags count is required"],
      min: [0, "Bags count cannot be negative"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    batches: [
      {
        batch: { type: String, required: true },
        weight: { type: Number, required: true },
        bags: { type: Number },
      }
    ],
  },
  {
    _id: true,
    timestamps: false,
  }
);

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["PAYMENT", "REFUND", "ADJUST"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    method: {
      type: String,
      enum: ["CASH", "CARD", "BANK", "BANK_TRANSFER", "CHECK", "OTHER", "ADVANCE"],
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashAccount",
    },
    at: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [200, "Note cannot exceed 200 characters"],
    },
  },
  {
    _id: true,
    timestamps: false,
  }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: [true, "Invoice number is required"],
      trim: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
    },
    clientMeta: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      carNo: {
        type: String,
        trim: true,
      },
      clientType: {
        type: String,
        enum: ["INDIVIDUAL", "COMPANY"],
        default: "INDIVIDUAL",
      },
    },
    driver: {
      type: String,
      trim: true,
    },
    driverName: {
      type: String,
      trim: true,
    },
    carNumber: {
      type: String,
      trim: true,
    },
    handedBy: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    items: [invoiceItemSchema],
    discountPercent: {
      type: Number,
      default: 0,
      min: [0, "Discount percent cannot be negative"],
      max: [100, "Discount percent cannot exceed 100"],
    },
    discountTotal: {
      type: Number,
      default: 0,
      min: [0, "Discount total cannot be negative"],
    },
    grossTotal: {
      type: Number,
      required: [true, "Gross total is required"],
      min: [0, "Gross total cannot be negative"],
    },
    netTotal: {
      type: Number,
      required: [true, "Net total is required"],
      min: [0, "Net total cannot be negative"],
    },
    currency: {
      type: String,
      enum: ["UZS", "USD", "RUB"],
      default: "UZS",
    },
    currencyRate: {
      type: Number,
      default: 1,
      min: [0, "Currency rate cannot be negative"],
    },
    paid: {
      type: Number,
      default: 0,
      min: [0, "Paid amount cannot be negative"],
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, "Balance cannot be negative"],
    },
    transactions: [transactionSchema],
    status: {
      type: String,
      enum: ["DRAFT", "CONFIRMED", "PAID", "PARTIAL", "CANCELLED"],
      default: "DRAFT",
    },
    printedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
invoiceSchema.index({ invoiceNo: 1 }, { unique: true });
invoiceSchema.index({ clientId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: 1 });
invoiceSchema.index({ deletedAt: 1 });
invoiceSchema.index({ "clientMeta.phone": 1 });

// Virtual for payment status
invoiceSchema.virtual("paymentStatus").get(function () {
  if (this.balance === 0) return "PAID";
  if (this.paid > 0) return "PARTIAL";
  return "UNPAID";
});

// Virtual for total items count
invoiceSchema.virtual("totalItems").get(function () {
  return this.items ? this.items.length : 0;
});

// Virtual for total weight
invoiceSchema.virtual("totalWeight").get(function () {
  return this.items ? this.items.reduce((sum, item) => sum + item.weightKg, 0) : 0;
});

// Virtual for total bags
invoiceSchema.virtual("totalBags").get(function () {
  return this.items ? this.items.reduce((sum, item) => sum + item.bagsCount, 0) : 0;
});

// Instance method to calculate totals
invoiceSchema.methods.calculateTotals = function () {
  this.grossTotal = this.items.reduce((sum, item) => {
    const itemTotal = item.weightKg * item.price;
    const itemDiscount = item.discount || 0;
    return sum + itemTotal - itemDiscount;
  }, 0);

  this.netTotal = this.grossTotal - this.discountTotal;
  this.balance = this.netTotal - this.paid;

  // Update status based on payment
  if (this.balance === 0) {
    this.status = "PAID";
  } else if (this.paid > 0) {
    this.status = "PARTIAL";
  } else {
    this.status = "CONFIRMED";
  }

  return this;
};

// Instance method to add payment
invoiceSchema.methods.addPayment = function (amount, method, note = "") {
  if (amount <= 0) {
    throw new Error("Payment amount must be positive");
  }

  if (amount > this.balance) {
    throw new Error("Payment amount cannot exceed balance");
  }

  this.transactions.push({
    type: "PAYMENT",
    amount,
    method,
    note,
  });

  this.paid += amount;
  this.balance = this.netTotal - this.paid;

  if (this.balance === 0) {
    this.status = "PAID";
  } else {
    this.status = "PARTIAL";
  }

  return this.save();
};

// Instance method to add refund
invoiceSchema.methods.addRefund = function (amount, method, note = "") {
  if (amount <= 0) {
    throw new Error("Refund amount must be positive");
  }

  if (amount > this.paid) {
    throw new Error("Refund amount cannot exceed paid amount");
  }

  this.transactions.push({
    type: "REFUND",
    amount,
    method,
    note,
  });

  this.paid -= amount;
  this.balance = this.netTotal - this.paid;

  if (this.balance === 0) {
    this.status = "PAID";
  } else if (this.paid > 0) {
    this.status = "PARTIAL";
  } else {
    this.status = "CONFIRMED";
  }

  return this.save();
};

// Instance method to mark as printed
invoiceSchema.methods.markAsPrinted = function () {
  this.printedAt = new Date();
  return this.save();
};

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNo = async function () {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const prefix = `INV-${year}${month}${day}`;

  const lastInvoice = await this.findOne({
    invoiceNo: { $regex: `^${prefix}` },
  }).sort({ invoiceNo: -1 });

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNo.split("-")[2]);
    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, "0")}`;
};

// Static method to find by status
invoiceSchema.statics.findByStatus = function (status) {
  return this.find({ status, deletedAt: null }).sort({ createdAt: -1 });
};

// Static method to find unpaid invoices
invoiceSchema.statics.findUnpaid = function () {
  return this.find({ balance: { $gt: 0 }, deletedAt: null }).sort({
    createdAt: -1,
  });
};

// Query middleware to exclude soft-deleted invoices
invoiceSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// Pre-save middleware to ensure consistency
invoiceSchema.pre("save", function (next) {
  if (this.paid < 0) this.paid = 0;
  if (this.balance < 0) this.balance = 0;
  if (this.discountTotal < 0) this.discountTotal = 0;
  next();
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
