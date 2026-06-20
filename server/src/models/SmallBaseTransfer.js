import mongoose from 'mongoose';

const smallBaseTransferSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterialIntake',
      required: true,
    },
    weightKg: {
      type: Number,
      required: true,
    },
    bagsCount: {
      type: Number,
      required: false,
      default: 0,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    transferredBy: {
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

const SmallBaseTransfer = mongoose.model('SmallBaseTransfer', smallBaseTransferSchema);

export default SmallBaseTransfer;
