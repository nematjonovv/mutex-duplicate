import mongoose from "mongoose";
import CashAccount from "../models/CashAccount.js";
import { logger } from "../config/logger.js";
import dotenv from "dotenv";

dotenv.config();

const seedCashAccounts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI_TEST);
    logger.info("Connected to MongoDB");

    // Check if accounts already exist
    const existingAccounts = await CashAccount.countDocuments();
    if (existingAccounts > 0) {
      logger.info("Cash accounts already exist, skipping seed");
      return;
    }

    const accounts = [
      {
        name: "Main Cash Account",
        type: "CASH",
        currentBalance: 1000000,
        description: "Primary cash account for daily operations",
      },
      {
        name: "Bank Account - NBU",
        type: "BANK",
        currentBalance: 5000000,
        description: "National Bank of Uzbekistan account",
      },
      {
        name: "Bank Account - Ipak Yuli",
        type: "BANK",
        currentBalance: 3000000,
        description: "Ipak Yuli Bank account",
      },
      {
        name: "Petty Cash",
        type: "CASH",
        currentBalance: 500000,
        description: "Small cash for minor expenses",
      },
    ];

    for (const accountData of accounts) {
      const account = new CashAccount({
        ...accountData,
        createdBy: new mongoose.Types.ObjectId(), // Placeholder ID
      });
      await account.save();
      logger.info(`Created account: ${account.name}`);
    }

    logger.info("Cash accounts seeded successfully");
  } catch (error) {
    logger.error("Error seeding cash accounts:", error);
  } finally {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  }
};

// Run the seed function
seedCashAccounts();
