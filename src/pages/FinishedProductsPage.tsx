import React, { useMemo, useState } from "react";
import { Card, DatePicker, Input, Table, Typography, Button, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { ReloadOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useApiQuery } from "@/hooks/useApi";
import { finishedProductService } from "@/services/finishedProductService";
import { formatDate, formatNumber } from "@/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AggregatedFinishedProduct, summarizeByProductName } from "./finishedProductsShared";

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const FinishedProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const { data, isLoading, refetch } = useApiQuery(
    ["finished-products-aggregated-all", dateRange],
    () =>
      finishedProductService.getAggregatedProducts({
        page: 1,
        limit: 1000,
        startDate: dateRange ? dateRange[0].format("YYYY-MM-DD") : undefined,
        endDate: dateRange ? dateRange[1].format("YYYY-MM-DD") : undefined,
      }),
    {
      keepPreviousData: true,
    }
  );

  const groupedProducts = useMemo(() => {
    const items = (data?.data || []) as AggregatedFinishedProduct[];
    const summaries = summarizeByProductName(items);
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return summaries;
    }

    return summaries.filter((item) => item.productName.toLowerCase().includes(normalizedSearch));
  }, [data?.data, searchText]);

  const columns = [
    {
      title: "Mahsulot nomi",
      dataIndex: "productName",
      key: "productName",
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: "Jami KG",
      dataIndex: "weightKg",
      key: "weightKg",
      render: (value: number) => <Text>{formatNumber(value)} kg</Text>,
    },
    {
      title: "Oxirgi qo'shilgan sana",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => formatDate(value),
    },
    {
      title: "",
      key: "go",
      width: 60,
      render: () => <RightOutlined className="text-gray-400" />,
    },
  ];

  if (isLoading && !data) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Title level={2} className="!mb-0">
            Tayyor mahsulotlar
          </Title>
          <Text type="secondary">Mahsulot nomi bo'yicha umumiy ro'yxat</Text>
        </div>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            placeholder={["Boshlash sanasi", "Tugash sanasi"]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
            Yangilash
          </Button>
        </Space>
      </div>

      <Card className="shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Search
            placeholder="Mahsulot nomi bo'yicha qidirish..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full md:max-w-md"
          />
          <Text type="secondary">
            Jami: <Text strong>{groupedProducts.length}</Text> ta mahsulot
          </Text>
        </div>
      </Card>

      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={groupedProducts}
          rowKey="productName"
          loading={isLoading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/finished-products/${encodeURIComponent(record.productName)}`),
            className: "cursor-pointer",
          })}
        />
      </Card>

      <div className="text-xs text-gray-400">
        Yangilangan: {dayjs().format("DD.MM.YYYY HH:mm")}
      </div>
    </div>
  );
};

export default FinishedProductsPage;
