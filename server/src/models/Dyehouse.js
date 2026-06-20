import mongoose from "mongoose";

const dyehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Dyehouse name is required"],
      trim: true,
      maxlength: [100, "Dyehouse name cannot exceed 100 characters"],
    },
    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
      maxlength: [100, "Owner name cannot exceed 100 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
dyehouseSchema.index({ name: 1 });
dyehouseSchema.index({ phone: 1 });
dyehouseSchema.index({ isActive: 1 });
dyehouseSchema.index({ deletedAt: 1 });
dyehouseSchema.index({ createdAt: 1 });

// Static method to find active dyehouses
dyehouseSchema.statics.findActive = function () {
  return this.find({ isActive: true, deletedAt: null });
};

// Static method to find by phone
dyehouseSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone, deletedAt: null });
};

// Query middleware to exclude soft-deleted dyehouses
dyehouseSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

const Dyehouse = mongoose.model("Dyehouse", dyehouseSchema);

export default Dyehouse;
