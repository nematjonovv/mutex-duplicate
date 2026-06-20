import React, { useState } from 'react';
import { Table, Card, Tag, Input, Button, Space } from 'antd';
import { usePaginatedQuery } from '@/hooks/useApi';
import { finishedProductService } from '@/services/finishedProductService';
import { formatDate, formatNumber } from '@/utils';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

const FinishedProductPage: React.FC = () => {
  const [search, setSearch] = useState("");
  
  const { data, isLoading, refetch } = usePaginatedQuery(
    ['finished-products-base', search],
    (params) => finishedProductService.getProducts({ ...params, search, isSentToBase: "true" }),
    { page: 1, limit: 10 }
  );

  const columns = [
    {
      title: 'Partiya',
      dataIndex: 'batch',
      key: 'batch',
      render: (batch: string) => <Tag color="blue">{batch}</Tag>,
    },
    { title: 'Nomi', dataIndex: 'productName', key: 'productName' },
    { title: 'Rangi', dataIndex: 'color', key: 'color' },
    { title: 'Rang kodi', dataIndex: 'colorCode', key: 'colorCode' },
    { 
      title: "Og'irligi (kg)", 
      dataIndex: 'weightKg', 
      key: 'weightKg',
      render: (val: number) => formatNumber(val)
    },
    { 
      title: 'Sana', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (date: string) => formatDate(date)
    },
    {
      title: "Farq",
      dataIndex: "weightDifference",
      key: "weightDifference",
      onCell: (record: any, index: number) => {
        const materials = data?.data || [];
        const getGroupKey = (item: any) => item.wrappingId || item.bagsParties?.[0];
        const currentGroupKey = getGroupKey(record);
        
        if (!currentGroupKey || index === undefined) return {};

        if (index > 0 && getGroupKey(materials[index - 1]) === currentGroupKey) {
          return { rowSpan: 0 };
        }
        
        let span = 1;
        for (let i = index + 1; i < materials.length; i++) {
          if (getGroupKey(materials[i]) === currentGroupKey) {
            span++;
          } else {
            break;
          }
        }
        
        return { rowSpan: span };
      },
      render: (diff: number, record: any, index: number) => {
        const materials = data?.data || [];
        const getGroupKey = (item: any) => item.wrappingId || item.bagsParties?.[0];
        const currentGroupKey = getGroupKey(record);
        let total = diff || 0;
        
        if (currentGroupKey && index !== undefined) {
             for (let i = index + 1; i < materials.length; i++) {
                 if (getGroupKey(materials[i]) === currentGroupKey) {
                     total += (materials[i].weightDifference || 0);
                 } else {
                     break;
                 }
             }
        }
        
        if (!total) return <span className="text-gray-400">-</span>;
        const color = total > 0 ? "green" : "red";
        const sign = total > 0 ? "+" : "";
        return <span style={{ color, fontWeight: 'bold' }}>{sign}{formatNumber(total)} kg</span>;
      },
    },
    { title: 'Izoh', dataIndex: 'comment', key: 'comment' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tayyor mahsulotlar bazasi</h1>
      <Card>
        <div className="mb-4 flex justify-between">
           <Input 
             placeholder="Qidirish..." 
             prefix={<SearchOutlined />} 
             className="w-64"
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
           <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Yangilash</Button>
        </div>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data?.data || []}
          loading={isLoading}
          pagination={{
            current: data?.pagination?.page || 1,
            pageSize: data?.pagination?.limit || 10,
            total: data?.pagination?.total || 0,
          }}
          rowClassName={(record, index) => {
             const materials = data?.data || [];
             const getGroupKey = (item: any) => item.wrappingId || item.bagsParties?.[0];
             const currentGroupKey = getGroupKey(record);
             
             if (!currentGroupKey) return "";
             
             let groupCount = 0;
             let currentId = getGroupKey(materials[0]);
             
             for (let i = 0; i <= index; i++) {
                 if (getGroupKey(materials[i]) !== currentId) {
                     groupCount++;
                     currentId = getGroupKey(materials[i]);
                 }
             }
             
             return groupCount % 2 === 0 ? "" : "bg-gray-50";
          }}
        />
      </Card>
    </div>
  );
};

export default FinishedProductPage;