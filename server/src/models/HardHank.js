import mongoose from 'mongoose';

const hardHankSchema = new mongoose.Schema(
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
    weight: {
      type: Number,
      required: true,
    },
    dyehouseProcessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DyehouseProcess',
    },
    batch: {
      type: String,
      required: true,
    },
    batchNumber: {
      type: String,
      unique: false,
    },
    softHankBatch: {
      type: String,
    },
    dyehouseBatch: {
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

const HardHank = mongoose.model('HardHank', hardHankSchema);

export default HardHank;
