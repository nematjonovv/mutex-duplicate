import React, { useEffect, useMemo, useState } from "react";
import { Card, Button, Table, Typography, Space, Tag } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftOutlined, PrinterOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useApiQuery } from "@/hooks/useApi";
import { finishedProductService } from "@/services/finishedProductService";
import { FinishedProduct } from "@/types";
import { formatDate, formatNumber } from "@/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import { denormalizeColorCode, groupFinishedProductsByWrapping } from "./finishedProductsShared";

const { Title, Text } = Typography;

const FinishedProductGroupDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ productName: string; color: string; colorCode: string }>();
  const productName = decodeURIComponent(params.productName || "");
  const color = decodeURIComponent(params.color || "");
  const colorCode = denormalizeColorCode(decodeURIComponent(params.colorCode || ""));
  const [selectedWrapping, setSelectedWrapping] = useState<string | null>(null);

  const { data, isLoading, refetch } = useApiQuery(
    ["finished-products-group-detail", productName, color, colorCode],
    () =>
      finishedProductService.getProducts({
        page: 1,
        limit: 1000,
        productName,
        color,
        colorCode,
        status: "ACTIVE",
      }),
    {
      enabled: !!productName && !!color,
      keepPreviousData: true,
    }
  );

  const items = (data?.data || []) as FinishedProduct[];
  const groupedWrappings = useMemo(() => groupFinishedProductsByWrapping(items), [items]);
  const wrappingKeys = Object.keys(groupedWrappings);

  useEffect(() => {
    if (!wrappingKeys.length) {
      setSelectedWrapping(null);
      return;
    }

    if (!selectedWrapping || !groupedWrappings[selectedWrapping]) {
      setSelectedWrapping(wrappingKeys[0]);
    }
  }, [groupedWrappings, selectedWrapping, wrappingKeys]);

  const selectedItems = selectedWrapping ? groupedWrappings[selectedWrapping] || [] : [];
  const totalWeight = items.reduce((sum, item) => sum + item.weightKg, 0);
  const totalBags = items.reduce((sum, item) => sum + (item.bagsCount || 1), 0);
  const lastDate = items.reduce<string | null>((latest, item) => {
    if (!latest) return item.createdAt;
    return new Date(item.createdAt).getTime() > new Date(latest).getTime() ? item.createdAt : latest;
  }, null);

  const handlePrintSelected = () => {
    if (!selectedItems.length) return;

    const totalSelectedWeight = selectedItems.reduce((sum, item) => sum + item.weightKg, 0);
    const printContent = `
      <html>
        <head>
          <title>${productName} - ${color}</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>${productName}</h1>
          <p>Rangi: ${color}${colorCode ? ` (${colorCode})` : ""}</p>
          <p>Partiya: ${selectedWrapping || "-"}</p>
          <p>Sana: ${dayjs().format("DD.MM.YYYY HH:mm")}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Shtrix kodi</th>
                <th>Og'irligi</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              ${selectedItems
                .map(
                  (item, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${item.batch || "-"}</td>
                      <td>${formatNumber(item.weightKg)} kg</td>
                      <td>${formatDate(item.createdAt)}</td>
                    </tr>`
                )
                .join("")}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="2">Jami</th>
                <th>${formatNumber(totalSelectedWeight)} kg</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  if (isLoading && !data) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/finished-products/${encodeURIComponent(productName)}`)}
            className="mb-3"
          >
            Ortga
          </Button>
          <Title level={2} className="!mb-0">
            {productName}
          </Title>
          <Text type="secondary">
            {color}
            {colorCode ? ` (${colorCode})` : ""}
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
            Yangilash
          </Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrintSelected}
            disabled={!selectedItems.length}
          >
            Tanlangan partiyani chop etish
          </Button>
        </Space>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-gray-500 mb-1">Mahsulot nomi</div>
          <Text strong>{productName}</Text>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 mb-1">Jami qoplar soni</div>
          <Text strong>{totalBags} ta</Text>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 mb-1">Jami og'irligi</div>
          <Text strong>{formatNumber(totalWeight)} kg</Text>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row justify-between gap-3">
          <div>
            <Text strong>Mahsulot guruhi tafsilotlari</Text>
            <div className="text-sm text-gray-500 mt-1">
              Oxirgi sana: {lastDate ? formatDate(lastDate) : "-"}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Jami partiyalar: <strong>{wrappingKeys.length}</strong>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <Card title="Partiyalar ro'yxati" className="h-fit">
          <div className="space-y-3">
            {wrappingKeys.length === 0 ? (
              <div className="text-gray-500 text-sm">Ma'lumot topilmadi</div>
            ) : (
              wrappingKeys.map((key) => {
                const wrappingItems = groupedWrappings[key];
                const bags = wrappingItems.reduce((sum, item) => sum + (item.bagsCount || 1), 0);
                const weight = wrappingItems.reduce((sum, item) => sum + item.weightKg, 0);
                const active = selectedWrapping === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedWrapping(key)}
                    className={`w-full text-left rounded-lg border p-4 transition ${
                      active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="font-semibold">{key}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
                      <Tag color="cyan">{bags} ta qop</Tag>
                      <span>{formatNumber(weight)} kg</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card title={selectedWrapping ? `${selectedWrapping} qoplari` : "Qoplar ro'yxati"}>
          <Table
            rowKey="_id"
            dataSource={selectedItems}
            pagination={false}
            locale={{ emptyText: "Ma'lumot topilmadi" }}
            columns={[
              {
                title: "#",
                key: "index",
                width: 60,
                render: (_: unknown, __: FinishedProduct, index: number) => index + 1,
              },
              {
                title: "Shtrix kodi",
                dataIndex: "batch",
                key: "batch",
                render: (value: string) => <Tag color="blue">{value || "-"}</Tag>,
              },
              {
                title: "Qoplar soni",
                dataIndex: "bagsCount",
                key: "bagsCount",
                render: (value: number) => `${value || 1} ta`,
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
            ]}
          />
        </Card>
      </div>
    </div>
  );
};

export default FinishedProductGroupDetailPage;
