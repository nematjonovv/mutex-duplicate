import mongoose from "mongoose";

const dyeingLotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Lot name is required"],
      trim: true,
      maxlength: [100, "Lot name cannot exceed 100 characters"],
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
    batchCode: {
      type: String,
      required: [true, "Batch code is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["IN_PROCESS", "COMPLETED", "QUALITY_CHECK", "READY"],
      default: "IN_PROCESS",
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
dyeingLotSchema.index({ batchCode: 1 });
dyeingLotSchema.index({ colorName: 1 });
dyeingLotSchema.index({ date: 1 });
dyeingLotSchema.index({ status: 1 });
dyeingLotSchema.index({ deletedAt: 1 });
dyeingLotSchema.index({ createdAt: 1 });

// Static method to find by batch code
dyeingLotSchema.statics.findByBatchCode = function (batchCode) {
  return this.find({ batchCode, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by color
dyeingLotSchema.statics.findByColor = function (colorName) {
  return this.find({ colorName, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by status
dyeingLotSchema.statics.findByStatus = function (status) {
  return this.find({ status, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by date range
dyeingLotSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  }).sort({ date: -1 });
};

// Instance method to update status
dyeingLotSchema.methods.updateStatus = function (status) {
  this.status = status;
  return this.save();
};

// Query middleware to exclude soft-deleted records
dyeingLotSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

const DyeingLot = mongoose.model("DyeingLot", dyeingLotSchema);

export default DyeingLot;
