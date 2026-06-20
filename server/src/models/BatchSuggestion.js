import mongoose from "mongoose";

const batchSuggestionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["COLOR_NAME", "COLOR_CODE"],
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    usageCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index
batchSuggestionSchema.index({ type: 1, value: 1 }, { unique: true });

// Static method to add or update suggestion
batchSuggestionSchema.statics.addSuggestion = async function (type, value) {
  if (!value || !value.trim()) return;

  const trimmedValue = value.trim();

  await this.findOneAndUpdate(
    { type, value: trimmedValue },
    {
      $inc: { usageCount: 1 },
      $setOnInsert: { type, value: trimmedValue }
    },
    { upsert: true, new: true }
  );
};

// Static method to get suggestions
batchSuggestionSchema.statics.getSuggestions = async function (type, search = "") {
  const query = { type };

  if (search) {
    query.value = { $regex: search, $options: "i" };
  }

  return this.find(query)
    .sort({ usageCount: -1 })
    .limit(20)
    .select("value -_id");
};

const BatchSuggestion = mongoose.model("BatchSuggestion", batchSuggestionSchema);

export default BatchSuggestion;
