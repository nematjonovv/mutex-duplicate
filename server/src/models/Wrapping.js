import mongoose from 'mongoose';

const wrappingSchema = new mongoose.Schema(
  {
    name: {
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
    batch: {
      type: String,
      required: true,
    },
    wrappingBatch: {
      type: String,
    },
    softHankBatch: {
      type: String,
    },
    dyehouseBatch: {
      type: String,
    },
    hardHankBatch: {
      type: String,
    },
    comment: {
      type: String,
    },
    softHankDate: {
      type: Date,
      required: true,
    },
    dyehouseDate: {
      type: Date,
      required: true,
    },
    hardHankDate: {
      type: Date,
      required: true,
    },
    hardHankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HardHank',
    },
    wrappingDate: {
      type: Date,
      default: Date.now,
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

const Wrapping = mongoose.model('Wrapping', wrappingSchema);

export default Wrapping;
