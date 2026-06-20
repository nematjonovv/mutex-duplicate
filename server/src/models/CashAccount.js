import mongoose from "mongoose";

const cashAccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      maxlength: [100, "Account name cannot exceed 100 characters"],
    },
    type: {
      type: String,
      enum: ["CASH", "BANK", "CARD", "OTHER"],
      required: [true, "Account type is required"],
      default: "CASH",
    },
    currency: {
      type: String,
      enum: ["USD", "UZS"],
      default: "USD",
    },
    currentBalance: {
      type: Number,
      default: 0,
      min: [0, "Balance cannot be negative"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
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
cashAccountSchema.index({ name: 1 }, { unique: true });
cashAccountSchema.index({ type: 1 });
cashAccountSchema.index({ currency: 1 });
cashAccountSchema.index({ isActive: 1 });
cashAccountSchema.index({ deletedAt: 1 });
cashAccountSchema.index({ createdAt: 1 });

// Instance method to update balance
cashAccountSchema.methods.updateBalance = function (amount, isCredit = true) {
  if (isCredit) {
    this.currentBalance += amount;
  } else {
    if (this.currentBalance < amount) {
      throw new Error("Insufficient balance");
    }
    this.currentBalance -= amount;
  }
  return this.save();
};

// Instance method to check if account has sufficient balance
cashAccountSchema.methods.hasSufficientBalance = function (amount) {
  return this.currentBalance >= amount;
};

// Static method to find active accounts
cashAccountSchema.statics.findActive = function () {
  return this.find({ isActive: true, deletedAt: null });
};

// Static method to find by type
cashAccountSchema.statics.findByType = function (type) {
  return this.find({ type, isActive: true, deletedAt: null });
};

// Static method to get total balance grouped by currency
cashAccountSchema.statics.getTotalBalance = function () {
  return this.aggregate([
    {
      $match: { isActive: true, deletedAt: null },
    },
    {
      $group: {
        _id: "$currency",
        totalBalance: { $sum: "$currentBalance" },
        accountCount: { $sum: 1 },
      },
    },
  ]);
};

// Query middleware to exclude soft-deleted accounts
cashAccountSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// Pre-save middleware to ensure balance consistency
cashAccountSchema.pre("save", function (next) {
  if (this.currentBalance < 0) {
    this.currentBalance = 0;
  }
  next();
});

const CashAccount = mongoose.model("CashAccount", cashAccountSchema);

export default CashAccount;
