import React, { useMemo, useState } from "react";
import { Card, Button, Input, Table, Typography, Space } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftOutlined, ReloadOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
import { useApiQuery } from "@/hooks/useApi";
import { finishedProductService } from "@/services/finishedProductService";
import { formatDate, formatNumber } from "@/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AggregatedFinishedProduct, normalizeColorCode } from "./finishedProductsShared";

const { Title, Text } = Typography;
const { Search } = Input;

const FinishedProductsByProductPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ productName: string }>();
  const productName = decodeURIComponent(params.productName || "");
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, refetch } = useApiQuery(
    ["finished-products-by-product", productName],
    () =>
      finishedProductService.getAggregatedProducts({
        page: 1,
        limit: 1000,
        search: productName,
      }),
    {
      enabled: !!productName,
      keepPreviousData: true,
    }
  );

  const colorGroups = useMemo(() => {
    const items = ((data?.data || []) as AggregatedFinishedProduct[]).filter(
      (item) => item.productName === productName
    );
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((item) => {
      const haystack = `${item.color} ${item.colorCode || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [data?.data, productName, searchText]);

  const columns = [
    {
      title: "Rangi",
      dataIndex: "color",
      key: "color",
      render: (value: string, record: AggregatedFinishedProduct) => (
        <Space>
          <Text strong>{value}</Text>
          {record.colorCode ? <Text type="secondary">({record.colorCode})</Text> : null}
        </Space>
      ),
    },
    {
      title: "Qoplar soni",
      dataIndex: "bagsCount",
      key: "bagsCount",
      render: (value: number) => `${value} ta`,
    },
    {
      title: "Og'irligi",
      dataIndex: "weightKg",
      key: "weightKg",
      render: (value: number) => `${formatNumber(value)} kg`,
    },
    {
      title: "Oxirgi sana",
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
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/finished-products")} className="mb-3">
            Ortga
          </Button>
          <Title level={2} className="!mb-0">
            {productName}
          </Title>
          <Text type="secondary">Ranglar bo'yicha tayyor mahsulotlar ro'yxati</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
          Yangilash
        </Button>
      </div>

      <Card className="shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Search
            placeholder="Rangi yoki rang kodi bo'yicha qidirish..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full md:max-w-md"
          />
          <Text type="secondary">
            Jami: <Text strong>{colorGroups.length}</Text> ta rang guruhi
          </Text>
        </div>
      </Card>

      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={colorGroups}
          rowKey={(record) => `${record.productName}-${record.color}-${record.colorCode || ""}`}
          loading={isLoading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          onRow={(record) => ({
            onClick: () =>
              navigate(
                `/finished-products/${encodeURIComponent(productName)}/${encodeURIComponent(record.color)}/${encodeURIComponent(normalizeColorCode(record.colorCode))}`
              ),
            className: "cursor-pointer",
          })}
        />
      </Card>
    </div>
  );
};

export default FinishedProductsByProductPage;
