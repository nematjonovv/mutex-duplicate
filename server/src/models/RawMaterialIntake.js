import mongoose from "mongoose";

// Sub-schema for individual intake records
const intakeRecordSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    weightKg: {
      type: Number,
      required: true,
      min: [0, "Weight cannot be negative"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: true, timestamps: true }
);

const rawMaterialIntakeSchema = new mongoose.Schema(
  {
    // Legacy field - kept for backward compatibility
    name: {
      type: String,
      trim: true,
      maxlength: [100, "Material name cannot exceed 100 characters"],
    },
    threadType: {
      type: String,
      required: [true, "Ip turi talab qilinadi"],
      trim: true,
      maxlength: [100, "Ip turi 100 belgidan oshmasligi kerak"],
    },
    threadNumber: {
      type: String,
      required: [true, "Ip raqami talab qilinadi"],
      trim: true,
      maxlength: [50, "Ip raqami 50 belgidan oshmasligi kerak"],
    },
    supplier: {
      type: String,
      required: [true, "Yetkazib beruvchi talab qilinadi"],
      trim: true,
      maxlength: [100, "Yetkazib beruvchi nomi 100 belgidan oshmasligi kerak"],
    },
    totalWeightKg: {
      type: Number,
      required: [true, "Total weight is required"],
      min: [0, "Weight cannot be negative"],
    },
    totalBags: {
      type: Number,
      required: false,
      default: 0,
    },
    // Array to track individual intake records
    intakes: {
      type: [intakeRecordSchema],
      default: [],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
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
rawMaterialIntakeSchema.index({ threadType: 1 });
rawMaterialIntakeSchema.index({ threadNumber: 1 });
rawMaterialIntakeSchema.index({ supplier: 1 });
rawMaterialIntakeSchema.index({ date: 1 });
rawMaterialIntakeSchema.index({ deletedAt: 1 });
rawMaterialIntakeSchema.index({ createdAt: 1 });

// Virtual for full name (Ip turi + Ip raqami)
rawMaterialIntakeSchema.virtual("fullName").get(function () {
  return `${this.threadType} - ${this.threadNumber}`;
});

// Virtual for average weight per bag (deprecated - kept for backward compatibility)
rawMaterialIntakeSchema.virtual("avgWeightPerBag").get(function () {
  return (this.totalBags && this.totalBags > 0) ? this.totalWeightKg / this.totalBags : 0;
});

// Static method to find by date range
rawMaterialIntakeSchema.statics.findByDateRange = function (
  startDate,
  endDate
) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  }).sort({ date: -1 });
};

// Static method to find by supplier
rawMaterialIntakeSchema.statics.findBySupplier = function (supplier) {
  return this.find({ supplier, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by material name
rawMaterialIntakeSchema.statics.findByMaterial = function (name) {
  return this.find({ name, deletedAt: null }).sort({ date: -1 });
};

// Static method to get total intake by date range
rawMaterialIntakeSchema.statics.getTotalIntake = function (startDate, endDate) {
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
        totalWeight: { $sum: "$totalWeightKg" },
        totalBags: { $sum: "$totalBags" },
        count: { $sum: 1 },
      },
    },
  ]);
};

// Query middleware to exclude soft-deleted records
rawMaterialIntakeSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

const RawMaterialIntake = mongoose.model(
  "RawMaterialIntake",
  rawMaterialIntakeSchema
);

export default RawMaterialIntake;
