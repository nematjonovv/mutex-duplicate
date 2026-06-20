import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema(
  {
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
      required: false, // Optional for manual returns
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
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    condition: {
      type: String,
      enum: ['GOOD', 'DEFECTIVE'],
      required: true,
    },
  },
  { _id: true, timestamps: false }
);

const returnSchema = new mongoose.Schema(
  {
    returnNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: false, // Optional for manual returns
    },
    invoiceNo: {
      type: String,
      required: false, // Optional for manual returns
      trim: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: false, // Optional for manual returns
    },
    clientName: {
      type: String,
      required: false, // Optional for manual returns
      trim: true,
    },
    isManual: {
      type: Boolean,
      default: false,
    },
    manualClientName: {
      type: String,
      trim: true, // For manual returns - client name entered by user
    },
    items: [returnItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
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
// returnNo already has unique: true which creates an index
returnSchema.index({ invoiceNo: 1 });
returnSchema.index({ clientId: 1 });
returnSchema.index({ createdAt: -1 });
returnSchema.index({ deletedAt: 1 });

// Generate return number
returnSchema.statics.generateReturnNo = async function () {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  const prefix = `RET-${year}${month}${day}`;

  const lastReturn = await this.findOne({
    returnNo: { $regex: `^${prefix}` },
  }).sort({ returnNo: -1 });

  let sequence = 1;
  if (lastReturn) {
    const lastSequence = parseInt(lastReturn.returnNo.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

// Query middleware to exclude soft-deleted
returnSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

const Return = mongoose.model('Return', returnSchema);

export default Return;
