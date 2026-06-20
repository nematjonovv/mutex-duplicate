import mongoose from "mongoose";

const sendToDyehouseSchema = new mongoose.Schema(
  {
    dyehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dyehouse",
      required: [true, "Dyehouse is required"],
    },
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Product name cannot exceed 100 characters"],
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
      enum: ["SENT", "IN_PROCESS", "COMPLETED", "RETURNED"],
      default: "SENT",
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
sendToDyehouseSchema.index({ dyehouseId: 1 });
sendToDyehouseSchema.index({ batchCode: 1 }, { unique: true });
sendToDyehouseSchema.index({ date: 1 });
sendToDyehouseSchema.index({ status: 1 });
sendToDyehouseSchema.index({ deletedAt: 1 });
sendToDyehouseSchema.index({ createdAt: 1 });

// Static method to generate batch code
sendToDyehouseSchema.statics.generateBatchCode = async function () {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const prefix = `PART-${year}${month}${day}`;

  const lastBatch = await this.findOne({
    batchCode: { $regex: `^${prefix}` },
  }).sort({ batchCode: -1 });

  let sequence = 1;
  if (lastBatch) {
    const lastSequence = parseInt(lastBatch.batchCode.split("-")[2]);
    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, "0")}`;
};

// Static method to find by dyehouse
sendToDyehouseSchema.statics.findByDyehouse = function (dyehouseId) {
  return this.find({ dyehouseId, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by status
sendToDyehouseSchema.statics.findByStatus = function (status) {
  return this.find({ status, deletedAt: null }).sort({ date: -1 });
};

// Static method to find by date range
sendToDyehouseSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  }).sort({ date: -1 });
};

// Static method to find by batch code
sendToDyehouseSchema.statics.findByBatchCode = function (batchCode) {
  return this.findOne({ batchCode, deletedAt: null });
};

// Instance method to update status
sendToDyehouseSchema.methods.updateStatus = function (status) {
  this.status = status;
  return this.save();
};

// Query middleware to exclude soft-deleted records
sendToDyehouseSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

const SendToDyehouse = mongoose.model("SendToDyehouse", sendToDyehouseSchema);

export default SendToDyehouse;
