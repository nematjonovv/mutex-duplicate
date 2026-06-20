import RawMaterialIntake from "../models/RawMaterialIntake.js";
import SmallBaseTransfer from "../models/SmallBaseTransfer.js";
import SendToDyehouse from "../models/SendToDyehouse.js";
import HardHank from "../models/HardHank.js";
import Wrapping from "../models/Wrapping.js";
import FinishedProduct from "../models/FinishedProduct.js";

export const getInventory = async (req, res) => {
  try {
    // 1. Raw Materials Intake (In)
    const rawMaterialIntakes = await RawMaterialIntake.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$name",
          totalWeight: { $sum: "$totalWeightKg" },
          lastUpdated: { $max: "$updatedAt" },
        },
      },
    ]);

    // 2. Small Base Transfers (Out from Raw, In to Small Base)
    const smallBaseTransfers = await SmallBaseTransfer.aggregate([
      { $match: { deletedAt: null } },
      {
        $lookup: {
          from: "rawmaterialintakes",
          localField: "materialId",
          foreignField: "_id",
          as: "material",
        },
      },
      { $unwind: "$material" },
      {
        $group: {
          _id: "$material.name",
          totalWeight: { $sum: "$weightKg" },
          lastUpdated: { $max: "$updatedAt" },
        },
      },
    ]);

    // 3. Sent to Dyehouse (Out from Small Base, In to Dyeing)
    const sentToDyehouse = await SendToDyehouse.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$productName",
          totalWeight: { $sum: "$weightKg" },
          lastUpdated: { $max: "$updatedAt" },
        },
      },
    ]);

    // 4. Hard Hank (Out from Dyeing, In to Hard Hank)
    const hardHanks = await HardHank.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$name",
          totalWeight: { $sum: "$weight" },
          lastUpdated: { $max: "$updatedAt" },
        },
      },
    ]);

    // 5. Wrapping (Out from Hard Hank, In to Wrapping)
    const wrappings = await Wrapping.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$name",
          totalWeight: { $sum: "$weightKg" },
          lastUpdated: { $max: "$updatedAt" },
        },
      },
    ]);

    // 6. Finished Products (Out from Wrapping, In to Finished)
    const finishedProducts = await FinishedProduct.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$productName",
          totalWeight: { $sum: "$weightKg" },
          lastUpdated: { $max: "$updatedAt" },
        },
      },
    ]);

    // Helper to find weight in array
    const findWeight = (arr, name) => {
      const item = arr.find((i) => i._id === name);
      return item ? item.totalWeight : 0;
    };

    const findLastUpdated = (arr, name) => {
      const item = arr.find((i) => i._id === name);
      return item ? item.lastUpdated : null;
    };

    let inventory = [];
    
    // Collect all unique names from all stages
    const allNames = new Set([
      ...rawMaterialIntakes.map((i) => i._id),
      ...smallBaseTransfers.map((i) => i._id),
      ...sentToDyehouse.map((i) => i._id),
      ...hardHanks.map((i) => i._id),
      ...wrappings.map((i) => i._id),
      ...finishedProducts.map((i) => i._id),
    ]);

    allNames.forEach((name) => {
      if (!name) return;

      const rawIn = findWeight(rawMaterialIntakes, name);
      const smallIn = findWeight(smallBaseTransfers, name); // Raw Out
      const dyeIn = findWeight(sentToDyehouse, name); // Small Out
      const hardIn = findWeight(hardHanks, name); // Dye Out
      const wrapIn = findWeight(wrappings, name); // Hard Out
      const finishIn = findWeight(finishedProducts, name); // Wrap Out

      // Raw Material Stock
      const rawStock = rawIn - smallIn;
      if (rawStock > 0.01) { // Filter out negligible amounts
        inventory.push({
          _id: `RAW_${name}`,
          name: name,
          type: "RAW_MATERIAL",
          currentStock: parseFloat(rawStock.toFixed(2)),
          unit: "kg",
          status: rawStock < 100 ? "LOW" : rawStock > 1000 ? "HIGH" : "NORMAL",
          minStock: 100,
          maxStock: 10000, // Default max for calculation
          lastUpdated: findLastUpdated(rawMaterialIntakes, name) || new Date(),
        });
      }

      // Small Base Stock
      const smallStock = smallIn - dyeIn;
      if (smallStock > 0.01) {
        inventory.push({
          _id: `SMALL_${name}`,
          name: name,
          type: "SMALL_BASE",
          currentStock: parseFloat(smallStock.toFixed(2)),
          unit: "kg",
          status: smallStock < 50 ? "LOW" : smallStock > 500 ? "HIGH" : "NORMAL",
          minStock: 50,
          maxStock: 500,
          lastUpdated: findLastUpdated(smallBaseTransfers, name) || new Date(),
        });
      }

      // Dyeing Process Stock
      const dyeingStock = dyeIn - hardIn;
      if (dyeingStock > 0.01) {
        inventory.push({
          _id: `DYEING_${name}`,
          name: name,
          type: "DYEING",
          currentStock: parseFloat(dyeingStock.toFixed(2)),
          unit: "kg",
          status: "NORMAL", // Process doesn't really have Low/High
          minStock: 0,
          maxStock: 1000,
          lastUpdated: findLastUpdated(sentToDyehouse, name) || new Date(),
        });
      }

      // Hard Hank Stock
      const hardStock = hardIn - wrapIn;
      if (hardStock > 0.01) {
        inventory.push({
          _id: `HARD_${name}`,
          name: name,
          type: "HARD_HANK",
          currentStock: parseFloat(hardStock.toFixed(2)),
          unit: "kg",
          status: "NORMAL",
          minStock: 0,
          maxStock: 1000,
          lastUpdated: findLastUpdated(hardHanks, name) || new Date(),
        });
      }

      // Wrapping Stock
      const wrappingStock = wrapIn - finishIn;
      if (wrappingStock > 0.01) {
        inventory.push({
          _id: `WRAP_${name}`,
          name: name,
          type: "WRAPPING",
          currentStock: parseFloat(wrappingStock.toFixed(2)),
          unit: "kg",
          status: "NORMAL",
          minStock: 0,
          maxStock: 1000,
          lastUpdated: findLastUpdated(wrappings, name) || new Date(),
        });
      }

      // Finished Goods Stock
      const finishedStock = finishIn; // Minus sales if implemented
      if (finishedStock > 0.01) {
        inventory.push({
          _id: `FINISH_${name}`,
          name: name,
          type: "FINISHED_GOOD",
          currentStock: parseFloat(finishedStock.toFixed(2)),
          unit: "kg",
          status: finishedStock < 100 ? "LOW" : finishedStock > 1000 ? "HIGH" : "NORMAL",
          minStock: 100,
          maxStock: 5000,
          lastUpdated: findLastUpdated(finishedProducts, name) || new Date(),
        });
      }
    });

    // Apply Filters
    const { search, type, status, page = 1, limit = 10 } = req.query;

    if (search) {
      const searchLower = search.toLowerCase();
      inventory = inventory.filter(item => 
        item.name.toLowerCase().includes(searchLower)
      );
    }

    if (type) {
      inventory = inventory.filter(item => item.type === type);
    }

    if (status) {
      inventory = inventory.filter(item => item.status === status);
    }

    // Pagination
    const total = inventory.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedInventory = inventory.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        materials: paginatedInventory,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error("Inventory Error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: error.message,
    });
  }
};

export const getStockMovements = async (req, res) => {
  try {
    const limit = 20;

    const [intakes, transfers, sendToDye, hardHanks, wrappings, finished] = await Promise.all([
      RawMaterialIntake.find({ deletedAt: null }).sort({ date: -1 }).limit(limit),
      SmallBaseTransfer.find({ deletedAt: null }).sort({ dateTime: -1 }).limit(limit).populate('materialId'),
      SendToDyehouse.find({ deletedAt: null }).sort({ date: -1 }).limit(limit),
      HardHank.find({ deletedAt: null }).sort({ hardHankDate: -1 }).limit(limit),
      Wrapping.find({ deletedAt: null }).sort({ wrappingDate: -1 }).limit(limit),
      FinishedProduct.find({ deletedAt: null }).sort({ finishedDate: -1 }).limit(limit),
    ]);

    const movements = [];

    intakes.forEach(i => movements.push({
      _id: i._id,
      itemId: i._id, // placeholder
      itemName: i.name,
      type: "IN",
      quantity: i.totalWeightKg,
      reason: "Xom ashyo kirimi",
      date: i.date,
      reference: "RAW_INTAKE"
    }));

    transfers.forEach(i => movements.push({
      _id: i._id,
      itemId: i._id,
      itemName: i.materialId?.name || "Unknown",
      type: "OUT", // Relative to Raw, but let's call it TRANSFER
      quantity: i.weightKg,
      reason: "Kichik bazaga o'tkazish",
      date: i.dateTime,
      reference: "SMALL_TRANSFER"
    }));

    sendToDye.forEach(i => movements.push({
      _id: i._id,
      itemId: i._id,
      itemName: i.productName,
      type: "OUT",
      quantity: i.weightKg,
      reason: "Boyashga yuborish",
      date: i.date,
      reference: "SEND_DYE"
    }));

    // Sort by date desc
    movements.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      data: {
        movements: movements.slice(0, limit),
        pagination: { total: movements.length, page: 1, limit, pages: 1 }
      }
    });
  } catch (error) {
    console.error("Movements Error:", error);
    res.status(500).json({ success: false, message: "Xatolik yuz berdi" });
  }
};

export const getInventorySummary = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Summary implemented via main route",
  });
};
