import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  Alert,
  Tabs,
  Input,
  Select,
} from "antd";
import {
  DatabaseOutlined,
  SearchOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { usePaginatedQuery } from "@/hooks/useApi";
import { useSocket } from "@/hooks/useSocket";
import { inventoryService } from "@/services/inventoryService";
import dayjs from "dayjs";

const { Option } = Select;
const { TabPane } = Tabs;

interface InventoryItem {
  _id: string;
  name: string;
  type: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  lastUpdated: string;
  status: "LOW" | "NORMAL" | "HIGH";
}

interface StockMovement {
  _id: string;
  itemId: string;
  itemName: string;
  type: "IN" | "OUT";
  quantity: number;
  reason: string;
  date: string;
  reference: string;
}

const InventoryPage: React.FC = () => {
  // Fetch inventory data
  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    refetch: refetchInventory,
  } = usePaginatedQuery(
    ["inventory"],
    (params) =>
      inventoryService.getInventory({
        ...params,
      }),
    {
      page: 1,
      limit: 10,
    }
  );

  // Fetch stock movements
  const {
    data: movementsData,
    isLoading: movementsLoading,
    refetch: refetchMovements,
  } = usePaginatedQuery(
    ["inventory-movements"],
    (params) =>
      inventoryService.getStockMovements({
        page: params.page,
        limit: params.limit,
      }),
    {
      page: 1,
      limit: 10,
    }
  );

  // Setup Socket.IO for real-time stock updates using the shared hook
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !socket.connected) {
      return;
    }

    const handleStockUpdate = () => {
      console.log("Stock updated event received");
      refetchInventory();
      refetchMovements();
    };

    socket.on("stock:updated", handleStockUpdate);

    return () => {
      socket.off("stock:updated", handleStockUpdate);
    };
  }, [socket, refetchInventory, refetchMovements]);

  const inventoryItems = (inventoryData?.materials || []) as InventoryItem[];
  const stockMovements = (movementsData?.materials || []) as StockMovement[];

  // Calculate inventory statistics
  const totalItems = inventoryItems.length;
  const lowStockItems = inventoryItems.filter(
    (item) => item.status === "LOW"
  ).length;
  const outOfStockItems = inventoryItems.filter(
    (item) => item.currentStock === 0
  ).length;
  const totalFinishedGoods = inventoryItems
    .filter((item) => item.type === "FINISHED_GOOD")
    .reduce((sum, item) => sum + item.currentStock, 0);

  // Inventory table columns
  const inventoryColumns = [
    {
      title: "Mahsulot nomi",
      dataIndex: "name",
      key: "name",
      width: 250,
      render: (name: string, record: InventoryItem) => {
        const typeMap: Record<string, string> = {
            RAW_MATERIAL: "Xom ashyo",
            FINISHED_GOOD: "Tayyor mahsulot",
            SUPPLY: "Ta'minot",
            SMALL_BASE: "Kichik baza",
            DYEING: "Boyash jarayoni",
            HARD_HANK: "Qattiq motka",
            WRAPPING: "Qoplash",
          };
        return (
          <div className="min-w-[150px]">
            <div className="font-medium text-base">{name}</div>
            <div className="text-gray-500 text-sm mt-1">
              <Tag color="blue">{typeMap[record.type] || record.type}</Tag>
            </div>
          </div>
        );
      },
    },
    {
      title: "Joriy ombor",
      dataIndex: "currentStock",
      key: "currentStock",
      width: 200,
      render: (stock: number, record: InventoryItem) => {
        return (
          <div className="font-bold text-lg text-gray-800">
            {stock.toLocaleString()} <span className="text-sm font-normal text-gray-500">{record.unit}</span>
          </div>
        );
      },
    },
    {
      title: "Min/Max ombor",
      key: "stockLimits",
      width: 150,
      responsive: ["lg"],
      render: (record: InventoryItem) => (
        <div className="text-gray-600 min-w-[120px] bg-white p-2 rounded border border-gray-100">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Min:</span>
            <span className="font-medium text-red-500">{record.minStock?.toLocaleString() || "0"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Max:</span>
            <span className="font-medium text-green-500">{record.maxStock?.toLocaleString() || "∞"}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Holat",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        const colors = {
          LOW: "red",
          NORMAL: "green",
          HIGH: "blue",
        };
        const statusMap: Record<string, string> = {
          LOW: "Kam qolgan",
          NORMAL: "Normal",
          HIGH: "Ko'p",
        };
        return (
          <Tag color={colors[status as keyof typeof colors]} className="min-w-[80px] text-center">
            {statusMap[status] || status}
          </Tag>
        );
      },
    },
    {
      title: "Oxirgi yangilanish",
      dataIndex: "lastUpdated",
      key: "lastUpdated",
      width: 180,
      render: (date: string) => (
        <span className="text-gray-500 whitespace-nowrap">
          {dayjs(date).format("DD/MM/YYYY HH:mm")}
        </span>
      ),
    },
  ];

  // Stock movements table columns
  const movementsColumns = [
    {
      title: "Mahsulot",
      dataIndex: "itemName",
      key: "itemName",
    },
    {
      title: "Turi",
      dataIndex: "type",
      key: "type",
      render: (type: string) => (
        <Tag color={type === "IN" ? "green" : "red"}>
          {type === "IN" ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {type === "IN" ? "KIRIM" : "CHIQIM"}
        </Tag>
      ),
    },
    {
      title: "Miqdori",
      dataIndex: "quantity",
      key: "quantity",
      render: (quantity: number) => (
        <span className="font-medium">{quantity}</span>
      ),
    },
    {
      title: "Sabab",
      dataIndex: "reason",
      key: "reason",
    },
    {
      title: "Sana",
      dataIndex: "date",
      key: "date",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Havola",
      dataIndex: "reference",
      key: "reference",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventarizatsiyani boshqarish</h1>
          <p className="text-gray-600">
            Ombor darajalarini kuzatish va inventar harakatlarini monitoring qilish
          </p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetchInventory()}>
            Yangilash
          </Button>
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Jami mahsulotlar"
              value={totalItems}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Kam qolgan mahsulotlar"
              value={lowStockItems}
              valueStyle={{ color: "#faad14" }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tugagan mahsulotlar"
              value={outOfStockItems}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm">
            <div className="ant-statistic">
              <div className="ant-statistic-title mb-1">Jami tayyor mahsulot</div>
              <div 
                className="ant-statistic-content" 
                style={{ 
                  color: "#3f8600", 
                  fontSize: "1.5rem", 
                  fontWeight: "bold", 
                  lineHeight: 1.2,
                  wordBreak: "break-word"
                }}
              >
                {totalFinishedGoods.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                <span className="text-sm text-gray-500 ml-1">kg</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Info Alert */}
      <Alert
        message="Inventarni kuzatish"
        description="Inventar darajalarini monitoring qiling, zaxiralar harakatini kuzating va kam qolgan mahsulotlar uchun ogohlantirishlar oling. Bu sizga muhim materiallar hech qachon tugab qolmasligini ta'minlashga yordam beradi."
        type="info"
        showIcon
        closable
      />

      {/* Main Content */}
      <Tabs defaultActiveKey="inventory">
        <TabPane tab="Mahsulotlar ro'yxati" key="inventory">
          {/* Inventory Table */}
          <Card>
            <Table
              columns={inventoryColumns}
              dataSource={inventoryItems}
              rowKey="_id"
              loading={inventoryLoading}
              scroll={{ x: 800 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${total} ta mahsulotdan ${range[0]}-${range[1]} tasi ko'rsatilmoqda`,
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab="Ombor harakati" key="movements">
          {/* Stock Movements Table */}
          <Card>
            <Table
              columns={movementsColumns}
              dataSource={stockMovements}
              rowKey="_id"
              loading={movementsLoading}
              scroll={{ x: 800 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${total} ta harakatdan ${range[0]}-${range[1]} tasi ko'rsatilmoqda`,
              }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default InventoryPage;
