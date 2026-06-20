import React, { useEffect, useState } from "react";
import { Modal, Descriptions, Tag, Spin } from "antd";
import { softHankService } from "@/services/softHankService";
import { dyehouseProcessService } from "@/services/dyehouseProcessService";
import { hardHankService } from "@/services/hardHankService";
import { wrappingService } from "@/services/wrappingService";
import { formatDate, formatNumber } from "@/utils";

interface BatchRelationsModalProps {
  open: boolean;
  onCancel: () => void;
  record: any;
  type: "soft" | "dyehouse" | "hard" | "wrapping";
}

export const BatchRelationsModal: React.FC<BatchRelationsModalProps> = ({
  open,
  onCancel,
  record,
  type,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    soft?: any;
    dyehouse?: any;
    hard?: any;
    wrapping?: any;
  }>({});

  useEffect(() => {
    if (open && record) {
      fetchRelations();
    } else {
      setData({});
    }
  }, [open, record]);

  const fetchRelations = async () => {
    setLoading(true);
    try {
      let soft, dyehouse, hard, wrapping;

      if (type === "wrapping") {
        wrapping = record;

        // 1. Fetch Hard Hank
        if (wrapping.hardHankId) {
            try {
                const res = await hardHankService.getAll({ _id: wrapping.hardHankId });
                if (res.data?.data?.length) {
                    hard = res.data.data[0];
                }
            } catch (e) { console.error("Error fetching hard hank by ID", e); }
        }

        // Fallback: Fetch Hard by Batch
        if (!hard && wrapping.hardHankBatch) {
            try {
                const res = await hardHankService.getAll({ batchNumber: wrapping.hardHankBatch });
                if (res.data?.data?.length) {
                    hard = res.data.data[0];
                }
            } catch (e) { console.error("Error fetching hard hank by Batch", e); }
        }

        // Continue chain from Hard Hank
        if (hard) {
             // Fetch Dyehouse
            if (hard.dyehouseProcessId) {
                try {
                    const res = await dyehouseProcessService.getAll({ _id: hard.dyehouseProcessId });
                    if (res.data?.data?.length) {
                        dyehouse = res.data.data[0];
                    }
                } catch (e) { console.error("Error fetching dyehouse by ID", e); }
            }
            if (!dyehouse && hard.dyehouseBatch) {
                try {
                    const res = await dyehouseProcessService.getAll({ batch: hard.dyehouseBatch });
                    if (res.data?.data?.length) {
                        dyehouse = res.data.data[0];
                    }
                } catch (e) { console.error("Error fetching dyehouse by Batch", e); }
            }

            // Fetch Soft
            if (dyehouse) {
                 if (dyehouse.softHankId) {
                     try {
                        const res = await softHankService.getAll({ _id: dyehouse.softHankId });
                        if (res.data?.data?.length) {
                            soft = res.data.data[0];
                        }
                     } catch (e) { console.error("Error fetching soft by ID", e); }
                 }
                 if (!soft && dyehouse.batch) {
                     const possibleBatch = dyehouse.batch.replace(/-B$/, "");
                     try {
                         let res = await softHankService.getAll({ batchNumber: possibleBatch });
                         if (res.data?.data?.length) {
                             soft = res.data.data[0];
                         } else {
                             res = await softHankService.getAll({ batchNumber: `B-${possibleBatch}` });
                             if (res.data?.data?.length) {
                                 soft = res.data.data[0];
                             }
                         }
                     } catch (e) { console.error("Error fetching soft by Batch", e); }
                 }
            }
        }
      } else if (type === "hard") {
        hard = record;
        
        // 1. Try fetching Dyehouse by ID
        if (hard.dyehouseProcessId) {
            try {
                const res = await dyehouseProcessService.getAll({ _id: hard.dyehouseProcessId });
                if (res.data?.data?.length) {
                    dyehouse = res.data.data[0];
                }
            } catch (e) { console.error("Error fetching dyehouse by ID", e); }
        }
        
        // 2. Fallback: Try fetching Dyehouse by Batch
        if (!dyehouse && hard.dyehouseBatch) {
            try {
                const res = await dyehouseProcessService.getAll({ batch: hard.dyehouseBatch });
                if (res.data?.data?.length) {
                    dyehouse = res.data.data[0];
                }
            } catch (e) { console.error("Error fetching dyehouse by Batch", e); }
        }

        // 3. Fetch Soft if Dyehouse found
        if (dyehouse) {
             if (dyehouse.softHankId) {
                 try {
                    const res = await softHankService.getAll({ _id: dyehouse.softHankId });
                    if (res.data?.data?.length) {
                        soft = res.data.data[0];
                    }
                 } catch (e) { console.error("Error fetching soft by ID", e); }
             }

             // Fallback: Fetch Soft by Batch if ID failed
             if (!soft && dyehouse.batch) {
                 const possibleBatch = dyehouse.batch.replace(/-B$/, "");
                 try {
                     // Try exact match first (e.g. "123")
                     let res = await softHankService.getAll({ batchNumber: possibleBatch });
                     if (res.data?.data?.length) {
                         soft = res.data.data[0];
                     } else {
                         // Try with B- prefix (e.g. "B-123")
                         res = await softHankService.getAll({ batchNumber: `B-${possibleBatch}` });
                         if (res.data?.data?.length) {
                             soft = res.data.data[0];
                         }
                     }
                 } catch (e) { console.error("Error fetching soft by Batch", e); }
             }
        }
      } else if (type === "dyehouse") {
        dyehouse = record;
        
        // 1. Fetch Soft
        if (dyehouse.softHankId) {
             try {
                const res = await softHankService.getAll({ _id: dyehouse.softHankId });
                if (res.data?.data?.length) {
                    soft = res.data.data[0];
                }
             } catch (e) { console.error("Error fetching soft", e); }
        }

        // Fallback: Fetch Soft by Batch if ID failed
        if (!soft && dyehouse.batch) {
             const possibleBatch = dyehouse.batch.replace(/-B$/, "");
             try {
                 let res = await softHankService.getAll({ batchNumber: possibleBatch });
                 if (res.data?.data?.length) {
                     soft = res.data.data[0];
                 } else {
                     res = await softHankService.getAll({ batchNumber: `B-${possibleBatch}` });
                     if (res.data?.data?.length) {
                         soft = res.data.data[0];
                     }
                 }
             } catch (e) { console.error("Error fetching soft by Batch", e); }
        }
      } else if (type === "soft") {
        soft = record;
        // Do not fetch forward relations for soft hank page as per user request
      }

      setData({ soft, dyehouse, hard, wrapping });
    } catch (error) {
      console.error("Error fetching relations", error);
    } finally {
      setLoading(false);
    }
  };

  const renderInfo = (item: any, color: string) => {
    if (!item) return <div className="text-gray-400 italic text-center py-4">Ma'lumot topilmadi</div>;
    return (
      <Descriptions bordered size="small" column={1} layout="horizontal">
        <Descriptions.Item label="Partiya"><Tag color={color} className="font-bold">{item.wrappingBatch || item.batchNumber || item.batch || "-"}</Tag></Descriptions.Item>
        <Descriptions.Item label="Sana">{formatDate(item.date || item.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="Nomi">{item.name || item.rawMaterialName || "-"}</Descriptions.Item>
        {(item.color || item.dyehouseName) && (
             <Descriptions.Item label={item.dyehouseName ? "Bo'yoqxona" : "Rangi"}>
                {item.dyehouseName || item.color || "-"}
             </Descriptions.Item>
        )}
        {item.colorCode && <Descriptions.Item label="Rang kodi">{item.colorCode}</Descriptions.Item>}
        <Descriptions.Item label="Vazn">{formatNumber(item.weightKg || item.weight)} kg</Descriptions.Item>
      </Descriptions>
    );
  };

  const getGridCols = () => {
      if (type === 'wrapping') return 'md:grid-cols-4';
      if (type === 'hard') return 'md:grid-cols-3';
      if (type === 'dyehouse') return 'md:grid-cols-2';
      return 'md:grid-cols-1';
  };

  return (
    <Modal
      title="Partiya ma'lumotlari zanjiri"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={type === 'wrapping' ? 1200 : 1000}
    >
      {loading ? (
        <div className="flex justify-center p-8"><Spin size="large" /></div>
      ) : (
        <div className={`grid grid-cols-1 ${getGridCols()} gap-4`}>
          <div className="border rounded-lg p-4 bg-green-50 shadow-sm">
            <div className="font-bold text-center mb-4 text-green-700 text-lg border-b border-green-200 pb-2">
                Yumshoq Motka (2-bosqich)
            </div>
            {renderInfo(data.soft, "green")}
          </div>
          {(type === 'dyehouse' || type === 'hard' || type === 'wrapping') && (
            <div className="border rounded-lg p-4 bg-blue-50 shadow-sm">
              <div className="font-bold text-center mb-4 text-blue-700 text-lg border-b border-blue-200 pb-2">
                  Bo'yoqxona (3-bosqich)
              </div>
              {renderInfo(data.dyehouse, "blue")}
            </div>
          )}
          {(type === 'hard' || type === 'wrapping') && (
            <div className="border rounded-lg p-4 bg-purple-50 shadow-sm">
              <div className="font-bold text-center mb-4 text-purple-700 text-lg border-b border-purple-200 pb-2">
                  Qattiq Motka (4-bosqich)
              </div>
              {renderInfo(data.hard, "purple")}
            </div>
          )}
          {type === 'wrapping' && (
            <div className="border rounded-lg p-4 bg-orange-50 shadow-sm">
              <div className="font-bold text-center mb-4 text-orange-700 text-lg border-b border-orange-200 pb-2">
                  Qoplash (5-bosqich)
              </div>
              {renderInfo(data.wrapping, "orange")}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
