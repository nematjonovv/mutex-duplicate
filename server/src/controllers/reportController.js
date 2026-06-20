import Invoice from "../models/Invoice.js";
import CashFlow from "../models/CashFlow.js";
import Client from "../models/Client.js";
import RawMaterialIntake from "../models/RawMaterialIntake.js";
import SmallBaseTransfer from "../models/SmallBaseTransfer.js";
import FinishedProduct from "../models/FinishedProduct.js";
import Debt from "../models/Debt.js";
import { logger } from "../config/logger.js";
import mongoose from "mongoose";

// Get financial reports
export const getFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Calculate Income (CashFlow IN)
    const incomeAggregation = await CashFlow.aggregate([
      {
        $match: {
          direction: "IN",
          deletedAt: null,
          time: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { 
            month: { $month: "$time" }, 
            year: { $year: "$time" } 
          },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // 2. Calculate Expenses (CashFlow OUT)
    const expenseAggregation = await CashFlow.aggregate([
      {
        $match: {
          direction: "OUT",
          deletedAt: null,
          time: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { 
            month: { $month: "$time" }, 
            year: { $year: "$time" } 
          },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // 3. Calculate Total Sales (Invoices)
    const salesAggregation = await Invoice.aggregate([
      {
        $match: {
          deletedAt: null,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$netTotal" },
          paid: { $sum: "$paid" },
          debt: { $sum: "$balance" }
        }
      }
    ]);

    // 4. Calculate Total Debts
    const debtsAggregation = await Debt.aggregate([
      {
        $match: {
          deletedAt: null,
          currentDebt: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$currentDebt" }
        }
      }
    ]);

    // Format monthly data
    const monthlyData = [];
    const months = {};

    // Helper to get month key
    const getMonthKey = (d) => `${d.year}-${String(d.month).padStart(2, '0')}`;

    incomeAggregation.forEach(item => {
      const key = getMonthKey(item._id);
      if (!months[key]) months[key] = { income: 0, expense: 0, profit: 0, month: key };
      months[key].income = item.total;
    });

    expenseAggregation.forEach(item => {
      const key = getMonthKey(item._id);
      if (!months[key]) months[key] = { income: 0, expense: 0, profit: 0, month: key };
      months[key].expense = item.total;
    });

    Object.values(months).forEach(m => {
      m.profit = m.income - m.expense;
      monthlyData.push(m);
    });

    // Sort by date
    monthlyData.sort((a, b) => a.month.localeCompare(b.month));

    const totalIncome = incomeAggregation.reduce((acc, curr) => acc + curr.total, 0);
    const totalExpense = expenseAggregation.reduce((acc, curr) => acc + curr.total, 0);
    const netProfit = totalIncome - totalExpense;
    const totalSales = salesAggregation[0]?.total || 0;
    const totalDebts = debtsAggregation[0]?.total || 0;
    const totalPayments = salesAggregation[0]?.paid || 0;

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netProfit,
        totalSales,
        totalDebts,
        totalPayments,
        monthlyData,
        profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
        collectionRate: totalSales > 0 ? (totalPayments / totalSales) * 100 : 0
      }
    });

  } catch (error) {
    logger.error("Get financial report error:", error);
    res.status(500).json({
      success: false,
      message: "Moliyaviy hisobotni yuklashda xatolik yuz berdi"
    });
  }
};

// Get sales reports
export const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Top Clients
    const topClients = await Invoice.aggregate([
      {
        $match: {
          deletedAt: null,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: "$clientId",
          totalSpent: { $sum: "$netTotal" },
          invoicesCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "clients",
          localField: "_id",
          foreignField: "_id",
          as: "client"
        }
      },
      { $unwind: "$client" },
      {
        $project: {
          name: "$client.name",
          totalSpent: 1,
          invoicesCount: 1
        }
      }
    ]);

    // 2. Sales Trend (Daily)
    const salesTrend = await Invoice.aggregate([
      {
        $match: {
          deletedAt: null,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { 
            day: { $dayOfMonth: "$createdAt" },
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" }
          },
          total: { $sum: "$netTotal" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      {
        $project: {
          date: { 
            $concat: [
              { $toString: "$_id.year" }, "-",
              { $toString: "$_id.month" }, "-",
              { $toString: "$_id.day" }
            ]
          },
          amount: "$total"
        }
      }
    ]);

    // 3. Sales Structure (By Product)
    const salesStructure = await Invoice.aggregate([
      {
        $match: {
          deletedAt: null,
          createdAt: { $gte: start, $lte: end }
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productName",
          value: { 
            $sum: { 
              $subtract: [
                { $multiply: ["$items.price", "$items.weightKg"] }, 
                { $ifNull: ["$items.discount", 0] }
              ] 
            } 
          },
          totalWeight: { $sum: "$items.weightKg" },
          count: { $sum: 1 }
        }
      },
      { 
          $project: {
              name: "$_id",
              value: 1,
              totalWeight: 1,
              count: 1,
              _id: 0
          }
      },
      { $sort: { value: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        topClients,
        salesTrend,
        salesStructure
      }
    });

  } catch (error) {
    logger.error("Get sales report error:", error);
    res.status(500).json({
      success: false,
      message: "Sotuvlar hisobotni yuklashda xatolik yuz berdi"
    });
  }
};

// Get inventory reports
export const getInventoryReport = async (req, res) => {
  try {
    // 1. Raw Materials Stats (Intake - SmallBaseTransfer)
    const rawMaterialIntake = await RawMaterialIntake.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          totalWeight: { $sum: "$totalWeightKg" },
          totalBags: { $sum: "$totalBags" },
          count: { $sum: 1 }
        }
      }
    ]);

    const smallBaseTransfer = await SmallBaseTransfer.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          totalWeight: { $sum: "$weightKg" }
        }
      }
    ]);

    const totalRawIntake = rawMaterialIntake[0]?.totalWeight || 0;
    const totalRawTransfer = smallBaseTransfer[0]?.totalWeight || 0;
    const currentRawStock = Math.max(0, totalRawIntake - totalRawTransfer);

    // 2. Finished Products Stats
    const finishedProductsStats = await FinishedProduct.aggregate([
      { 
        $match: { 
          deletedAt: null,
          status: 'ACTIVE'
        } 
      },
      {
        $group: {
          _id: null,
          totalWeight: { $sum: "$weightKg" },
          totalBags: { $sum: "$bagsCount" },
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. Low Stock Items (using simple query on RawMaterialIntake for now, though imprecise without aggregation)
    // Better to just return empty list or mock for now as per InventoryController complexity
    // Or we can return the aggregate result from InventoryController if we wanted to call it.
    // For simplicity, let's just return empty low stock or the intakes that are recent.
    const lowStockItems = []; 

    res.status(200).json({
      success: true,
      data: {
        rawMaterials: {
            totalWeight: currentRawStock,
            totalBags: rawMaterialIntake[0]?.totalBags || 0, // Bags tracking might be inaccurate after transfers
            count: rawMaterialIntake[0]?.count || 0
        },
        finishedProducts: {
            totalWeight: finishedProductsStats[0]?.totalWeight || 0,
            totalBags: finishedProductsStats[0]?.totalBags || 0,
            count: finishedProductsStats[0]?.count || 0
        },
        lowStockItems
      }
    });

  } catch (error) {
    logger.error("Get inventory report error:", error);
    res.status(500).json({
      success: false,
      message: "Inventar hisobotni yuklashda xatolik yuz berdi"
    });
  }
};

// Get dashboard summary
export const getDashboardData = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const [
        todaySales,
        monthSales,
        activeDebts,
        totalClients,
        totalInvoices,
        totalRevenue,
        totalDebts,
        monthlyRevenue,
        recentInvoices,
        recentDebts
    ] = await Promise.all([
        // Today's Sales
        Invoice.aggregate([
            {
                $match: {
                    deletedAt: null,
                    createdAt: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$netTotal" },
                    count: { $sum: 1 }
                }
            }
        ]),
        // Month's Sales
        Invoice.aggregate([
            {
                $match: {
                    deletedAt: null,
                    createdAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$netTotal" },
                    count: { $sum: 1 }
                }
            }
        ]),
        // Active Debts
        Debt.aggregate([
            {
                $match: {
                    deletedAt: null,
                    currentDebt: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$currentDebt" },
                    count: { $sum: 1 }
                }
            }
        ]),
        // Total Clients
        Client.countDocuments({ deletedAt: null }),
        // Total Invoices
        Invoice.countDocuments({ deletedAt: null }),
        // Total Revenue
        Invoice.aggregate([
            { $match: { deletedAt: null, status: { $ne: "CANCELLED" } } },
            { $group: { _id: null, total: { $sum: "$netTotal" } } }
        ]),
        // Total Debts (All time active)
        Debt.aggregate([
            { $match: { deletedAt: null } },
            { $group: { _id: null, total: { $sum: "$currentDebt" } } }
        ]),
        // Monthly Revenue Trend
        Invoice.aggregate([
            {
                $match: {
                    deletedAt: null,
                    createdAt: { $gte: sixMonthsAgo },
                    status: { $ne: "CANCELLED" }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    amount: { $sum: "$netTotal" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]),
        // Recent Invoices
        Invoice.find({ deletedAt: null })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("invoiceNo clientMeta netTotal paid createdAt status"),
        // Recent Debts
        Debt.find({ deletedAt: null, currentDebt: { $gt: 0 } })
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate("clientId", "name")
    ]);

    // Format Monthly Revenue
    const months = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];
    const formattedMonthlyRevenue = monthlyRevenue.map(item => ({
        month: months[item._id.month - 1],
        amount: item.amount,
        year: item._id.year
    }));

    // Format Recent Data
    const formattedRecentInvoices = recentInvoices.map(inv => ({
        _id: inv._id,
        invoiceNo: inv.invoiceNo,
        client: { name: inv.clientMeta?.name || "Noma'lum" },
        netTotal: inv.netTotal,
        paid: inv.paid,
        createdAt: inv.createdAt,
        status: inv.status
    }));

    const formattedRecentDebts = recentDebts.map(debt => ({
        _id: debt._id,
        client: { name: debt.clientId?.name || "Noma'lum" },
        amount: debt.initialAmount,
        currentDebt: debt.currentDebt,
        occurredAt: debt.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: {
            todaySales: todaySales[0] || { total: 0, count: 0 },
            monthSales: monthSales[0] || { total: 0, count: 0 },
            activeDebts: activeDebts[0] || { total: 0, count: 0 },
            totalClients,
            totalInvoices,
            totalRevenue: totalRevenue[0]?.total || 0,
            totalDebts: totalDebts[0]?.total || 0
        },
        charts: {
            monthlyRevenue: formattedMonthlyRevenue
        },
        recent: {
            invoices: formattedRecentInvoices,
            debts: formattedRecentDebts
        }
      }
    });

  } catch (error) {
    logger.error("Get dashboard data error:", error);
    res.status(500).json({
      success: false,
      message: "Dashboard ma'lumotlarini yuklashda xatolik yuz berdi"
    });
  }
};
