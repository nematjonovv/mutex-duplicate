import mongoose from "mongoose";

const creditorSchema = new mongoose.Schema(
  {
    // Qarz beruvchining nomi
    name: {
      type: String,
      required: [true, "Nomi kiritilishi shart"],
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Izoh 500 belgidan oshmasligi kerak"],
    },

    // ASOSIY MANTIQ (client.balance bilan bir xil):
    // manfiy (< 0)  → BIZNING qarzimiz bor (biz qarzdormiz)
    // musbat (> 0)  → BIZNING haqimiz bor (ortiqcha to'lab qo'yganmiz)
    // 0             → hisob-kitob teng
    balance: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

// Joriy qarz (faqat o'qish uchun, balance manfiy bo'lsa)
creditorSchema.virtual("currentDebt").get(function () {
  return this.balance < 0 ? Math.abs(this.balance) : 0;
});

// Joriy haq/avans (balance musbat bo'lsa)
creditorSchema.virtual("advanceBalance").get(function () {
  return this.balance > 0 ? this.balance : 0;
});

creditorSchema.index({ name: 1 });
creditorSchema.index({ deletedAt: 1 });

export const Creditor = mongoose.model("Creditor", creditorSchema);


const creditorTransactionSchema = new mongoose.Schema(
  {
    creditorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Creditor",
      required: [true, "Creditor is required"],
    },

    // DEBT    → BIZ qarz oldik   (balance kamayadi)
    // PAYMENT → BIZ qarzni to'ladik (balance oshadi)
    // ADVANCE → qarz yo'q edi, to'lov ortiqcha bo'ldi (bizning haqimiz)
    type: {
      type: String,
      enum: ["DEBT", "PAYMENT", "ADVANCE"],
      required: [true, "Type is required"],
    },

    // USD dagi summa
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    // Bu tranzaksiyadan KEYIN creditor.balance qanday bo'ldi
    // minus = bizning qarz, plus = bizning haq
    balanceAfter: {
      type: Number,
      required: [true, "Balance after is required"],
    },

    // To'lov bo'lsa — qaysi kassadan pul CHIQDI
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashAccount",
    },

    // Valyuta
    currency: {
      type: String,
      enum: ["USD", "UZS"],
      default: "USD",
    },
    rate: {
      type: Number,
      default: 1,
    },
    // Asl summa (UZS bo'lsa originalAmount so'mda, amount USD da)
    originalAmount: {
      type: Number,
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "CARD", "BANK_TRANSFER", "CHECK", "OTHER", "ADVANCE"],
    },

    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note cannot exceed 500 characters"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Tahrirlandi (admin tuzatish uchun)
    isEdited: {
      type: Boolean,
      default: false,
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

// creditorId + createdAt bo'yicha tez qidirish uchun
creditorTransactionSchema.index({ creditorId: 1, createdAt: -1 });

export const CreditorTransaction = mongoose.model(
  "CreditorTransaction",
  creditorTransactionSchema,
);
