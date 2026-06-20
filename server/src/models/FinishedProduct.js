import mongoose from 'mongoose';

const finishedProductSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    colorCode: {
      type: String,
      required: true,
    },
    weightKg: {
      type: Number,
      required: true,
    },
    brutto: {
      type: Number,
    },
    tara: {
      type: Number,
    },
    weightDifference: {
      type: Number,
    },
    wrappingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wrapping',
    },
    bagsCount: {
      type: Number,
      required: true,
    },
    bagsParties: {
      type: [String],
    },
    softHankDate: {
      type: Date,
    },
    dyehouseDate: {
      type: Date,
    },
    hardHankDate: {
      type: Date,
    },
    finishedDate: {
      type: Date,
      default: Date.now,
    },
    comment: {
      type: String,
    },
    dyehouseName: {
      type: String,
    },
    type: {
      type: String,
      enum: ['to’q', 'och'],
    },
    batch: {
      type: String,
      required: true,
      unique: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isSentToBase: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SOLD'],
      default: 'ACTIVE',
    },
    soldAt: {
      type: Date,
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

// Indexes for optimization
finishedProductSchema.index({ productName: 1, color: 1, colorCode: 1, deletedAt: 1 });
finishedProductSchema.index({ createdAt: -1, deletedAt: 1 });
// batch field already has unique: true which creates an index
finishedProductSchema.index({ isSentToBase: 1 });
finishedProductSchema.index({ status: 1 });
finishedProductSchema.index({ bagsParties: 1 }); // For array search

const FinishedProduct = mongoose.model('FinishedProduct', finishedProductSchema);

export default FinishedProduct;
