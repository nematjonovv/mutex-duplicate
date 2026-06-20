import mongoose from "mongoose";

const threadSuggestionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["THREAD_TYPE", "THREAD_NUMBER"],
      required: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Qiymat 100 belgidan oshmasligi kerak"],
    },
    usageCount: {
      type: Number,
      default: 1,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique type + value
threadSuggestionSchema.index({ type: 1, value: 1 }, { unique: true });
threadSuggestionSchema.index({ type: 1, usageCount: -1 });

// Static method to add or update suggestion
threadSuggestionSchema.statics.addSuggestion = async function (type, value) {
  if (!value || !value.trim()) return null;

  const suggestion = await this.findOneAndUpdate(
    { type, value: value.trim() },
    {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date() }
    },
    { upsert: true, new: true }
  );
  return suggestion;
};

// Static method to get suggestions by type
threadSuggestionSchema.statics.getSuggestions = function (type, search = "") {
  const query = { type };
  if (search) {
    query.value = { $regex: search, $options: "i" };
  }
  return this.find(query)
    .sort({ usageCount: -1, lastUsedAt: -1 })
    .limit(20);
};

const ThreadSuggestion = mongoose.model("ThreadSuggestion", threadSuggestionSchema);

export default ThreadSuggestion;
