import mongoose from 'mongoose';

const softHankSchema = new mongoose.Schema(
  {
    dyehouseName: {
      type: String,
      required: true,
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterialIntake',
      required: false, // For safety with existing records
    },
    rawMaterialName: {
      type: String,
      required: true,
    },
    weight: {
      type: Number,
      required: true,
    },
    batchNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    comment: {
      type: String,
    },
    date: {
      type: Date,
      required: true,
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

const SoftHank = mongoose.model('SoftHank', softHankSchema);

export default SoftHank;
