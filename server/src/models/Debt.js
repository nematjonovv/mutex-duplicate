import mongoose from "mongoose";

const debtSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
    },
    invoiceNo: {
      type: String,
      trim: true,
    },
    reasonType: {
      type: String,
      required: [true, "Reason type is required"],
      trim: true,
      maxlength: [100, "Reason type cannot exceed 100 characters"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["CASH", "CARD", "BANK_TRANSFER", "CHECK", "OTHER"],
      default: "CASH",
    },
    occurredAt: {
      type: Date,
      required: [true, "Occurrence date is required"],
      default: Date.now,
    },
    currentDebt: {
      type: Number,
      required: [true, "Current debt is required"],
      min: [0, "Current debt cannot be negative"],
    },
    totalDebt: {
      type: Number,
      required: [true, "Total debt is required"],
      min: [0, "Total debt cannot be negative"],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note cannot exceed 500 characters"],
    },
    payments: [
      {
        amount: { type: Number, required: true },
        method: {
          type: String,
          enum: ["CASH", "CARD", "BANK_TRANSFER", "CHECK", "OTHER", "ADVANCE"],
          default: "CASH",
        },
        date: { type: Date, default: Date.now },
        note: { type: String, trim: true, maxlength: 500 },
        rate: { type: Number },
        currency: { type: String },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        accountId: { type: mongoose.Schema.Types.ObjectId, ref: "CashAccount" },
        isEdited: { type: Boolean, default: false }
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
debtSchema.index({ clientId: 1 });
debtSchema.index({ invoiceNo: 1 });
debtSchema.index({ occurredAt: 1 });
debtSchema.index({ paymentMethod: 1 });
debtSchema.index({ deletedAt: 1 });
debtSchema.index({ createdAt: 1 });

// Virtual for debt status
debtSchema.virtual("debtStatus").get(function () {
  if (this.currentDebt === 0) return "PAID";
  if (this.currentDebt < this.amount) return "PARTIAL";
  return "UNPAID";
});

// Virtual for days since occurrence
debtSchema.virtual("daysSinceOccurrence").get(function () {
  const now = new Date();
  const diffTime = Math.abs(now - this.occurredAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static method to find debts by client
debtSchema.statics.findByClient = function (clientId) {
  return this.find({ clientId, deletedAt: null }).sort({ occurredAt: -1 });
};

// Static method to find unpaid debts
debtSchema.statics.findUnpaid = function () {
  return this.find({ currentDebt: { $gt: 0 }, deletedAt: null });
};

// Static method to find debts by date range
debtSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    occurredAt: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  }).sort({ occurredAt: -1 });
};

// Query middleware to exclude soft-deleted debts
debtSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// Pre-save middleware to ensure debt consistency
debtSchema.pre("save", function (next) {
  if (this.currentDebt < 0) {
    this.currentDebt = 0;
  }
  if (this.totalDebt < this.currentDebt) {
    this.totalDebt = this.currentDebt;
  }
  next();
});

const Debt = mongoose.model("Debt", debtSchema);

export default Debt;
