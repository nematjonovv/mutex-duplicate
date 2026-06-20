import jwt from "jsonwebtoken";
import { logger } from "./logger.js";

export const setupSocketIO = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        logger.warn(`Socket authentication failed: No token provided from ${socket.handshake.address}`);
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.userPermissions = decoded.permissions;

      logger.info(`Socket authentication successful for user: ${socket.userId}`);
      next();
    } catch (error) {
      // Handle specific JWT errors
      if (error.name === "TokenExpiredError") {
        logger.warn(`Socket authentication error: Token expired for connection from ${socket.handshake.address}`);
        return next(new Error("Authentication error: Token expired"));
      }

      if (error.name === "JsonWebTokenError") {
        logger.warn(`Socket authentication error: Invalid token from ${socket.handshake.address}`);
        return next(new Error("Authentication error: Invalid token"));
      }

      logger.error(`Socket authentication error: ${error.message}`, { address: socket.handshake.address });
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`[Socket] User connected - ID: ${socket.userId}, Role: ${socket.userRole}, SocketID: ${socket.id}`);

    // Join user to role-based rooms
    socket.join(socket.userRole);
    socket.join(socket.userId);

    // Join specific permission rooms
    if (socket.userPermissions && socket.userPermissions.length > 0) {
      socket.userPermissions.forEach((permission) => {
        socket.join(permission);
      });
      logger.debug(`[Socket] User ${socket.userId} joined permission rooms:`, socket.userPermissions);
    }

    // Emit connection confirmation to client
    socket.emit("socket:connected", {
      message: "Connected to server",
      socketId: socket.id,
      userId: socket.userId,
      role: socket.userRole,
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      logger.info(`[Socket] User disconnected - ID: ${socket.userId}, Reason: ${reason}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      logger.error(`[Socket] Error from user ${socket.userId}:`, error);
    });
  });

  // Log total connected clients every 30 seconds
  setInterval(() => {
    const connectedClients = io.engine.clientsCount;
    logger.debug(`[Socket] Total connected clients: ${connectedClients}`);
  }, 30000);

  // Export io instance for use in other modules
  global.io = io;
};

// Helper functions to emit events
export const emitToUser = (userId, event, data) => {
  if (global.io) {
    global.io.to(userId).emit(event, data);
  }
};

export const emitToRole = (role, event, data) => {
  if (global.io) {
    global.io.to(role).emit(event, data);
  }
};

export const emitToAll = (event, data) => {
  if (global.io) {
    global.io.emit(event, data);
  }
};

export const emitToPermission = (permission, event, data) => {
  if (global.io) {
    global.io.to(permission).emit(event, data);
  }
};

// Specific event emitters for business logic
export const emitInvoiceUpdate = (invoiceData) => {
  emitToAll("invoice:updated", invoiceData);
  emitToRole("ACCOUNTANT", "invoice:accountant_update", invoiceData);
  emitToRole("DIRECTOR", "invoice:director_update", invoiceData);
};

export const emitStockUpdate = (stockData) => {
  emitToAll("stock:updated", stockData);
  emitToRole("MANAGER", "stock:manager_update", stockData);
  emitToRole("WORKER", "stock:worker_update", stockData);
};

export const emitDebtUpdate = (debtData) => {
  emitToAll("debt:updated", debtData);
  emitToRole("ACCOUNTANT", "debt:accountant_update", debtData);
  emitToRole("DIRECTOR", "debt:director_update", debtData);
};

export const emitCashFlowUpdate = (cashFlowData) => {
  emitToRole("ACCOUNTANT", "cash_flow:updated", cashFlowData);
  emitToRole("DIRECTOR", "cash_flow:director_update", cashFlowData);
};
