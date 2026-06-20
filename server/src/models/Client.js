import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
      maxlength: [200, "Client name cannot exceed 200 characters"],
    },
    phone: {
      type: String,
      trim: true,
    },
    tin: {
      type: String,
      trim: true,
      maxlength: [20, "TIN cannot exceed 20 characters"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    initialDebt: {
      type: Number,
      default: 0,
      min: [0, "Initial debt cannot be negative"],
    },
    currentDebt: {
      type: Number,
      default: 0,
      min: [0, "Current debt cannot be negative"],
    },
    totalDebt: {
      type: Number,
      default: 0,
      min: [0, "Total debt cannot be negative"],
    },
    advanceBalance: {
      type: Number,
      default: 0,
      min: [0, "Advance balance cannot be negative"],
    },
    invoices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
      },
    ],
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
    balance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
clientSchema.index({ phone: 1 });
clientSchema.index({ name: 1 });
clientSchema.index({ tin: 1 });
clientSchema.index({ currentDebt: 1 });
clientSchema.index({ advanceBalance: 1 });
clientSchema.index({ deletedAt: 1 });
clientSchema.index({ createdAt: 1 });

// Virtual for debt status
clientSchema.virtual("debtStatus").get(function () {
  if (this.currentDebt === 0) return "CLEAR";
  if (this.currentDebt <= 1000000) return "LOW"; // 1M UZS
  if (this.currentDebt <= 5000000) return "MEDIUM"; // 5M UZS
  return "HIGH";
});

// Virtual for total invoices count
clientSchema.virtual("totalInvoices").get(function () {
  return this.invoices ? this.invoices.length : 0;
});

// Instance method to update debt
clientSchema.methods.updateDebt = function (
  amount,
  isPayment = false,
  session = null,
) {
  if (isPayment) {
    this.currentDebt = Math.max(0, this.currentDebt - amount);
  } else {
    this.currentDebt += amount;
  }
  this.totalDebt = Math.max(this.totalDebt, this.currentDebt);
  return this.save({ session });
};

// Instance method to add invoice
clientSchema.methods.addInvoice = function (invoiceId) {
  if (!this.invoices) {
    this.invoices = [];
  }
  if (!this.invoices.includes(invoiceId)) {
    this.invoices.push(invoiceId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove invoice
clientSchema.methods.removeInvoice = function (invoiceId) {
  if (!this.invoices) {
    this.invoices = [];
  }
  this.invoices = this.invoices.filter((id) => !id.equals(invoiceId));
  return this.save();
};

// Static method to find clients with debt
clientSchema.statics.findWithDebt = function (minDebt = 0) {
  return this.find({ currentDebt: { $gte: minDebt }, deletedAt: null });
};

// Static method to find by phone
clientSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone, deletedAt: null });
};

// Static method to find by TIN
clientSchema.statics.findByTIN = function (tin) {
  return this.findOne({ tin, deletedAt: null });
};

// Query middleware to exclude soft-deleted clients
clientSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// Pre-save middleware to ensure debt consistency
clientSchema.pre("save", function (next) {
  if (this.currentDebt < 0) {
    this.currentDebt = 0;
  }
  if (this.totalDebt < this.currentDebt) {
    this.totalDebt = this.currentDebt;
  }
  if (this.advanceBalance < 0) {
    this.advanceBalance = 0;
  }
  next();
});

const Client = mongoose.model("Client", clientSchema);

export default Client;
