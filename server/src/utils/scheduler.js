import cron from "node-cron";
import FinishedProduct from "../models/FinishedProduct.js";
import { logger } from "../config/logger.js";

const cleanupSoldProducts = async () => {
  try {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const result = await FinishedProduct.updateMany(
      {
        status: 'SOLD',
        soldAt: { $lt: twoMonthsAgo },
        deletedAt: null
      },
      {
        $set: { deletedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Cleanup: Deleted ${result.modifiedCount} inactive sold products.`);
    }
  } catch (error) {
    logger.error("Cleanup scheduler error:", error);
  }
};

export const startScheduler = () => {
  // Run every day at 00:00
  cron.schedule("0 0 * * *", cleanupSoldProducts);
  
  // Run immediately on start to catch up
  cleanupSoldProducts();
};
