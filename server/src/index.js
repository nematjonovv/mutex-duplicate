import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import moment from "moment-timezone";
import { z } from "zod";

// Import configurations
import { logger } from "./config/logger.js";
import { connectDB } from "./config/database.js";
import { setupSocketIO } from "./config/socket.js";
import { startScheduler } from "./utils/scheduler.js";

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import clientRoutes from "./routes/clients.js";
import debtRoutes from "./routes/debts.js";
import ourDebtRoutes from "./routes/ourDebts.js";
import dyehouseRoutes from "./routes/dyehouses.js";
import supplierRoutes from "./routes/suppliers.js";
import materialRoutes from "./routes/materials.js";
import dyeingRoutes from "./routes/dyeing.js";
import batchRoutes from "./routes/batches.js";
import invoiceRoutes from "./routes/invoices.js";
import accountRoutes from "./routes/accounts.js";
import cashFlowRoutes from "./routes/cashFlow.js";
import reportRoutes from "./routes/reports.js";
import transferRoutes from './routes/transfers.js';
import softHankRoutes from './routes/softHanks.js';
import dyehouseProcessRoutes from './routes/dyehouseProcesses.js';
import hardHankRoutes from './routes/hardHanks.js';
import wrappingRoutes from './routes/wrappings.js';
import finishedProductRoutes from './routes/finishedProducts.js';
import notificationRoutes from './routes/notifications.js';
import currencyRoutes from './routes/currencies.js';
import returnRoutes from './routes/returns.js';
import defectiveProductRoutes from './routes/defectiveProducts.js';
import settingsRoutes from './routes/settings.js'; // NEW: Import settings routes

import path from "path";
import { fileURLToPath } from "url";
import os from "os";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get local IP
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

// Set timezone
moment.tz.setDefault(process.env.TZ || "Asia/Tashkent");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  },
});

// Make io available in routes
app.set("io", io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Serve Static Files from Frontend
const distPath = path.join(__dirname, "../../dist");
app.use(express.static(distPath));

app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);
// Trust proxy for accurate IP addresses
app.set("trust proxy", true);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0"; // Localhost o'rniga 0.0.0.0 tarmoq uchun

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: moment().format(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.get("/api/network-info", (req, res) => {
  res.json({
    success: true,
    localIP: getLocalIP(),
    port: PORT
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/debts", debtRoutes);
app.use("/api/our-debts", ourDebtRoutes);
app.use("/api/dyehouses", dyehouseRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/dyeing", dyeingRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/cash-flow", cashFlowRoutes);
app.use("/api/reports", reportRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/soft-hanks', softHankRoutes);
app.use('/api/dyehouse-processes', dyehouseProcessRoutes);
app.use('/api/hard-hanks', hardHankRoutes);
app.use('/api/wrappings', wrappingRoutes);
app.use('/api/finished-products', finishedProductRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/defective-products', defectiveProductRoutes);
app.use('/api/settings', settingsRoutes); // NEW: Use settings routes

// Handle SPA routing - send index.html for any unknown requests
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);

  if (err.name === "ZodError") {
    const errors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validatsiya xatoligi",
      errors: errors,
    });
  }

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((el) => ({
      path: el.path,
      message: el.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validatsiya xatoligi",
      errors: errors,
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Setup Socket.IO
setupSocketIO(io);

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    server.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Timezone: ${process.env.TZ || "Asia/Tashkent"}`);

      // Start scheduler
      startScheduler();
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Promise Rejection:", err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  server.close(() => process.exit(1));
});

startServer();
