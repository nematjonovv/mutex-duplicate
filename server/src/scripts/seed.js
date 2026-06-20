import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "../models/User.js";
import Client from "../models/Client.js";
import Dyehouse from "../models/Dyehouse.js";
import CashAccount from "../models/CashAccount.js";
import { logger } from "../config/logger.js";

dotenv.config();
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/MUTex";
console.log("MongoDB URI:", mongoURI);

// Role permissions mapping
const rolePermissions = {
  DIRECTOR: [
    "*", // All permissions
  ],
  MANAGER: [
    "/users",
    "/users/*",
    "/clients",
    "/clients/*",
    "/dyehouses",
    "/dyehouses/*",
    "/workers",
    "/workers/*",
    "/materials",
    "/materials/*",
    "/dyeing",
    "/dyeing/*",
    "/inventory",
    "/inventory/*",
    "/batches",
    "/batches/*",
    "/invoices",
    "/invoices/*",
    "/reports",
    "/reports/*",
  ],
  SELLER: [
    "/clients",
    "/clients/view",
    "/invoices",
    "/invoices/*",
    "/batches",
    "/batches/scan",
    "/inventory",
    "/inventory/view",
  ],
  ACCOUNTANT: [
    "/clients",
    "/clients/view",
    "/debts",
    "/debts/*",
    "/accounts",
    "/accounts/*",
    "/cash-flow",
    "/cash-flow/*",
    "/payroll",
    "/payroll/*",
    "/reports",
    "/reports/*",
    "/invoices",
    "/invoices/view",
  ],
  WORKER: [
    "/materials",
    "/materials/view",
    "/dyeing",
    "/dyeing/view",
    "/inventory",
    "/inventory/view",
    "/batches",
    "/batches/view",
  ],
};

// Sample users data
const usersData = [

  {
    fullName: "Boshqaruvchi",
    phone: "+998901234568",
    position: "Boshqaruvchi",
    role: "MANAGER",
    password: "123456",
    isActive: true,
  },
];

// Sample clients data
const clientsData = [
  {
    name: "O'zbekiston To'qimachilik",
    phone: "+998901234572",
    tin: "123456789",
    address: "Toshkent shahri, Chilonzor tumani",
    notes: "Asosiy mijoz",
    currentDebt: 0,
    totalDebt: 0,
  },
  {
    name: "Samarqand Tekstil",
    phone: "+998901234573",
    tin: "987654321",
    address: "Samarqand viloyati, Samarqand shahri",
    notes: "Muntazam mijoz",
    currentDebt: 0,
    totalDebt: 0,
  },
  {
    name: "Farg'ona Bo'yoqxona",
    phone: "+998901234574",
    address: "Farg'ona viloyati, Farg'ona shahri",
    notes: "Bo'yoqxona mijoz",
    currentDebt: 0,
    totalDebt: 0,
  },
];

// Sample dyehouses data
const dyehousesData = [
  {
    name: "Toshkent Bo'yoqxona",
    ownerName: "Aziz Karimov",
    phone: "+998901234575",
    address: "Toshkent shahri, Sergeli tumani",
    notes: "Asosiy bo'yoqxona",
    isActive: true,
  },
  {
    name: "Samarqand Bo'yoqxona",
    ownerName: "Jamshid Rahimov",
    phone: "+998901234576",
    address: "Samarqand viloyati, Samarqand shahri",
    notes: "Samarqand bo'yoqxona",
    isActive: true,
  },
];

// Sample cash accounts data
const cashAccountsData = [
  {
    name: "Asosiy Kassa",
    type: "CASH",
    currentBalance: 10000000, // 10M UZS
    description: "Asosiy kassa hisobi",
  },
  {
    name: "Bank Hisobi",
    type: "BANK",
    currentBalance: 50000000, // 50M UZS
    description: "Asosiy bank hisobi",
  },
  {
    name: "Plastik Karta",
    type: "CARD",
    currentBalance: 20000000, // 20M UZS
    description: "Plastik karta hisobi",
  },
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    logger.info("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Client.deleteMany({});
    await Dyehouse.deleteMany({});
    await CashAccount.deleteMany({});
    logger.info("Cleared existing data");

    // Create users
    const createdUsers = [];
    for (const userData of usersData) {
      const permissions = rolePermissions[userData.role] || [];

      const user = new User({
        ...userData,
        permissions,
        passwordHash: await bcrypt.hash(userData.password, 12),
      });

      await user.save();
      createdUsers.push(user);
      logger.info(`Created user: ${user.fullName} (${user.role})`);
    }

    // Create clients
    for (const clientData of clientsData) {
      const client = new Client({
        ...clientData,
        createdBy: createdUsers[0]._id, // Director
      });

      await client.save();
      logger.info(`Created client: ${client.name}`);
    }

    // Create dyehouses
    for (const dyehouseData of dyehousesData) {
      const dyehouse = new Dyehouse({
        ...dyehouseData,
        createdBy: createdUsers[0]._id, // Director
      });

      await dyehouse.save();
      logger.info(`Created dyehouse: ${dyehouse.name}`);
    }

    // Create cash accounts
    for (const accountData of cashAccountsData) {
      const account = new CashAccount({
        ...accountData,
        createdBy: createdUsers[0]._id, // Director
      });

      await account.save();
      logger.info(`Created cash account: ${account.name}`);
    }

    logger.info("Database seeded successfully!");
    logger.info("Default login credentials:");
    logger.info("Director: +998901234567 / 123456");
    logger.info("Manager: +998901234568 / 123456");
    logger.info("Seller: +998901234569 / 123456");
    logger.info("Accountant: +998901234570 / 123456");
    logger.info("Worker: +998901234571 / 123456");
  } catch (error) {
    logger.error("Seeding error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  }
};

// Run seeding if this file is executed directly
// Handle Windows path differences
const isDirectExecution = import.meta.url.includes(
  process.argv[1].replace(/\\/g, "/")
);
if (isDirectExecution) {
  seedDatabase();
}

export default seedDatabase;
