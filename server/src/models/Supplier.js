import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    responsiblePerson: {
      type: String,
      required: [true, 'Responsible person is required'],
      trim: true,
      maxlength: [100, 'Responsible person name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    debt: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({ companyName: 1 });
supplierSchema.index({ responsiblePerson: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;
