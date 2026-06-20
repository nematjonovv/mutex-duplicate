import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"],
    },
    position: {
      type: String,
      required: [true, "Position is required"],
      trim: true,
      maxlength: [50, "Position cannot exceed 50 characters"],
    },
    role: {
      type: String,
      enum: ["MANAGER", "SELLER", "ACCOUNTANT", "WRAPPER"],
      required: [true, "Role is required"],
      default: "WORKER",
    },
    lastWrappedBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },
    permissions: [
      {
        type: String,
        trim: true,
      },
    ],
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshTokenHash: {
      type: String,
      default: null,
    },
    refreshTokenExpiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
  },
);

// Indexes
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ deletedAt: 1 });
userSchema.index({ lastActiveAt: 1 });

// Virtual for password (not stored in DB)
userSchema
  .virtual("password")
  .set(function (password) {
    this._password = password;
  })
  .get(function () {
    return this._password;
  });

// Pre-save middleware to hash password (for password updates)
userSchema.pre("save", async function (next) {
  try {
    // Only hash password if _password is set (for password updates)
    if (this._password) {
      const saltRounds = 12;
      this.passwordHash = await bcrypt.hash(this._password, saltRounds);
      this._password = undefined;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Instance method to check if user has permission
userSchema.methods.hasPermission = function (permission) {
  if (this.role === "DIRECTOR") return true;
  return this.permissions.includes(permission);
};

// Instance method to check if user has any of the permissions
userSchema.methods.hasAnyPermission = function (permissions) {
  if (this.role === "DIRECTOR") return true;
  return permissions.some((permission) =>
    this.permissions.includes(permission),
  );
};

// Static method to find active users
userSchema.statics.findActive = function () {
  return this.find({ isActive: true, deletedAt: null });
};

// Static method to find by role
userSchema.statics.findByRole = function (role) {
  return this.find({ role, isActive: true, deletedAt: null });
};

// Query middleware to exclude soft-deleted users
userSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// Update lastActiveAt on login
userSchema.methods.updateLastActive = function () {
  this.lastActiveAt = new Date();
  return this.save();
};

const User = mongoose.model("User", userSchema);

export default User;
