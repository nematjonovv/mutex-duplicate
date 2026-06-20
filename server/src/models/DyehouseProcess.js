import mongoose from 'mongoose';

const dyehouseProcessSchema = new mongoose.Schema(
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
    softHankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SoftHank',
    },
    weight: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    comment: {
      type: String,
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
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const DyehouseProcess = mongoose.model('DyehouseProcess', dyehouseProcessSchema);

export default DyehouseProcess;
