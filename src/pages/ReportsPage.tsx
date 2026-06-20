import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Select,
  Button,
  Table,
  Tabs,
  Progress,
  Alert,
  Space,
  Empty,
  Tag,
  List,
  Avatar
} from "antd";
import {
  BarChartOutlined,
  DollarOutlined,
  UserOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ShoppingOutlined,
  RiseOutlined,
  FallOutlined,
  PrinterOutlined,
  DashboardOutlined
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { useApiQuery } from "@/hooks/useApi";
import { useCurrency } from "@/hooks/useCurrency";
import { reportService } from "@/services/reportService";
import { formatCurrency, formatDate, formatCompactNumber } from "@/utils";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("year"),
    dayjs().endOf("year"),
  ]);

  const { formatPrice, convertPrice, currency } = useCurrency();

  // 1. Fetch Dashboard Data
  const { data: dashboardData, isLoading: dashboardLoading } = useApiQuery(
    "dashboard-data",
    () => reportService.getDashboardData()
  );

  // 2. Fetch Financial Report
  const { data: financialReport, isLoading: financialLoading, refetch: refetchFinancial } = useApiQuery(
    ["financial-report", dateRange],
    () => reportService.getFinancialReport({
      startDate: dateRange[0].toISOString(),
      endDate: dateRange[1].toISOString()
    })
  );

  // 3. Fetch Sales Report
  const { data: salesReport, isLoading: salesLoading, refetch: refetchSales } = useApiQuery(
    ["sales-report", dateRange],
    () => reportService.getSalesReport({
      startDate: dateRange[0].toISOString(),
      endDate: dateRange[1].toISOString()
    })
  );

  // Handle refresh
  const handleRefresh = () => {
    refetchFinancial();
    refetchSales();
  };

  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: "Hisobotlar",
  });

  const handleDownloadExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Financial Sheet
    if (financialReport?.monthlyData) {
        const financialData = financialReport.monthlyData.map((item: any) => ({
            Oy: item.month,
            Kirim: convertPrice(item.income),
            Chiqim: convertPrice(item.expense),
            "Sof Foyda": convertPrice(item.profit)
        }));
        const financialSheet = XLSX.utils.json_to_sheet(financialData);
        XLSX.utils.book_append_sheet(workbook, financialSheet, "Moliya");
    }

    // Sales Sheet
    if (salesReport?.salesTrend) {
        const salesData = salesReport.salesTrend.map((item: any) => ({
            Sana: item.date,
            Summa: convertPrice(item.amount)
        }));
        const salesSheet = XLSX.utils.json_to_sheet(salesData);
        XLSX.utils.book_append_sheet(workbook, salesSheet, "Sotuvlar");
    }

    // Top Clients Sheet
    if (salesReport?.topClients) {
        const clientsData = salesReport.topClients.map((item: any) => ({
            Mijoz: item.name,
            "Fakturalar Soni": item.invoicesCount,
            "Jami Savdo": convertPrice(item.totalSpent)
        }));
        const clientsSheet = XLSX.utils.json_to_sheet(clientsData);
        XLSX.utils.book_append_sheet(workbook, clientsSheet, "Top Mijozlar");
    }
    
    // Write and save
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    saveAs(data, `Hisobot_${dayjs().format("DD-MM-YYYY")}.xlsx`);
  };

  const StatCard = ({ title, value, prefix, suffix, color, subTitle }: any) => (
    <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow h-full">
      <Statistic
        title={<span className="text-gray-500 font-medium">{title}</span>}
        value={value}
        precision={0}
        valueStyle={{ color: color, fontWeight: 'bold' }}
        prefix={prefix}
        suffix={suffix}
        formatter={(val) => formatPrice(Number(val))}
      />
      {subTitle && <div className="mt-2 text-gray-400 text-xs">{subTitle}</div>}
    </Card>
  );

  // Prepare chart data with currency conversion
  const salesTrendData = React.useMemo(() => {
    return salesReport?.salesTrend?.map((item: any) => ({
      ...item,
      amount: convertPrice(item.amount)
    })) || [];
  }, [salesReport, currency]);

  const financialChartData = React.useMemo(() => {
    return financialReport?.monthlyData?.map((item: any) => ({
      ...item,
      income: convertPrice(item.income),
      expense: convertPrice(item.expense),
      profit: convertPrice(item.profit)
    })) || [];
  }, [financialReport, currency]);

  const salesStructureData = React.useMemo(() => {
    return salesReport?.salesStructure?.map((item: any) => ({
      ...item,
      value: convertPrice(item.value)
    })) || [];
  }, [salesReport, currency]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold m-0">Hisobotlar va Tahlil</h1>
          <p className="text-gray-500 m-0">
            Biznesingiz holati bo'yicha to'liq tahliliy ma'lumotlar
          </p>
        </div>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates) setDateRange([dates[0]!, dates[1]!]);
            }}
            className="w-full md:w-auto"
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            Yangilash
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadExcel}>
            Excel
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Chop etish
          </Button>
          <Button icon={<DashboardOutlined />} onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
        </Space>
      </div>

      <div style={{ display: "none" }}>
        <div ref={componentRef} style={{ padding: "40px", fontFamily: "Arial, sans-serif", color: "#000", backgroundColor: "#fff" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "40px", borderBottom: "2px solid #000", paddingBottom: "20px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: "0 0 10px 0", textTransform: "uppercase" }}>Hisobot</h1>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", fontSize: "14px" }}>
               <div>
                  <strong>Tashkilot:</strong> "ONE TEXTILE"
               </div>
               <div style={{ textAlign: "right" }}>
                  <div><strong>Davr:</strong> {dateRange[0].format("DD.MM.YYYY")} - {dateRange[1].format("DD.MM.YYYY")}</div>
                  <div><strong>Sana:</strong> {dayjs().format("DD.MM.YYYY HH:mm")}</div>
               </div>
            </div>
          </div>

          {/* 1. Financial Summary */}
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", borderBottom: "1px solid #ccc", paddingBottom: "10px", marginBottom: "15px" }}>1. MOLIYAVIY XULOSA</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "10px", fontWeight: "bold" }}>Jami Kirim</td>
                  <td style={{ padding: "10px", textAlign: "right", color: "green", fontWeight: "bold" }}>{formatPrice(financialReport?.totalIncome || 0)}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "10px", fontWeight: "bold" }}>Jami Xarajat</td>
                  <td style={{ padding: "10px", textAlign: "right", color: "red", fontWeight: "bold" }}>{formatPrice(financialReport?.totalExpense || 0)}</td>
                </tr>
                <tr style={{ backgroundColor: "#f9f9f9" }}>
                  <td style={{ padding: "10px", fontWeight: "bold", fontSize: "16px" }}>SOF FOYDA</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold", fontSize: "16px", color: (financialReport?.netProfit || 0) >= 0 ? "green" : "red" }}>
                    {formatPrice(financialReport?.netProfit || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. Monthly Breakdown */}
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", borderBottom: "1px solid #ccc", paddingBottom: "10px", marginBottom: "15px" }}>2. OYLIK DINAMIKA</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f0f0f0", borderBottom: "2px solid #000" }}>
                  <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Oy</th>
                  <th style={{ padding: "10px", textAlign: "right", border: "1px solid #ddd" }}>Kirim</th>
                  <th style={{ padding: "10px", textAlign: "right", border: "1px solid #ddd" }}>Xarajat</th>
                  <th style={{ padding: "10px", textAlign: "right", border: "1px solid #ddd" }}>Foyda</th>
                </tr>
              </thead>
              <tbody>
                {financialChartData.map((item: any, index: number) => (
                  <tr key={index} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{item.month}</td>
                    <td style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd", color: "green" }}>{formatCurrency(item.income, currency)}</td>
                    <td style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd", color: "red" }}>{formatCurrency(item.expense, currency)}</td>
                    <td style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd", fontWeight: "bold" }}>{formatCurrency(item.profit, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 3. Top Clients */}
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", borderBottom: "1px solid #ccc", paddingBottom: "10px", marginBottom: "15px" }}>3. TOP MIJOZLAR (Top 10)</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f0f0f0", borderBottom: "2px solid #000" }}>
                  <th style={{ padding: "10px", textAlign: "center", border: "1px solid #ddd", width: "50px" }}>№</th>
                  <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Mijoz</th>
                  <th style={{ padding: "10px", textAlign: "center", border: "1px solid #ddd" }}>Fakturalar</th>
                  <th style={{ padding: "10px", textAlign: "right", border: "1px solid #ddd" }}>Jami Savdo</th>
                </tr>
              </thead>
              <tbody>
                {salesReport?.topClients?.slice(0, 10).map((item: any, index: number) => (
                  <tr key={index} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd" }}>{index + 1}</td>
                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{item.name}</td>
                    <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd" }}>{item.invoicesCount}</td>
                    <td style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd", fontWeight: "bold" }}>{formatPrice(item.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ marginTop: "50px", borderTop: "1px solid #000", paddingTop: "20px", display: "flex", justifyContent: "space-between" }}>
              <div>Direktor: _________________</div>
              <div>Bosh hisobchi: _________________</div>
          </div>
        </div>
      </div>

      <Tabs defaultActiveKey="dashboard" type="card" size="large" className="bg-white p-4 rounded-lg shadow-sm">
        {/* --- DASHBOARD TAB --- */}
        <TabPane
          tab={
            <span className="flex items-center gap-2">
              <BarChartOutlined /> Umumiy
            </span>
          }
          key="dashboard"
        >
          <div className="space-y-6 mt-4">
            {/* Quick Stats */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <StatCard
                  title="Bugungi Savdo"
                  value={dashboardData?.stats?.todaySales?.total || 0}
                  prefix={<ShoppingOutlined />}
                  color="#1890ff"
                  subTitle={`${dashboardData?.stats?.todaySales?.count || 0} ta faktura`}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <StatCard
                  title="Oylik Savdo"
                  value={dashboardData?.stats?.monthSales?.total || 0}
                  prefix={<RiseOutlined />}
                  color="#52c41a"
                  subTitle={`${dashboardData?.stats?.monthSales?.count || 0} ta faktura`}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <StatCard
                  title="Faol Qarzlar"
                  value={dashboardData?.stats?.activeDebts?.total || 0}
                  prefix={<FileTextOutlined />}
                  color="#faad14"
                  subTitle={`${dashboardData?.stats?.activeDebts?.count || 0} ta mijoz`}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <StatCard
                  title="Sof Foyda (Tanlangan davr)"
                  value={financialReport?.netProfit || 0}
                  prefix={<DollarOutlined />}
                  color={financialReport?.netProfit >= 0 ? "#52c41a" : "#f5222d"}
                />
              </Col>
            </Row>

            {/* Sales Trend Chart */}
            <Card title="Sotuvlar Dinamikasi" bordered={false} className="shadow-sm">
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salesTrendData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(val) => formatCompactNumber(val)} />
                    <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                    <Area type="monotone" dataKey="amount" stroke="#1890ff" fillOpacity={1} fill="url(#colorSales)" name="Sotuv" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabPane>

        {/* --- FINANCIAL TAB --- */}
        <TabPane
          tab={
            <span className="flex items-center gap-2">
              <DollarOutlined /> Moliyaviy
            </span>
          }
          key="financial"
        >
          <div className="space-y-6 mt-4">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Card title="Daromad va Xarajatlar" bordered={false} className="shadow-sm">
                  <div style={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={financialChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(val) => formatCompactNumber(val)} />
                        <Tooltip formatter={(val: number) => formatCurrency(val, currency)} cursor={{ fill: 'transparent' }} />
                        <Legend />
                        <Bar dataKey="income" name="Kirim" fill="#52c41a" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Chiqim" fill="#f5222d" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <div className="space-y-4">
                  <Card title="Ko'rsatkichlar" bordered={false} className="shadow-sm">
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>Foyda Marjasi</span>
                          <span className="font-bold">{financialReport?.profitMargin?.toFixed(1)}%</span>
                        </div>
                        <Progress 
                            percent={Math.min(100, Math.max(0, financialReport?.profitMargin || 0))} 
                            strokeColor={financialReport?.profitMargin >= 0 ? "#52c41a" : "#f5222d"} 
                            showInfo={false}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>To'lovlarni Yig'ish</span>
                          <span className="font-bold">{financialReport?.collectionRate?.toFixed(1)}%</span>
                        </div>
                        <Progress 
                          percent={Math.min(100, Math.max(0, financialReport?.collectionRate || 0))} 
                          strokeColor="#1890ff" 
                          showInfo={false}
                        />
                      </div>
                    </div>
                  </Card>
                  
                  <Card title="Jami Xulosa" bordered={false} className="shadow-sm">
                      <List itemLayout="horizontal">
                          <List.Item>
                              <List.Item.Meta title="Jami Tushum" description={<span className="text-green-600 font-bold">{formatPrice(financialReport?.totalIncome || 0)}</span>} />
                          </List.Item>
                          <List.Item>
                              <List.Item.Meta title="Jami Xarajat" description={<span className="text-red-600 font-bold">{formatPrice(financialReport?.totalExpense || 0)}</span>} />
                          </List.Item>
                          <List.Item>
                              <List.Item.Meta title="Sof Foyda" description={<span className={`${(financialReport?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'} font-bold`}>{formatPrice(financialReport?.netProfit || 0)}</span>} />
                          </List.Item>
                      </List>
                  </Card>
                </div>
              </Col>
            </Row>
          </div>
        </TabPane>

        {/* --- SALES TAB --- */}
        <TabPane
          tab={
            <span className="flex items-center gap-2">
              <UserOutlined /> Sotuvlar va Mijozlar
            </span>
          }
          key="sales"
        >
          <div className="space-y-6 mt-4">
             <Row gutter={[16, 16]}>
                 <Col xs={24} lg={12}>
                     <Card title="Top Mijozlar (Sotuv hajmi bo'yicha)" bordered={false} className="shadow-sm">
                         <List
                            itemLayout="horizontal"
                            dataSource={salesReport?.topClients || []}
                            renderItem={(item: any, index) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<Avatar style={{ backgroundColor: COLORS[index % COLORS.length] }}>{index + 1}</Avatar>}
                                        title={item.name}
                                        description={`${item.invoicesCount} ta faktura`}
                                    />
                                    <div className="font-bold text-blue-600">{formatPrice(item.totalSpent)}</div>
                                </List.Item>
                            )}
                         />
                     </Card>
                 </Col>
                 <Col xs={24} lg={12}>
                     <Card title="Sotuvlar Strukturasi" bordered={false} className="shadow-sm">
                        <div style={{ height: 350 }}>
                             {salesStructureData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={salesStructureData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                        >
                                            {salesStructureData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                                        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: "20px" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                             ) : (
                                <div className="h-full flex items-center justify-center">
                                    <Empty description="Ma'lumot mavjud emas" />
                                </div>
                             )}
                        </div>
                     </Card>
                 </Col>
             </Row>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
