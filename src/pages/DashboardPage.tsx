import React from "react";
import { Card, Row, Col, Statistic, Table, Tag, Button, Skeleton, Empty, Typography, Space } from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  DollarOutlined,
  BankOutlined,
  RiseOutlined,
  ShoppingOutlined,
  CreditCardOutlined,
  PlusOutlined,
  TeamOutlined,
  ArrowRightOutlined,
  CalendarOutlined
} from "@ant-design/icons";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { formatDate, getInvoiceStatus } from "@/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useApiQuery } from "@/hooks/useApi";
import { reportService } from "@/services/reportService";
import { useNavigate } from "react-router-dom";
import { CompactAmount } from "@/components/CompactAmount";

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  const { formatPrice, currency, convertPrice } = useCurrency();
  const navigate = useNavigate();

  const { data: dashboardData, isLoading } = useApiQuery(
    "dashboardData",
    reportService.getDashboardData
  );

  const stats = dashboardData?.stats;
  const charts = dashboardData?.charts;
  const recent = dashboardData?.recent;

  // Recent invoices table columns
  const invoiceColumns = [
    {
      title: "Faktura",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      render: (text: string) => <span className="font-medium text-blue-600">{text}</span>,
    },
    {
      title: "Mijoz",
      dataIndex: ["client", "name"],
      key: "client",
      ellipsis: true,
    },
    {
      title: "Summa",
      dataIndex: "netTotal",
      key: "netTotal",
      render: (amount: any) => {
        const numAmount = Number(amount) || 0;
        return (
             <span className="font-bold text-gray-800 whitespace-nowrap">
                <CompactAmount amount={convertPrice(numAmount)} currency={currency} /> {currency || 'UZS'}
             </span>
        );
      },
    },
    {
      title: "Holat",
      key: "status",
      width: 100,
      render: (record: any) => {
        const status = getInvoiceStatus(record.paid, record.netTotal);
        return <Tag color={status.color} className="m-0">{status.status}</Tag>;
      },
    },
    {
      title: "Sana",
      dataIndex: "createdAt",
      key: "createdAt",
      responsive: ["md"],
      render: (date: string) => <span className="text-gray-500 text-xs whitespace-nowrap">{formatDate(date)}</span>,
    },
  ];

  // Recent debts table columns
  const debtColumns = [
    {
      title: "Mijoz",
      dataIndex: ["client", "name"],
      key: "client",
      ellipsis: true,
    },
    {
      title: "Qarz",
      dataIndex: "currentDebt",
      key: "currentDebt",
      render: (amount: any) => {
        const numAmount = Number(amount) || 0;
        return (
             <span className="text-red-500 font-bold whitespace-nowrap">
                <CompactAmount amount={convertPrice(numAmount)} currency={currency} /> {currency || 'UZS'}
             </span>
        );
      },
    },
    {
      title: "Sana",
      dataIndex: "occurredAt",
      key: "occurredAt",
      responsive: ["md"],
      render: (date: string) => <span className="text-gray-500 text-xs whitespace-nowrap">{formatDate(date)}</span>,
    },
  ];

  const StatCard = ({ title, value, icon, color, subTitle, loading, onClick, isMoney = true }: any) => {
    const isNumeric = !isNaN(Number(value)) && value !== null && value !== undefined && value !== '';
    const numericValue = isNumeric ? Number(value) : 0;
    
    return (
    <Card 
      className="shadow-sm hover:shadow-lg transition-all duration-300 h-full rounded-xl cursor-pointer overflow-hidden relative group"
      onClick={onClick}
      styles={{ body: { padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' } }}
    >
      <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
        <div className="flex justify-between items-start gap-4">
            <div className="z-10 flex-1 min-w-0">
                <Text type="secondary" className="font-medium text-gray-500 mb-1 block whitespace-nowrap overflow-hidden text-ellipsis">{title}</Text>
                    <div 
                        className="font-bold text-gray-800 mb-2 whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{ fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)', lineHeight: 1.2 }}
                    >
                        {isMoney && isNumeric ? (
                             <>
                                <CompactAmount amount={convertPrice(numericValue)} currency={currency} /> {currency || 'UZS'}
                             </>
                        ) : (
                            value || "0"
                        )}
                    </div>
                {subTitle && (
                    <div className="text-sm text-gray-500 font-medium">
                        {subTitle}
                    </div>
                )}
            </div>
            <div 
                className={`p-3 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 flex-shrink-0`}
                style={{ backgroundColor: `${color}15`, color: color }}
            >
                <span style={{ fontSize: '24px' }}>{icon}</span>
            </div>
        </div>
        {/* Decorative background circle */}
        <div 
            className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 duration-500"
            style={{ backgroundColor: color }}
        />
      </Skeleton>
    </Card>
  );};

  return (
    <div className="space-y-6 pb-10 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <Title level={2} style={{ margin: 0, fontSize: '1.75rem' }} className="text-gray-800">
             Boshqaruv Paneli
          </Title>
          <Space className="text-gray-500 mt-1">
             <CalendarOutlined />
             <span>{formatDate(new Date().toISOString())}</span>
          </Space>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <Button 
                type="primary" 
                size="large" 
                icon={<PlusOutlined />} 
                onClick={() => navigate('/invoices/create')}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 shadow-blue-200 shadow-lg border-0 h-12 rounded-lg"
            >
                Yangi Faktura
            </Button>
        </div>
      </div>

      {/* Main KPI Stats */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={24} md={12} xl={6}>
          <StatCard
            title="Bugungi Savdo"
            value={stats?.todaySales?.total || 0}
            icon={<ShoppingOutlined />}
            color="#3b82f6" // blue-500
            subTitle={<span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit"><RiseOutlined /> {stats?.todaySales?.count || 0} ta faktura</span>}
            loading={isLoading}
            onClick={() => navigate('/invoices')}
          />
        </Col>
        <Col xs={24} sm={24} md={12} xl={6}>
          <StatCard
            title="Oylik Savdo"
            value={stats?.monthSales?.total || 0}
            icon={<RiseOutlined />}
            color="#10b981" // emerald-500
            subTitle={<span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md w-fit"><FileTextOutlined /> {stats?.monthSales?.count || 0} ta faktura</span>}
            loading={isLoading}
            onClick={() => navigate('/reports')}
          />
        </Col>
        <Col xs={24} sm={24} md={12} xl={6}>
          <StatCard
            title="Faol Qarzlar"
            value={stats?.activeDebts?.total || 0}
            icon={<BankOutlined />}
            color="#ef4444" // red-500
            subTitle={<span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md w-fit"><UserOutlined /> {stats?.activeDebts?.count || 0} ta mijozda</span>}
            loading={isLoading}
            onClick={() => navigate('/debts')}
          />
        </Col>
        <Col xs={24} sm={24} md={12} xl={6}>
          <StatCard
            title="Jami Mijozlar"
            value={stats?.totalClients || 0}
            icon={<TeamOutlined />}
            color="#8b5cf6" // violet-500
            subTitle={<span className="text-purple-600">Faol mijozlar bazasi</span>}
            loading={isLoading}
            onClick={() => navigate('/clients')}
            isMoney={false}
          />
        </Col>
      </Row>

      {/* Secondary KPI Stats */}
      <Row gutter={[20, 20]}>
         <Col xs={24} md={12} lg={8}>
            <Card className="shadow-sm hover:shadow-md transition-shadow rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 h-full">
                <Skeleton loading={isLoading} active paragraph={{ rows: 0 }}>
                    <div className="flex items-center gap-4 h-full">
                        <div className="p-3 bg-blue-100 rounded-xl text-blue-600 shadow-sm flex-shrink-0">
                            <FileTextOutlined style={{ fontSize: '20px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-gray-500 text-sm font-medium">Jami Fakturalar</div>
                            <div className="font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', lineHeight: 1.2 }}>
                                {stats?.totalInvoices || 0}
                            </div>
                        </div>
                    </div>
                </Skeleton>
            </Card>
         </Col>
         <Col xs={24} md={12} lg={8}>
            <Card className="shadow-sm hover:shadow-md transition-shadow rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 h-full">
                <Skeleton loading={isLoading} active paragraph={{ rows: 0 }}>
                    <div className="flex items-center gap-4 h-full">
                        <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600 shadow-sm flex-shrink-0">
                            <DollarOutlined style={{ fontSize: '20px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-gray-500 text-sm font-medium">Jami Tushum</div>
                            <div className="font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', lineHeight: 1.2 }}>
                                <CompactAmount amount={convertPrice(Number(stats?.totalRevenue || 0))} currency={currency} /> {currency || 'UZS'}
                            </div>
                        </div>
                    </div>
                </Skeleton>
            </Card>
         </Col>
         <Col xs={24} md={12} lg={8}>
            <Card className="shadow-sm hover:shadow-md transition-shadow rounded-xl bg-gradient-to-br from-red-50 to-white border border-red-100 h-full">
                <Skeleton loading={isLoading} active paragraph={{ rows: 0 }}>
                    <div className="flex items-center gap-4 h-full">
                        <div className="p-3 bg-red-100 rounded-xl text-red-600 shadow-sm flex-shrink-0">
                            <CreditCardOutlined style={{ fontSize: '20px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-gray-500 text-sm font-medium">Jami Qarzlar</div>
                            <div className="font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', lineHeight: 1.2 }}>
                                <CompactAmount amount={convertPrice(Number(stats?.totalDebts || 0))} currency={currency} /> {currency || 'UZS'}
                            </div>
                        </div>
                    </div>
                </Skeleton>
            </Card>
         </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[20, 20]}>
        <Col span={24}>
          <Card 
            title={<div className="flex items-center gap-2"><RiseOutlined className="text-blue-500"/> <span>Oylik Tushumlar Dinamikasi</span></div>}
            // bordered={false} is deprecated
            className="shadow-sm rounded-xl overflow-hidden"
            styles={{ header: { borderBottom: '1px solid #f0f0f0' } }}
          >
             {isLoading ? <Skeleton active /> : (
                <div style={{ height: 400 }} className="w-full">
                   {charts?.monthlyRevenue?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={charts.monthlyRevenue} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            tickFormatter={(val) => currency === 'UZS' ? `${(val / 1000000).toFixed(0)}M` : `${(val / 1000).toFixed(0)}K`} 
                        />
                        <Tooltip 
                            formatter={(val: number) => [formatPrice(val), "Tushum"]}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorRevenue)" 
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                   ) : (
                       <div className="h-full flex items-center justify-center">
                           <Empty description="Ma'lumotlar yetarli emas" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                       </div>
                   )}
                </div>
             )}
          </Card>
        </Col>
      </Row>

      {/* Recent Activities */}
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <Card
            title={<div className="font-semibold text-lg">So'nggi Fakturalar</div>}
            // bordered={false} is deprecated
            className="shadow-sm h-full rounded-xl"
            extra={
                <Button type="link" onClick={() => navigate('/invoices')} className="flex items-center gap-1 hover:gap-2 transition-all">
                    Barchasi <ArrowRightOutlined />
                </Button>
            }
          >
            <Table
              columns={invoiceColumns}
              dataSource={recent?.invoices || []}
              pagination={false}
              size="middle"
              rowKey="_id"
              loading={isLoading}
              scroll={{ x: 500 }}
              className="overflow-hidden"
              locale={{ emptyText: <Empty description="Fakturalar yo'q" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<div className="font-semibold text-lg">So'nggi Qarzlar</div>}
            // bordered={false} is deprecated
            className="shadow-sm h-full rounded-xl"
            extra={
                <Button type="link" onClick={() => navigate('/debts')} className="flex items-center gap-1 hover:gap-2 transition-all">
                    Barchasi <ArrowRightOutlined />
                </Button>
            }
          >
            <Table
              columns={debtColumns}
              dataSource={recent?.debts || []}
              pagination={false}
              size="middle"
              rowKey="_id"
              loading={isLoading}
              scroll={{ x: 500 }}
              className="overflow-hidden"
              locale={{ emptyText: <Empty description="Qarzlar yo'q" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
