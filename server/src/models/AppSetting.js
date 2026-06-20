import mongoose from "mongoose";
import bcrypt from "bcrypt";

const appSettingSchema = new mongoose.Schema(
  {
    salesPasswordHash: {
      type: String,
      default: null,
    },
    financePasswordHash: {
      type: String,
      default: null,
    },
    managementPasswordHash: {
      type: String,
      default: null,
    },
    passwordSetBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Method to compare passwords
appSettingSchema.methods.comparePassword = async function (
  section,
  candidatePassword
) {
  try {
    let hashToCompare;
    if (section === "sales") {
      hashToCompare = this.salesPasswordHash;
    } else if (section === "finance") {
      hashToCompare = this.financePasswordHash;
    } else if (section === "management") {
      hashToCompare = this.managementPasswordHash;
    }

    if (!hashToCompare) {
      return false; // No password set for this section
    }

    return await bcrypt.compare(candidatePassword, hashToCompare);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Static method to get the single AppSetting document
appSettingSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({}); // Create a default empty settings document if none exists
  }
  return settings;
};

const AppSetting = mongoose.model("AppSetting", appSettingSchema);

export default AppSetting;
