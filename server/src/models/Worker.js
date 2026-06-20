import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
    },
    position: {
      type: String,
      default: "Ishchi",
    },
    salary: {
      type: Number,
      required: true,
    },
    workingSince: {
      type: Date,
      required: true,
    },
    lastSalaryReceived: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
workerSchema.index({ role: 1 });
workerSchema.index({ isActive: 1 });
workerSchema.index({ deletedAt: 1 });
workerSchema.index({ lastActiveAt: 1 });

// Instance method to check if worker has permission
workerSchema.methods.hasPermission = function (permission) {
  return this.permissions.includes(permission);
};

// Instance method to update last active
workerSchema.methods.updateLastActive = function () {
  this.lastActiveAt = new Date();
  return this.save();
};

// Instance method to update salary
workerSchema.methods.updateSalary = function (newSalary) {
  this.currentSalary = newSalary;
  return this.save();
};

// Instance method to record payment
workerSchema.methods.recordPayment = function (amount) {
  this.lastPaidDate = new Date();
  this.totalPaid += amount;
  return this.save();
};

// Static method to find active workers
workerSchema.statics.findActive = function () {
  return this.find({ isActive: true, deletedAt: null });
};

// Static method to find by role
workerSchema.statics.findByRole = function (role) {
  return this.find({ role, isActive: true, deletedAt: null });
};

// Static method to find by phone
workerSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone, deletedAt: null });
};

// Query middleware to exclude soft-deleted workers
workerSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

const Worker = mongoose.model("Worker", workerSchema);

export default Worker;
