import React, { useState, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  DatePicker,
  Table,
  Tag,
  Statistic,
  Progress,
  Typography,
  Space,
  Segmented,
  Empty,
} from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  PieChartOutlined,
  BarChartOutlined,
  LineChartOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useApiQuery } from "@/hooks/useApi";
import { CashFlow } from "@/types";
import { apiService } from "@/services/api";
import { formatNumber } from "@/utils";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

const { Title, Text } = Typography;

// Category labels for translation
const categoryLabels: Record<string, string> = {
  SALES: "Sotuv",
  PURCHASE: "Xarid",
  INVOICE_PAYMENT: "Faktura to'lovi",
  DEBT_PAYMENT: "Qarz to'lovi",
  ADVANCE_PAYMENT: "Avans to'lovi",
  SALARY: "Ish haqi",
  RENT: "Ijara",
  UTILITIES: "Kommunal to'lovlar",
  TRANSPORT: "Transport",
  RETURN_REFUND: "Qaytarish (Vozvrat)",
  REFUND: "Pul qaytarish",
  EXPENSE: "Xarajat",
  INCOME: "Daromad",
  LOAN: "Qarz",
  LOAN_REPAYMENT: "Qarz qaytarish",
  INVESTMENT: "Investitsiya",
  WITHDRAWAL: "Pul yechish",
  DEPOSIT: "Pul qo'yish",
  TRANSFER: "O'tkazma",
  OTHER: "Boshqa",
};

type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

interface CategorySummary {
  category: string;
  categoryLabel: string;
  income: number;
  expense: number;
  total: number;
  count: number;
  percentage: number;
}

interface PeriodComparison {
  currentIncome: number;
  currentExpense: number;
  previousIncome: number;
  previousExpense: number;
  incomeChange: number;
  expenseChange: number;
  incomeChangePercent: number;
  expenseChangePercent: number;
}

const FinanceReportsPage: React.FC = () => {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  // Calculate date range based on period type
  const periodDates = useMemo(() => {
    let start: Dayjs, end: Dayjs, prevStart: Dayjs, prevEnd: Dayjs;

    switch (periodType) {
      case "daily":
        start = selectedDate.startOf("day");
        end = selectedDate.endOf("day");
        prevStart = selectedDate.subtract(1, "day").startOf("day");
        prevEnd = selectedDate.subtract(1, "day").endOf("day");
        break;
      case "weekly":
        start = selectedDate.startOf("isoWeek");
        end = selectedDate.endOf("isoWeek");
        prevStart = selectedDate.subtract(1, "week").startOf("isoWeek");
        prevEnd = selectedDate.subtract(1, "week").endOf("isoWeek");
        break;
      case "monthly":
        start = selectedDate.startOf("month");
        end = selectedDate.endOf("month");
        prevStart = selectedDate.subtract(1, "month").startOf("month");
        prevEnd = selectedDate.subtract(1, "month").endOf("month");
        break;
      case "yearly":
        start = selectedDate.startOf("year");
        end = selectedDate.endOf("year");
        prevStart = selectedDate.subtract(1, "year").startOf("year");
        prevEnd = selectedDate.subtract(1, "year").endOf("year");
        break;
      default:
        start = selectedDate.startOf("month");
        end = selectedDate.endOf("month");
        prevStart = selectedDate.subtract(1, "month").startOf("month");
        prevEnd = selectedDate.subtract(1, "month").endOf("month");
    }

    return { start, end, prevStart, prevEnd };
  }, [periodType, selectedDate]);

  // Fetch current period cash flows
  const { data: currentData, isLoading: isLoadingCurrent } = useApiQuery<{
    materials: CashFlow[];
    pagination: any;
  }>(
    ["cash-flow-current", periodDates.start.toISOString(), periodDates.end.toISOString()],
    () => {
      const queryParams = new URLSearchParams({
        startDate: periodDates.start.toISOString(),
        endDate: periodDates.end.toISOString(),
        limit: "10000",
      });
      return apiService.get(`/cash-flow?${queryParams}`);
    },
    { enabled: true }
  );

  // Fetch previous period cash flows
  const { data: previousData, isLoading: isLoadingPrevious } = useApiQuery<{
    materials: CashFlow[];
    pagination: any;
  }>(
    ["cash-flow-previous", periodDates.prevStart.toISOString(), periodDates.prevEnd.toISOString()],
    () => {
      const queryParams = new URLSearchParams({
        startDate: periodDates.prevStart.toISOString(),
        endDate: periodDates.prevEnd.toISOString(),
        limit: "10000",
      });
      return apiService.get(`/cash-flow?${queryParams}`);
    },
    { enabled: true }
  );

  const currentCashFlows = (currentData?.data || []) as CashFlow[];
  const previousCashFlows = (previousData?.data || []) as CashFlow[];

  // Separate cash flows by currency
  const currentUsdCashFlows = useMemo(() => {
    return currentCashFlows.filter((cf) => {
      const account = (cf.accountId as any) || (cf.account as any);
      return account?.currency === "USD";
    });
  }, [currentCashFlows]);

  const currentUzsCashFlows = useMemo(() => {
    return currentCashFlows.filter((cf) => {
      const account = (cf.accountId as any) || (cf.account as any);
      return account?.currency === "UZS";
    });
  }, [currentCashFlows]);

  const previousUsdCashFlows = useMemo(() => {
    return previousCashFlows.filter((cf) => {
      const account = (cf.accountId as any) || (cf.account as any);
      return account?.currency === "USD";
    });
  }, [previousCashFlows]);

  const previousUzsCashFlows = useMemo(() => {
    return previousCashFlows.filter((cf) => {
      const account = (cf.accountId as any) || (cf.account as any);
      return account?.currency === "UZS";
    });
  }, [previousCashFlows]);

  // Calculate category summaries for USD
  const usdCategorySummaries = useMemo((): CategorySummary[] => {
    const categoryMap = new Map<string, { income: number; expense: number; count: number }>();

    currentUsdCashFlows.forEach((cf) => {
      const category = cf.category;
      const current = categoryMap.get(category) || { income: 0, expense: 0, count: 0 };

      if (cf.direction === "IN") {
        current.income += cf.amount;
      } else {
        current.expense += cf.amount;
      }
      current.count += 1;

      categoryMap.set(category, current);
    });

    const totalExpense = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.expense, 0);

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        categoryLabel: categoryLabels[category] || category,
        income: data.income,
        expense: data.expense,
        total: data.income - data.expense,
        count: data.count,
        percentage: totalExpense > 0 ? (data.expense / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.expense - a.expense);
  }, [currentUsdCashFlows]);

  // Calculate category summaries for UZS
  const uzsCategorySummaries = useMemo((): CategorySummary[] => {
    const categoryMap = new Map<string, { income: number; expense: number; count: number }>();

    currentUzsCashFlows.forEach((cf) => {
      const category = cf.category;
      const current = categoryMap.get(category) || { income: 0, expense: 0, count: 0 };

      if (cf.direction === "IN") {
        current.income += cf.amount;
      } else {
        current.expense += cf.amount;
      }
      current.count += 1;

      categoryMap.set(category, current);
    });

    const totalExpense = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.expense, 0);

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        categoryLabel: categoryLabels[category] || category,
        income: data.income,
        expense: data.expense,
        total: data.income - data.expense,
        count: data.count,
        percentage: totalExpense > 0 ? (data.expense / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.expense - a.expense);
  }, [currentUzsCashFlows]);

  // Calculate period comparison for USD
  const usdPeriodComparison = useMemo((): PeriodComparison => {
    const currentIncome = currentUsdCashFlows
      .filter((cf) => cf.direction === "IN")
      .reduce((sum, cf) => sum + cf.amount, 0);
    const currentExpense = currentUsdCashFlows
      .filter((cf) => cf.direction === "OUT")
      .reduce((sum, cf) => sum + cf.amount, 0);
    const previousIncome = previousUsdCashFlows
      .filter((cf) => cf.direction === "IN")
      .reduce((sum, cf) => sum + cf.amount, 0);
    const previousExpense = previousUsdCashFlows
      .filter((cf) => cf.direction === "OUT")
      .reduce((sum, cf) => sum + cf.amount, 0);

    const incomeChange = currentIncome - previousIncome;
    const expenseChange = currentExpense - previousExpense;
    const incomeChangePercent = previousIncome > 0 ? (incomeChange / previousIncome) * 100 : 0;
    const expenseChangePercent = previousExpense > 0 ? (expenseChange / previousExpense) * 100 : 0;

    return {
      currentIncome,
      currentExpense,
      previousIncome,
      previousExpense,
      incomeChange,
      expenseChange,
      incomeChangePercent,
      expenseChangePercent,
    };
  }, [currentUsdCashFlows, previousUsdCashFlows]);

  // Calculate period comparison for UZS
  const uzsPeriodComparison = useMemo((): PeriodComparison => {
    const currentIncome = currentUzsCashFlows
      .filter((cf) => cf.direction === "IN")
      .reduce((sum, cf) => sum + cf.amount, 0);
    const currentExpense = currentUzsCashFlows
      .filter((cf) => cf.direction === "OUT")
      .reduce((sum, cf) => sum + cf.amount, 0);
    const previousIncome = previousUzsCashFlows
      .filter((cf) => cf.direction === "IN")
      .reduce((sum, cf) => sum + cf.amount, 0);
    const previousExpense = previousUzsCashFlows
      .filter((cf) => cf.direction === "OUT")
      .reduce((sum, cf) => sum + cf.amount, 0);

    const incomeChange = currentIncome - previousIncome;
    const expenseChange = currentExpense - previousExpense;
    const incomeChangePercent = previousIncome > 0 ? (incomeChange / previousIncome) * 100 : 0;
    const expenseChangePercent = previousExpense > 0 ? (expenseChange / previousExpense) * 100 : 0;

    return {
      currentIncome,
      currentExpense,
      previousIncome,
      previousExpense,
      incomeChange,
      expenseChange,
      incomeChangePercent,
      expenseChangePercent,
    };
  }, [currentUzsCashFlows, previousUzsCashFlows]);

  // Top spending categories for USD
  const usdTopSpendingCategories = usdCategorySummaries
    .filter((c) => c.expense > 0)
    .slice(0, 5);

  // Top income categories for USD
  const usdTopIncomeCategories = [...usdCategorySummaries]
    .sort((a, b) => b.income - a.income)
    .filter((c) => c.income > 0)
    .slice(0, 5);

  // Top spending categories for UZS
  const uzsTopSpendingCategories = uzsCategorySummaries
    .filter((c) => c.expense > 0)
    .slice(0, 5);

  // Top income categories for UZS
  const uzsTopIncomeCategories = [...uzsCategorySummaries]
    .sort((a, b) => b.income - a.income)
    .filter((c) => c.income > 0)
    .slice(0, 5);

  const formatUsd = (amount: number) => `$${formatNumber(amount, 2)}`;
  const formatUzs = (amount: number) => `${formatNumber(amount, 0)} so'm`;

  const getPeriodLabel = () => {
    switch (periodType) {
      case "daily":
        return selectedDate.format("DD MMMM YYYY");
      case "weekly":
        return `${periodDates.start.format("DD MMM")} - ${periodDates.end.format("DD MMM YYYY")}`;
      case "monthly":
        return selectedDate.format("MMMM YYYY");
      case "yearly":
        return selectedDate.format("YYYY");
      default:
        return "";
    }
  };

  const getPreviousPeriodLabel = () => {
    switch (periodType) {
      case "daily":
        return "Kecha";
      case "weekly":
        return "O'tgan hafta";
      case "monthly":
        return "O'tgan oy";
      case "yearly":
        return "O'tgan yil";
      default:
        return "";
    }
  };

  const getCategoryColumns = (formatter: (amount: number) => string) => [
    {
      title: "Kategoriya",
      dataIndex: "categoryLabel",
      key: "categoryLabel",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Tranzaksiyalar",
      dataIndex: "count",
      key: "count",
      render: (count: number) => <Tag color="blue">{count} ta</Tag>,
    },
    {
      title: "Kirim",
      dataIndex: "income",
      key: "income",
      render: (amount: number) => (
        <Text className="text-green-600">{formatter(amount)}</Text>
      ),
    },
    {
      title: "Chiqim",
      dataIndex: "expense",
      key: "expense",
      render: (amount: number) => (
        <Text className="text-red-600">{formatter(amount)}</Text>
      ),
    },
    {
      title: "Xarajat ulushi",
      dataIndex: "percentage",
      key: "percentage",
      render: (percentage: number) => (
        <Progress
          percent={Math.round(percentage)}
          size="small"
          strokeColor={percentage > 30 ? "#ff4d4f" : percentage > 15 ? "#faad14" : "#52c41a"}
        />
      ),
    },
  ];

  const isLoading = isLoadingCurrent || isLoadingPrevious;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={2} style={{ margin: 0, fontSize: "1.5rem" }}>
            <PieChartOutlined className="mr-2" />
            Moliyaviy hisobotlar
          </Title>
          <Text type="secondary">
            Kategoriyalar bo'yicha xarajatlar va daromadlar tahlili
          </Text>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Text strong className="block mb-2">Davr turi</Text>
            <Segmented
              value={periodType}
              onChange={(val) => setPeriodType(val as PeriodType)}
              options={[
                { label: "Kunlik", value: "daily" },
                { label: "Haftalik", value: "weekly" },
                { label: "Oylik", value: "monthly" },
                { label: "Yillik", value: "yearly" },
              ]}
              block
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text strong className="block mb-2">Sana</Text>
            <DatePicker
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              picker={periodType === "yearly" ? "year" : periodType === "monthly" ? "month" : "date"}
              style={{ width: "100%" }}
              format={periodType === "yearly" ? "YYYY" : periodType === "monthly" ? "MMMM YYYY" : "DD.MM.YYYY"}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text strong className="block mb-2">Tanlangan davr</Text>
            <Tag color="blue" className="text-base px-3 py-1">
              <CalendarOutlined className="mr-1" />
              {getPeriodLabel()}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* USD Section */}
      <Card
        title={
          <Space>
            <DollarOutlined />
            <span>USD (Dollar) hisobotlari</span>
          </Space>
        }
        className="shadow-sm"
        style={{ borderTop: "3px solid #1890ff" }}
      >
        {/* USD Summary Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm h-full bg-green-50">
              <Statistic
                title="Kirim"
                value={usdPeriodComparison.currentIncome}
                precision={2}
                prefix="$"
                valueStyle={{ color: "#52c41a" }}
              />
              <div className="mt-2 flex items-center gap-2">
                {usdPeriodComparison.incomeChange >= 0 ? (
                  <Tag color="green">
                    <ArrowUpOutlined /> +{formatNumber(Math.abs(usdPeriodComparison.incomeChangePercent), 1)}%
                  </Tag>
                ) : (
                  <Tag color="red">
                    <ArrowDownOutlined /> {formatNumber(usdPeriodComparison.incomeChangePercent, 1)}%
                  </Tag>
                )}
                <Text type="secondary" className="text-xs">{getPreviousPeriodLabel()}ga</Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm h-full bg-red-50">
              <Statistic
                title="Chiqim"
                value={usdPeriodComparison.currentExpense}
                precision={2}
                prefix="$"
                valueStyle={{ color: "#ff4d4f" }}
              />
              <div className="mt-2 flex items-center gap-2">
                {usdPeriodComparison.expenseChange <= 0 ? (
                  <Tag color="green">
                    <ArrowDownOutlined /> {formatNumber(Math.abs(usdPeriodComparison.expenseChangePercent), 1)}%
                  </Tag>
                ) : (
                  <Tag color="red">
                    <ArrowUpOutlined /> +{formatNumber(usdPeriodComparison.expenseChangePercent, 1)}%
                  </Tag>
                )}
                <Text type="secondary" className="text-xs">{getPreviousPeriodLabel()}ga</Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm h-full bg-blue-50">
              <Statistic
                title="Sof foyda/zarar"
                value={usdPeriodComparison.currentIncome - usdPeriodComparison.currentExpense}
                precision={2}
                prefix="$"
                valueStyle={{
                  color: usdPeriodComparison.currentIncome - usdPeriodComparison.currentExpense >= 0 ? "#52c41a" : "#ff4d4f",
                }}
              />
              <div className="mt-2">
                <Text type="secondary">
                  {usdPeriodComparison.currentIncome - usdPeriodComparison.currentExpense >= 0 ? "Foyda" : "Zarar"}
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm h-full bg-purple-50">
              <Statistic
                title="Tranzaksiyalar"
                value={currentUsdCashFlows.length}
                suffix=" ta"
                valueStyle={{ color: "#722ed1" }}
              />
              <div className="mt-2">
                <Text type="secondary" className="text-xs">
                  Kirim: {currentUsdCashFlows.filter((cf) => cf.direction === "IN").length},
                  Chiqim: {currentUsdCashFlows.filter((cf) => cf.direction === "OUT").length}
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* USD Top Categories */}
        <Row gutter={[16, 16]} className="mt-4">
          <Col xs={24} lg={12}>
            <Card size="small" title="Eng ko'p xarajat" className="h-full">
              {usdTopSpendingCategories.length > 0 ? (
                <div className="space-y-2">
                  {usdTopSpendingCategories.map((cat, index) => (
                    <div key={cat.category} className="flex items-center gap-2">
                      <Tag color={index === 0 ? "red" : index === 1 ? "orange" : "default"}>{index + 1}</Tag>
                      <Text className="flex-1">{cat.categoryLabel}</Text>
                      <Text className="text-red-600 font-medium">{formatUsd(cat.expense)}</Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="Ma'lumot yo'q" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="Eng ko'p daromad" className="h-full">
              {usdTopIncomeCategories.length > 0 ? (
                <div className="space-y-2">
                  {usdTopIncomeCategories.map((cat, index) => (
                    <div key={cat.category} className="flex items-center gap-2">
                      <Tag color={index === 0 ? "green" : index === 1 ? "lime" : "default"}>{index + 1}</Tag>
                      <Text className="flex-1">{cat.categoryLabel}</Text>
                      <Text className="text-green-600 font-medium">{formatUsd(cat.income)}</Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="Ma'lumot yo'q" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>

        {/* USD Category Details Table */}
        <div className="mt-4">
          <Table
            dataSource={usdCategorySummaries}
            columns={getCategoryColumns(formatUsd)}
            rowKey="category"
            pagination={false}
            loading={isLoading}
            size="small"
            locale={{ emptyText: "Ma'lumot yo'q" }}
            summary={() =>
              usdCategorySummaries.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>Jami</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Tag color="blue">{usdCategorySummaries.reduce((sum, c) => sum + c.count, 0)} ta</Tag>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <Text strong className="text-green-600">
                        {formatUsd(usdCategorySummaries.reduce((sum, c) => sum + c.income, 0))}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>
                      <Text strong className="text-red-600">
                        {formatUsd(usdCategorySummaries.reduce((sum, c) => sum + c.expense, 0))}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4}>
                      <Progress percent={100} size="small" strokeColor="#1890ff" />
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        </div>
      </Card>

      {/* UZS Section */}
      <Card
        title={
          <Space>
            <DollarOutlined />
            <span>UZS (So'm) hisobotlari</span>
          </Space>
        }
        className="shadow-sm"
        style={{ borderTop: "3px solid #52c41a" }}
      >
        {/* UZS Summary Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm h-full bg-green-50">
              <Statistic
                title="Kirim"
                value={uzsPeriodComparison.currentIncome}
                precision={0}
                suffix=" so'm"
                valueStyle={{ color: "#52c41a" }}
              />
              <div className="mt-2 flex items-center gap-2">
                {uzsPeriodComparison.incomeChange >= 0 ? (
                  <Tag color="green">
                    <ArrowUpOutlined /> +{formatNumber(Math.abs(uzsPeriodComparison.incomeChangePercent), 1)}%
                  </Tag>
                ) : (
                  <Tag color="red">
                    <ArrowDownOutlined /> {formatNumber(uzsPeriodComparison.incomeChangePercent, 1)}%
                  </Tag>
                )}
                <Text type="secondary" className="text-xs">{getPreviousPeriodLabel()}ga</Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm h-full bg-red-50">
              <Statistic
                title="Chiqim"
                value={uzsPeriodComparison.currentExpense}
                precision={0}
                suffix=" so'm"
                valueStyle={{ color: "#ff4d4f" }}
              />
              <div className="mt-2 flex items-center gap-2">
                {uzsPeriodComparison.expenseChange <= 0 ? (
                  <Tag color="green">
                    <ArrowDownOutlined /> {formatNumber(Math.abs(uzsPeriodComparison.expenseChangePercent), 1)}%
                  </Tag>
                ) : (
                  <Tag color="red">
                    <ArrowUpOutlined /> +{formatNumber(uzsPeriodComparison.expenseChangePercent, 1)}%
                  </Tag>
                )}
                <Text type="secondary" className="text-xs">{getPreviousPeriodLabel()}ga</Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm h-full bg-blue-50">
              <Statistic
                title="Sof foyda/zarar"
                value={uzsPeriodComparison.currentIncome - uzsPeriodComparison.currentExpense}
                precision={0}
                suffix=" so'm"
                valueStyle={{
                  color: uzsPeriodComparison.currentIncome - uzsPeriodComparison.currentExpense >= 0 ? "#52c41a" : "#ff4d4f",
                }}
              />
              <div className="mt-2">
                <Text type="secondary">
                  {uzsPeriodComparison.currentIncome - uzsPeriodComparison.currentExpense >= 0 ? "Foyda" : "Zarar"}
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm h-full bg-purple-50">
              <Statistic
                title="Tranzaksiyalar"
                value={currentUzsCashFlows.length}
                suffix=" ta"
                valueStyle={{ color: "#722ed1" }}
              />
              <div className="mt-2">
                <Text type="secondary" className="text-xs">
                  Kirim: {currentUzsCashFlows.filter((cf) => cf.direction === "IN").length},
                  Chiqim: {currentUzsCashFlows.filter((cf) => cf.direction === "OUT").length}
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* UZS Top Categories */}
        <Row gutter={[16, 16]} className="mt-4">
          <Col xs={24} lg={12}>
            <Card size="small" title="Eng ko'p xarajat" className="h-full">
              {uzsTopSpendingCategories.length > 0 ? (
                <div className="space-y-2">
                  {uzsTopSpendingCategories.map((cat, index) => (
                    <div key={cat.category} className="flex items-center gap-2">
                      <Tag color={index === 0 ? "red" : index === 1 ? "orange" : "default"}>{index + 1}</Tag>
                      <Text className="flex-1">{cat.categoryLabel}</Text>
                      <Text className="text-red-600 font-medium">{formatUzs(cat.expense)}</Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="Ma'lumot yo'q" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="Eng ko'p daromad" className="h-full">
              {uzsTopIncomeCategories.length > 0 ? (
                <div className="space-y-2">
                  {uzsTopIncomeCategories.map((cat, index) => (
                    <div key={cat.category} className="flex items-center gap-2">
                      <Tag color={index === 0 ? "green" : index === 1 ? "lime" : "default"}>{index + 1}</Tag>
                      <Text className="flex-1">{cat.categoryLabel}</Text>
                      <Text className="text-green-600 font-medium">{formatUzs(cat.income)}</Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="Ma'lumot yo'q" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>

        {/* UZS Category Details Table */}
        <div className="mt-4">
          <Table
            dataSource={uzsCategorySummaries}
            columns={getCategoryColumns(formatUzs)}
            rowKey="category"
            pagination={false}
            loading={isLoading}
            size="small"
            locale={{ emptyText: "Ma'lumot yo'q" }}
            summary={() =>
              uzsCategorySummaries.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>Jami</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Tag color="blue">{uzsCategorySummaries.reduce((sum, c) => sum + c.count, 0)} ta</Tag>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <Text strong className="text-green-600">
                        {formatUzs(uzsCategorySummaries.reduce((sum, c) => sum + c.income, 0))}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>
                      <Text strong className="text-red-600">
                        {formatUzs(uzsCategorySummaries.reduce((sum, c) => sum + c.expense, 0))}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4}>
                      <Progress percent={100} size="small" strokeColor="#52c41a" />
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        </div>
      </Card>

      {/* Period Comparison */}
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>{getPreviousPeriodLabel()} bilan solishtirish</span>
          </Space>
        }
        className="shadow-sm"
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card size="small" title="USD (Dollar)" className="h-full">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Text type="secondary" className="block text-xs mb-1">Kirim</Text>
                    <div className="mb-1">
                      <Text className="text-sm">{formatUsd(usdPeriodComparison.previousIncome)}</Text>
                      <Text className="mx-1">→</Text>
                      <Text strong className="text-green-600">{formatUsd(usdPeriodComparison.currentIncome)}</Text>
                    </div>
                    <Tag color={usdPeriodComparison.incomeChange >= 0 ? "green" : "red"} className="text-xs">
                      {usdPeriodComparison.incomeChange >= 0 ? "+" : ""}{formatNumber(usdPeriodComparison.incomeChangePercent, 1)}%
                    </Tag>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <Text type="secondary" className="block text-xs mb-1">Chiqim</Text>
                    <div className="mb-1">
                      <Text className="text-sm">{formatUsd(usdPeriodComparison.previousExpense)}</Text>
                      <Text className="mx-1">→</Text>
                      <Text strong className="text-red-600">{formatUsd(usdPeriodComparison.currentExpense)}</Text>
                    </div>
                    <Tag color={usdPeriodComparison.expenseChange <= 0 ? "green" : "red"} className="text-xs">
                      {usdPeriodComparison.expenseChange >= 0 ? "+" : ""}{formatNumber(usdPeriodComparison.expenseChangePercent, 1)}%
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="UZS (So'm)" className="h-full">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Text type="secondary" className="block text-xs mb-1">Kirim</Text>
                    <div className="mb-1">
                      <Text className="text-sm">{formatUzs(uzsPeriodComparison.previousIncome)}</Text>
                      <Text className="mx-1">→</Text>
                      <Text strong className="text-green-600">{formatUzs(uzsPeriodComparison.currentIncome)}</Text>
                    </div>
                    <Tag color={uzsPeriodComparison.incomeChange >= 0 ? "green" : "red"} className="text-xs">
                      {uzsPeriodComparison.incomeChange >= 0 ? "+" : ""}{formatNumber(uzsPeriodComparison.incomeChangePercent, 1)}%
                    </Tag>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <Text type="secondary" className="block text-xs mb-1">Chiqim</Text>
                    <div className="mb-1">
                      <Text className="text-sm">{formatUzs(uzsPeriodComparison.previousExpense)}</Text>
                      <Text className="mx-1">→</Text>
                      <Text strong className="text-red-600">{formatUzs(uzsPeriodComparison.currentExpense)}</Text>
                    </div>
                    <Tag color={uzsPeriodComparison.expenseChange <= 0 ? "green" : "red"} className="text-xs">
                      {uzsPeriodComparison.expenseChange >= 0 ? "+" : ""}{formatNumber(uzsPeriodComparison.expenseChangePercent, 1)}%
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default FinanceReportsPage;
