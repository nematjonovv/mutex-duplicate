import mongoose from "mongoose";

const currencyRateSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      enum: ["USD", "RUB"],
      required: true,
    },
    rate: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
currencyRateSchema.index({ currency: 1, date: -1 });

export default mongoose.model("CurrencyRate", currencyRateSchema);
