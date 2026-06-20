import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: [true, "Worker is required"],
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashAccount",
      required: [true, "Account is required"],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note cannot exceed 500 characters"],
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "CARD", "BANK_TRANSFER", "CHECK", "OTHER"],
      required: [true, "Payment method is required"],
      default: "CASH",
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
payrollSchema.index({ workerId: 1 });
payrollSchema.index({ accountId: 1 });
payrollSchema.index({ date: 1 });
payrollSchema.index({ paymentMethod: 1 });
payrollSchema.index({ deletedAt: 1 });
payrollSchema.index({ createdAt: 1 });

// Static method to find by worker
payrollSchema.statics.findByWorker = function (workerId) {
  return this.find({ workerId, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by date range
payrollSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  }).sort({ date: -1 });
};

// Static method to find by account
payrollSchema.statics.findByAccount = function (accountId) {
  return this.find({ accountId, deletedAt: null }).sort({ date: -1 });
};

// Static method to get payroll summary
payrollSchema.statics.getPayrollSummary = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        deletedAt: null,
      },
    },
    {
      $lookup: {
        from: "workers",
        localField: "workerId",
        foreignField: "_id",
        as: "worker",
      },
    },
    {
      $unwind: "$worker",
    },
    {
      $group: {
        _id: {
          workerId: "$workerId",
          workerName: "$worker.fullName",
          workerRole: "$worker.role",
        },
        totalAmount: { $sum: "$amount" },
        paymentCount: { $sum: 1 },
      },
    },
    {
      $sort: { totalAmount: -1 },
    },
  ]);
};

// Static method to get total payroll by date range
payrollSchema.statics.getTotalPayroll = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" },
        paymentCount: { $sum: 1 },
      },
    },
  ]);
};

// Query middleware to exclude soft-deleted records
payrollSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

const Payroll = mongoose.model("Payroll", payrollSchema);

export default Payroll;
