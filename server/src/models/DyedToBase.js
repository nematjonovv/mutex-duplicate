import mongoose from "mongoose";

const dyedToBaseSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    colorName: {
      type: String,
      required: [true, "Color name is required"],
      trim: true,
      maxlength: [50, "Color name cannot exceed 50 characters"],
    },
    colorCode: {
      type: String,
      trim: true,
      maxlength: [20, "Color code cannot exceed 20 characters"],
    },
    weightKg: {
      type: Number,
      required: [true, "Weight is required"],
      min: [0, "Weight cannot be negative"],
    },
    weightDiffKg: {
      type: Number,
      default: 0,
      min: [0, "Weight difference cannot be negative"],
    },
    bagsCount: {
      type: Number,
      required: [true, "Bags count is required"],
      min: [1, "Bags count must be at least 1"],
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
    returnDate: {
      type: Date,
    },
    dyehouseName: {
      type: String,
      required: [true, "Dyehouse name is required"],
      trim: true,
      maxlength: [100, "Dyehouse name cannot exceed 100 characters"],
    },
    type: {
      type: String,
      enum: ["To'q", "Oq"],
      required: [true, "Type is required"],
    },
    batchCode: {
      type: String,
      required: [true, "Batch code is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["IN_BASE", "SOLD", "RETURNED"],
      default: "IN_BASE",
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
dyedToBaseSchema.index({ batchCode: 1 });
dyedToBaseSchema.index({ productName: 1 });
dyedToBaseSchema.index({ colorName: 1 });
dyedToBaseSchema.index({ type: 1 });
dyedToBaseSchema.index({ status: 1 });
dyedToBaseSchema.index({ date: 1 });
dyedToBaseSchema.index({ deletedAt: 1 });
dyedToBaseSchema.index({ createdAt: 1 });

// Virtual for average weight per bag
dyedToBaseSchema.virtual("avgWeightPerBag").get(function () {
  return this.bagsCount > 0 ? this.weightKg / this.bagsCount : 0;
});

// Virtual for days in base
dyedToBaseSchema.virtual("daysInBase").get(function () {
  const now = new Date();
  const startDate = this.returnDate || this.date;
  const diffTime = Math.abs(now - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static method to find by batch code
dyedToBaseSchema.statics.findByBatchCode = function (batchCode) {
  return this.find({ batchCode, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by product
dyedToBaseSchema.statics.findByProduct = function (productName) {
  return this.find({ productName, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by color
dyedToBaseSchema.statics.findByColor = function (colorName) {
  return this.find({ colorName, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by type
dyedToBaseSchema.statics.findByType = function (type) {
  return this.find({ type, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by status
dyedToBaseSchema.statics.findByStatus = function (status) {
  return this.find({ status, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by date range
dyedToBaseSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  }).sort({ date: -1 });
};

// Static method to get inventory summary
dyedToBaseSchema.statics.getInventorySummary = function () {
  return this.aggregate([
    {
      $match: { deletedAt: null },
    },
    {
      $group: {
        _id: {
          productName: "$productName",
          colorName: "$colorName",
          type: "$type",
        },
        totalWeight: { $sum: "$weightKg" },
        totalBags: { $sum: "$bagsCount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.productName": 1, "_id.colorName": 1 },
    },
  ]);
};

// Instance method to update status
dyedToBaseSchema.methods.updateStatus = function (status) {
  this.status = status;
  if (status === "SOLD") {
    this.returnDate = new Date();
  }
  return this.save();
};

// Instance method to mark as returned
dyedToBaseSchema.methods.markAsReturned = function () {
  this.returnDate = new Date();
  this.status = "RETURNED";
  return this.save();
};

// Query middleware to exclude soft-deleted records
dyedToBaseSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

const DyedToBase = mongoose.model("DyedToBase", dyedToBaseSchema);

export default DyedToBase;
