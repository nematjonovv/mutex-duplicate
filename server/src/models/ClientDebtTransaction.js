import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
    },

    // DEBT   → mijoz qarz oldi (faktura, manual)
    // PAYMENT → mijoz to'ladi
    // ADVANCE → qarz yo'q edi, to'lov avans bo'ldi
    type: {
      type: String,
      enum: ["DEBT", "PAYMENT", "ADVANCE"],
      required: [true, "Type is required"],
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    // bu tranzaksiyadan KEYIN client.balance qanday bo'ldi
    // minus = qarz, plus = avans
    balanceAfter: {
      type: Number,
      required: [true, "Balance after is required"],
    },

    // fakturaga bog'liq bo'lsa
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    invoiceNo: {
      type: String,
      trim: true,
    },

    // to'lov bo'lsa — qaysi kassaga tushdi
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashAccount",
    },

    // valyuta
    currency: {
      type: String,
      enum: ["USD", "UZS"],
      default: "USD",
    },
    rate: {
      type: Number,
      default: 1,
    },
    // asl summa (UZS bo'lsa originalAmount so'mda, amount USD da)
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

    // tahrirlandi (admin tuzatish uchun)
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

// clientId + createdAt bo'yicha tez qidirish uchun
transactionSchema.index({ clientId: 1, createdAt: -1 });
transactionSchema.index({ invoiceId: 1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
