import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    threadType: {
      type: String,
      required: [true, "Ip turi talab qilinadi"],
      trim: true,
    },
    threadNumber: {
      type: String,
      required: [true, "Ip raqami talab qilinadi"],
      trim: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false,
    },
    clientName: {
      type: String,
      trim: true,
    },
    colorName: {
      type: String,
      required: [true, "Rang nomi talab qilinadi"],
      trim: true,
    },
    colorCode: {
      type: String,
      required: [true, "Rang kodi talab qilinadi"],
      trim: true,
    },
    weightKg: {
      type: Number,
      required: [true, "Og'irlik talab qilinadi"],
      min: [0, "Og'irlik manfiy bo'lishi mumkin emas"],
    },
    conesCount: {
      type: Number,
      min: [0, "Bobina soni manfiy bo'lishi mumkin emas"],
    },
    status: {
      type: String,
      enum: [
        "CREATED",
        "PROCESSING",
        "WRAPPING",
        "WRAPPED",
        "COMPLETED",
        "SHIPPED",
        "RETURNED",
      ],
      default: "CREATED",
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterialIntake",
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Izoh 500 belgidan oshmasligi kerak"],
    },
    packages: [
      {
        id: { type: String, required: true },
        lotNumber: { type: String, required: true },
        conesCount: { type: Number, required: true },
        bruttoKg: { type: Number, required: true },
        taraKg: { type: Number, required: true },
        nettoKg: { type: Number, required: true },
        packageNumber: { type: Number },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    wrappingStartedAt: {
      type: Date,
      default: null,
    },
    sentToBaseAt: {
      type: Date,
      default: null,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
// batchNumber already has unique: true which creates an index
batchSchema.index({ threadType: 1 });
batchSchema.index({ colorName: 1 });
batchSchema.index({ clientId: 1 });
batchSchema.index({ status: 1 });
batchSchema.index({ createdAt: -1 });

// Static method to generate next batch number
batchSchema.statics.generateBatchNumber = async function () {
  const currentYear = new Date().getFullYear().toString().slice(-2); // e.g., "26" for 2026

  // Find the latest batch for this year (including deleted batches to avoid duplicate numbers)
  // Use aggregation to bypass the pre-find middleware that filters deleted records
  const result = await this.aggregate([
    {
      $match: {
        batchNumber: { $regex: `^${currentYear}-` },
      },
    },
    {
      $sort: { batchNumber: -1 },
    },
    {
      $limit: 1,
    },
  ]);

  let nextNumber = 1;
  if (result.length > 0) {
    const parts = result[0].batchNumber.split("-");
    if (parts.length === 2) {
      nextNumber = parseInt(parts[1], 10) + 1;
    }
  }

  // Format: YY-XXX (e.g., 26-001, 26-002, etc.)
  return `${currentYear}-${nextNumber.toString().padStart(3, "0")}`;
};

// Query middleware to exclude soft-deleted records
batchSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

const Batch = mongoose.model("Batch", batchSchema);

export default Batch;
