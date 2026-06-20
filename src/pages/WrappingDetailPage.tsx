import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Input,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Table,
  Tag,
  message,
  Popconfirm,
  Spin,
  Modal,
} from "antd";
import {
  PrinterOutlined,
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import { batchService, Batch } from "@/services/batchService";
import { formatNumber, inputNumberFormatter, inputNumberParser } from "@/utils";
import { PrintableBarcode, BarcodeItem } from "@/components/PrintableBarcode";

// LocalStorage keys
const TARA_SETTINGS_KEY = "wrapping_tara_settings_v3";
const LAST_WRAPPING_BATCH_KEY = "last_wrapping_batch_id";

// Default TARA settings
const DEFAULT_TARA_SETTINGS = {
  bagWeight: 0.20,
};

interface PackageItem {
  id: string;
  lotNumber: string;
  conesCount: number;
  bruttoKg: number;
  taraKg: number;
  nettoKg: number;
  packageNumber?: number;
}

// Load TARA settings
const loadTaraSettings = () => {
  try {
    const saved = localStorage.getItem(TARA_SETTINGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load TARA settings:", e);
  }
  return DEFAULT_TARA_SETTINGS;
};

const WrappingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  // Check if user can edit TARA settings
  const canEditTaraSettings = user?.role === "DIRECTOR" || user?.role === "MANAGER" || user?.role === "WRAPPER";

  // States
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [taraSettings, setTaraSettings] = useState(loadTaraSettings);

  // Batch search state
  const [batchSearchValue, setBatchSearchValue] = useState("");
  const [batchSearching, setBatchSearching] = useState(false);

  // Packages list modal
  const [packagesModalOpen, setPackagesModalOpen] = useState(false);

  // Edit package modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
  const [editBruttoKg, setEditBruttoKg] = useState<number>(0);
  const [editConesCount, setEditConesCount] = useState<number>(0);

  // Check if user can edit/delete packages
  const canManagePackages = user?.role === "DIRECTOR" || user?.role === "MANAGER";

  // New package form
  const [newBruttoKg, setNewBruttoKg] = useState<number>(0);
  const [newConesCount, setNewConesCount] = useState<number>(0);

  // Print refs and state
  const barcodePrintRef = useRef<HTMLDivElement>(null);
  const [printingItems, setPrintingItems] = useState<BarcodeItem[]>([]);

  // Print handler
  const handlePrintBarcode = useReactToPrint({
    content: () => barcodePrintRef.current,
  });

  // Load batch data and auto-start wrapping
  useEffect(() => {
    const fetchBatch = async () => {
      if (!id || id === "undefined" || id === "null") {
        localStorage.removeItem(LAST_WRAPPING_BATCH_KEY);
        navigate("/dyeing/wrapping", { replace: true });
        return;
      }
      setLoading(true);
      try {
        const response = await batchService.getById(id);
        if (response.success && response.data) {
          let batchData = (response.data as any).batch || response.data;
          setBatchSearchValue(batchData.batchNumber);
          // Save last batch ID for quick access
          localStorage.setItem(LAST_WRAPPING_BATCH_KEY, batchData._id);

          // Save last wrapped batch for WRAPPER users to backend
          if (user?.role === "WRAPPER") {
            authService.updateLastWrappedBatch(batchData._id)
              .then(() => updateUser({ lastWrappedBatchId: batchData._id }))
              .catch(console.error);
          }

          // Auto-start wrapping if not already started
          if (["CREATED", "PROCESSING"].includes(batchData.status)) {
            try {
              await batchService.update(id, { status: "WRAPPING" } as any);
              batchData = { ...batchData, status: "WRAPPING" };
            } catch (e) {
              console.error("Failed to auto-start wrapping:", e);
            }
          }

          setBatch(batchData);
          // Load packages from batch
          if (batchData.packages && batchData.packages.length > 0) {
            setPackages(batchData.packages);
          } else {
            setPackages([]);
          }
        } else {
          message.error("Partiya topilmadi");
          navigate("/dyeing/wrapping");
        }
      } catch (error) {
        message.error("Partiyani yuklashda xatolik");
        navigate("/dyeing/wrapping");
      } finally {
        setLoading(false);
      }
    };
    fetchBatch();
  }, [id, navigate, user?.role, updateUser]);

  // Handle batch search/change
  const handleBatchSearch = async (value: string) => {
    const batchNumber = value.trim();
    if (!batchNumber || batchNumber === batch?.batchNumber) return;

    setBatchSearching(true);
    try {
      const response = await batchService.scanBatch(batchNumber);
      if (response.success && response.data?.details) {
        const foundBatch = response.data.details;
        if (["CREATED", "PROCESSING", "WRAPPING", "WRAPPED"].includes(foundBatch.status)) {
          navigate(`/dyeing/wrapping/${foundBatch._id}`, { replace: true });
        } else {
          message.warning(`Bu partiya qoplash uchun yaroqli emas`);
          setBatchSearchValue(batch?.batchNumber || "");
        }
      } else {
        message.error("Partiya topilmadi");
        setBatchSearchValue(batch?.batchNumber || "");
      }
    } catch (error) {
      message.error("Partiya topilmadi");
      setBatchSearchValue(batch?.batchNumber || "");
    } finally {
      setBatchSearching(false);
    }
  };

  // Refresh batch data from database
  const refreshBatch = async () => {
    if (!id) return;
    try {
      const response = await batchService.getById(id);
      if (response.success && response.data) {
        const batchData = (response.data as any).batch || response.data;
        setBatch(batchData);
        setPackages(batchData.packages || []);
      }
    } catch (error) {
      console.error("Failed to refresh batch:", error);
    }
  };

  // Save packages to database
  const savePackagesToDb = async (newPackages: PackageItem[]) => {
    if (!id) return;
    setSaving(true);
    try {
      await batchService.update(id, { packages: newPackages } as any);
      // Refresh batch to get updated data from database
      await refreshBatch();
    } catch (error) {
      console.error("Failed to save packages:", error);
      message.error("Qoplarni saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  // Calculate TARA
  const calculateTara = (_conesCount: number) => {
    return taraSettings.bagWeight;
  };

  // Calculate totals from database (batch.packages), not local state
  const dbPackages = batch?.packages || [];
  const totalBruttoKg = dbPackages.reduce((sum, p) => sum + p.bruttoKg, 0);
  const totalTaraKg = dbPackages.reduce((sum, p) => sum + p.taraKg, 0);
  const totalNettoKg = dbPackages.reduce((sum, p) => sum + p.nettoKg, 0);
  const totalCones = dbPackages.reduce((sum, p) => sum + p.conesCount, 0);

  // Generate unique LOT number
  const generateLotNumber = () => {
    if (!batch) return "";

    // Find the maximum existing index from current packages
    let maxIndex = 0;
    const existingLots = new Set<string>();

    packages.forEach((pkg) => {
      existingLots.add(pkg.lotNumber);
      const parts = pkg.lotNumber.split("-");
      if (parts.length >= 3) {
        const idx = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(idx) && idx > maxIndex) {
          maxIndex = idx;
        }
      }
    });

    // Generate next unique lot number
    let nextIndex = maxIndex + 1;
    let lotNumber = `${batch.batchNumber}-${nextIndex.toString().padStart(2, "0")}`;

    // Ensure uniqueness (in case of any edge cases)
    while (existingLots.has(lotNumber)) {
      nextIndex++;
      lotNumber = `${batch.batchNumber}-${nextIndex.toString().padStart(2, "0")}`;
    }

    return lotNumber;
  };

  // Add new package and send to finished products
  const handleAddPackage = async () => {
    if (newBruttoKg <= 0) {
      message.warning("BRUTTO og'irlikni kiriting");
      return;
    }
    if (newConesCount <= 0) {
      message.warning("Konuslar sonini kiriting");
      return;
    }

    const lotNumber = generateLotNumber();
    const parts = lotNumber.split("-");
    const packageNumber = parseInt(parts[parts.length - 1], 10);

    const taraKg = calculateTara(newConesCount);
    const nettoKg = newBruttoKg - taraKg;

    const newPackage: PackageItem = {
      id: Date.now().toString(),
      lotNumber: lotNumber,
      conesCount: newConesCount,
      bruttoKg: newBruttoKg,
      taraKg: Math.round(taraKg * 1000) / 1000,
      nettoKg: Math.round(nettoKg * 1000) / 1000,
      packageNumber: packageNumber,
    };

    const newPackages = [...packages, newPackage];
    setPackages(newPackages);
    setNewBruttoKg(0);
    setNewConesCount(0);

    // Save to database
    await savePackagesToDb(newPackages);

    // Auto-send to finished products
    if (id) {
      try {
        await batchService.sendToBase(id);
        message.success("Qop qo'shildi va tayyor mahsulotlarga yuborildi");
      } catch (e) {
        console.error("Failed to send to base:", e);
        message.warning("Qop qo'shildi, lekin tayyor mahsulotlarga yuborishda xatolik yuz berdi");
      }
    } else {
      message.success("Qop qo'shildi");
    }

    // Auto-print the new package label
    setTimeout(() => {
      printPackageLabel(newPackage);
    }, 100);
  };

  // Remove package and delete from finished products
  const handleRemovePackage = async (pkg: PackageItem) => {
    const newPackages = packages.filter((p) => p.id !== pkg.id);
    setPackages(newPackages);
    await savePackagesToDb(newPackages);

    // Delete from finished products
    if (id) {
      try {
        await batchService.deletePackageFromFinished(id, pkg.lotNumber);
        message.success("Qop o'chirildi");
      } catch (e) {
        console.error("Failed to delete from finished products:", e);
        message.warning("Qop o'chirildi, lekin bazadan o'chirishda xatolik");
      }
    }
  };

  // Open edit modal
  const handleEditPackage = (pkg: PackageItem) => {
    setEditingPackage(pkg);
    setEditBruttoKg(pkg.bruttoKg);
    setEditConesCount(pkg.conesCount);
    setEditModalOpen(true);
  };

  // Save edited package
  const handleSaveEdit = async () => {
    if (!editingPackage || !id) return;

    const taraKg = calculateTara(editConesCount);
    const nettoKg = editBruttoKg - taraKg;

    const updatedPackage: PackageItem = {
      ...editingPackage,
      conesCount: editConesCount,
      bruttoKg: editBruttoKg,
      taraKg: Math.round(taraKg * 1000) / 1000,
      nettoKg: Math.round(nettoKg * 1000) / 1000,
    };

    const newPackages = packages.map((p) =>
      p.id === editingPackage.id ? updatedPackage : p
    );

    setPackages(newPackages);
    await savePackagesToDb(newPackages);

    // Update in finished products
    try {
      await batchService.updatePackageInFinished(id, editingPackage.lotNumber, {
        bruttoKg: updatedPackage.bruttoKg,
        taraKg: updatedPackage.taraKg,
        nettoKg: updatedPackage.nettoKg,
        conesCount: updatedPackage.conesCount,
      });
      message.success("Qop yangilandi");

      // Auto-print the updated package label
      setTimeout(() => {
        printPackageLabel(updatedPackage);
      }, 100);
    } catch (e) {
      console.error("Failed to update in finished products:", e);
      message.warning("Qop yangilandi, lekin bazada yangilashda xatolik");
    }

    setEditModalOpen(false);
    setEditingPackage(null);
  };

  // Save TARA settings
  const saveTaraSettings = (settings: typeof taraSettings) => {
    setTaraSettings(settings);
    localStorage.setItem(TARA_SETTINGS_KEY, JSON.stringify(settings));
  };

  // Print package label
  const printPackageLabel = (pkg: PackageItem) => {
    if (!batch) return;

    const barcodeItem: BarcodeItem = {
      code: pkg.lotNumber,
      productName: batch.threadType,
      description: batch.threadNumber,
      color: batch.colorName,
      colorCode: batch.colorCode,
      weight: pkg.bruttoKg,
      tara: pkg.taraKg,
      date: dayjs().format("DD.MM.YYYY"),
      conesCount: pkg.conesCount,
      packageNumber: pkg.packageNumber,
    };

    setPrintingItems([barcodeItem]);

    setTimeout(() => {
      handlePrintBarcode();
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  if (!batch) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div style={{ display: "none" }}>
        <div ref={barcodePrintRef}>
          <PrintableBarcode items={printingItems} />
        </div>
      </div>

      <Card size="small" className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-gray-500 text-sm whitespace-nowrap">Partiya:</div>
            <Input
              value={batchSearchValue}
              onChange={(e) => setBatchSearchValue(e.target.value)}
              onPressEnter={(e) => handleBatchSearch((e.target as HTMLInputElement).value)}
              placeholder="Partiya raqami"
              className="font-mono font-bold text-lg w-[180px]"
              size="large"
              disabled={batchSearching}
            />
            <Button
              type="primary"
              icon={batchSearching ? <Spin size="small" /> : <SearchOutlined />}
              onClick={() => handleBatchSearch(batchSearchValue)}
              size="large"
              disabled={batchSearching}
            />
          </div>
          <Button
            icon={<UnorderedListOutlined />}
            onClick={() => setPackagesModalOpen(true)}
            size="large"
          >
            Qoplar ({dbPackages.length})
          </Button>
        </div>
      </Card>

      <Card className="shadow-md">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={8}>
            <div className="text-base text-gray-600 mb-2 font-medium">BRUTTO (kg)</div>
            <InputNumber
              value={newBruttoKg || undefined}
              onChange={(v) => setNewBruttoKg(v || 0)}
              min={0.1}
              step={0.5}
              className="w-full"
              placeholder="0"
              formatter={inputNumberFormatter}
              parser={inputNumberParser}
              style={{ fontSize: '24px', height: '60px' }}
              size="large"
            />
          </Col>

          <Col xs={12} md={6}>
            <div className="text-base text-gray-600 mb-2 font-medium">Konuslar</div>
            <InputNumber
              value={newConesCount || undefined}
              onChange={(v) => setNewConesCount(v || 0)}
              min={1}
              className="w-full"
              placeholder="0"
              style={{ fontSize: '24px', height: '60px' }}
              size="large"
            />
          </Col>

          <Col xs={12} md={5}>
            <div className="text-base text-gray-600 mb-2 font-medium">TARA</div>
            <div className="text-orange-600 font-bold text-2xl">
              {formatNumber(calculateTara(newConesCount), 2)} kg
            </div>
          </Col>

          <Col xs={24} md={5}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddPackage}
              style={{ height: '60px', fontSize: '18px' }}
              size="large"
              block
            >
              Qo'shish
            </Button>
          </Col>
        </Row>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500 mb-3 flex items-center">
            <SettingOutlined className="mr-2" />
            TARA sozlamalari
          </div>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={12} md={4}>
              <div className="text-sm text-gray-500 mb-1">Tara (kg)</div>
              <InputNumber
                value={taraSettings.bagWeight}
                onChange={(v) => saveTaraSettings({ ...taraSettings, bagWeight: v || 0 })}
                min={0}
                step={0.01}
                precision={3}
                className="w-full"
                size="large"
                disabled={!canEditTaraSettings}
              />
            </Col>
          </Row>
        </div>
      </Card>

      <Modal
        title={`Qoplar ro'yxati - ${batch.batchNumber}`}
        open={packagesModalOpen}
        onCancel={() => setPackagesModalOpen(false)}
        footer={null}
        width={700}
      >
        <Table
          columns={[
            {
              title: "#",
              key: "index",
              width: 50,
              render: (_: any, __: any, index: number) => index + 1,
            },
            {
              title: "Shtrix kodi",
              dataIndex: "lotNumber",
              key: "lotNumber",
              render: (code: string) => <Tag color="blue" className="font-mono">{code}</Tag>,
            },
            {
              title: "Konuslar",
              dataIndex: "conesCount",
              key: "conesCount",
            },
            {
              title: "BRUTTO",
              dataIndex: "bruttoKg",
              key: "bruttoKg",
              render: (v: number) => `${formatNumber(v, 2)} kg`,
            },
            {
              title: "TARA",
              dataIndex: "taraKg",
              key: "taraKg",
              render: (v: number) => <span className="text-orange-600">{formatNumber(v, 3)} kg</span>,
            },
            {
              title: "NETTO",
              dataIndex: "nettoKg",
              key: "nettoKg",
              render: (v: number) => <span className="font-bold text-green-600">{formatNumber(v, 2)} kg</span>,
            },
            {
              title: "",
              key: "actions",
              width: canManagePackages ? 120 : 50,
              render: (record: PackageItem) => (
                <div className="flex gap-1">
                  <Button
                    type="text"
                    icon={<PrinterOutlined />}
                    size="small"
                    onClick={() => printPackageLabel(record)}
                    title="Chop etish"
                  />
                  {canManagePackages && (
                    <>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEditPackage(record)}
                        title="Tahrirlash"
                      />
                      <Popconfirm
                        title="Qopni o'chirish?"
                        description="Bu qop tayyor mahsulotlardan ham o'chiriladi"
                        onConfirm={() => handleRemovePackage(record)}
                        okText="Ha"
                        cancelText="Yo'q"
                      >
                        <Button type="text" danger icon={<DeleteOutlined />} size="small" title="O'chirish" />
                      </Popconfirm>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          dataSource={[...dbPackages].reverse()}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: "Qoplar yo'q" }}
          summary={() =>
            dbPackages.length > 0 ? (
              <Table.Summary>
                <Table.Summary.Row className="bg-gray-50 font-bold">
                  <Table.Summary.Cell index={0} colSpan={2}>JAMI</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>{totalCones}</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>{formatNumber(totalBruttoKg, 2)} kg</Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>{formatNumber(totalTaraKg, 3)} kg</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} className="text-green-600">{formatNumber(totalNettoKg, 2)} kg</Table.Summary.Cell>
                  <Table.Summary.Cell index={5}></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null
          }
        />
      </Modal>

      <Modal
        title={`Qopni tahrirlash - ${editingPackage?.lotNumber || ""}`}
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingPackage(null);
        }}
        onOk={handleSaveEdit}
        okText="Saqlash va chop etish"
        cancelText="Bekor qilish"
      >
        <div className="space-y-4 py-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">BRUTTO (kg)</div>
            <InputNumber
              value={editBruttoKg}
              onChange={(v) => setEditBruttoKg(v || 0)}
              min={0.1}
              step={0.5}
              className="w-full"
              size="large"
              formatter={inputNumberFormatter}
              parser={inputNumberParser}
            />
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Konuslar soni</div>
            <InputNumber
              value={editConesCount}
              onChange={(v) => setEditConesCount(v || 0)}
              min={1}
              className="w-full"
              size="large"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <div className="text-sm text-gray-500">TARA</div>
              <div className="text-lg font-medium text-orange-600">
                {formatNumber(calculateTara(editConesCount), 3)} kg
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">NETTO</div>
              <div className="text-lg font-bold text-green-600">
                {formatNumber(editBruttoKg - calculateTara(editConesCount), 2)} kg
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WrappingDetailPage;
