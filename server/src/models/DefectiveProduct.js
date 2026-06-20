import mongoose from 'mongoose';

const defectiveProductSchema = new mongoose.Schema(
  {
    returnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Return',
      required: true,
    },
    returnNo: {
      type: String,
      required: true,
      trim: true,
    },
    batchCode: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    colorName: {
      type: String,
      required: true,
      trim: true,
    },
    colorCode: {
      type: String,
      trim: true,
    },
    weightKg: {
      type: Number,
      required: true,
      min: 0,
    },
    bagsCount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
defectiveProductSchema.index({ returnNo: 1 });
defectiveProductSchema.index({ batchCode: 1 });
defectiveProductSchema.index({ productName: 1 });
defectiveProductSchema.index({ createdAt: -1 });
defectiveProductSchema.index({ deletedAt: 1 });

// Query middleware to exclude soft-deleted
defectiveProductSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

const DefectiveProduct = mongoose.model('DefectiveProduct', defectiveProductSchema);

export default DefectiveProduct;
