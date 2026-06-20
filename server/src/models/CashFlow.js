import mongoose from "mongoose";

const cashFlowSchema = new mongoose.Schema(
  {
    time: {
      type: Date,
      required: [true, "Time is required"],
      default: Date.now,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
    },
    direction: {
      type: String,
      enum: ["IN", "OUT"],
      required: [true, "Direction is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "CARD", "BANK_TRANSFER", "CHECK", "OTHER"],
      required: [true, "Payment method is required"],
      default: "CASH",
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note cannot exceed 500 characters"],
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashAccount",
      required: [true, "Account is required"],
    },
    relatedInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    relatedPayrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
    },
    relatedClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    relatedDebtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Debt",
    },
    relatedCreditorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Creditor",
    },
    relatedPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    relatedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
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
    isEdited: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
cashFlowSchema.index({ time: 1 });
cashFlowSchema.index({ category: 1 });
cashFlowSchema.index({ direction: 1 });
cashFlowSchema.index({ accountId: 1 });
cashFlowSchema.index({ paymentMethod: 1 });
cashFlowSchema.index({ deletedAt: 1 });
cashFlowSchema.index({ createdAt: 1 });

// Virtual for formatted amount
cashFlowSchema.virtual("formattedAmount").get(function () {
  return this.direction === "IN" ? this.amount : -this.amount;
});

// Static method to find by date range
cashFlowSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    time: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  }).sort({ time: -1 });
};

// Static method to find by category
cashFlowSchema.statics.findByCategory = function (category) {
  return this.find({ category, deletedAt: null }).sort({ time: -1 });
};

// Static method to find by direction
cashFlowSchema.statics.findByDirection = function (direction) {
  return this.find({ direction, deletedAt: null }).sort({ time: -1 });
};

// Static method to find by account
cashFlowSchema.statics.findByAccount = function (accountId) {
  return this.find({ accountId, deletedAt: null }).sort({ time: -1 });
};

// Static method to get cash flow summary
cashFlowSchema.statics.getCashFlowSummary = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        time: { $gte: startDate, $lte: endDate },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: {
          direction: "$direction",
          category: "$category",
        },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.direction": 1, "_id.category": 1 },
    },
  ]);
};

// Static method to get income vs expense summary
cashFlowSchema.statics.getIncomeExpenseSummary = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        time: { $gte: startDate, $lte: endDate },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: "$direction",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);
};

// Static method to get category breakdown
cashFlowSchema.statics.getCategoryBreakdown = function (
  startDate,
  endDate,
  direction,
) {
  return this.aggregate([
    {
      $match: {
        time: { $gte: startDate, $lte: endDate },
        direction,
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { totalAmount: -1 },
    },
  ]);
};

// Query middleware to exclude soft-deleted records
cashFlowSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

const CashFlow = mongoose.model("CashFlow", cashFlowSchema);

export default CashFlow;
