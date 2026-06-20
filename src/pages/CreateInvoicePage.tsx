import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Form,
  message,
  Select,
  Row,
  Col,
  InputRef,
  Divider,
  Typography,
  Space,
  Tag,
  Tooltip,
  Modal,
  Tabs,
  InputNumber
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  DeleteOutlined,
  BarcodeOutlined,
  PlusOutlined,
  SearchOutlined
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useApiQuery, usePaginatedQuery, useApiMutation } from "@/hooks/useApi";
import { invoiceService } from "@/services/invoiceService";
import { clientService } from "@/services/clientService";
import { CreateInvoiceRequest, UpdateInvoiceRequest, Client } from "@/types";
import {
  formatCurrency,
  formatNumber,
  getInvoiceStatus,
  inputNumberFormatter,
  inputNumberParser,
} from "@/utils";
import {
  printInvoice,
  InvoiceExportData
} from "@/utils/exportUtils";
import LoadingSpinner from "@/components/LoadingSpinner";
import { finishedProductService } from "@/services/finishedProductService";
import { accountService } from "@/services/accountService";

const { Option } = Select;
const { Text, Title } = Typography;

type RegionConfig = {
  value: string;
  label: string;
  keywords: string[];
};

const REGION_CONFIGS: RegionConfig[] = [
  { value: "ANDIJON", label: "Andijon", keywords: ["andijon"] },
  { value: "BUXORO", label: "Buxoro", keywords: ["buxoro", "bukhara"] },
  { value: "FARGONA", label: "Farg'ona", keywords: ["farg'ona", "fargona", "fergana"] },
  { value: "JIZZAX", label: "Jizzax", keywords: ["jizzax", "djizzak"] },
  { value: "NAMANGAN", label: "Namangan", keywords: ["namangan"] },
  { value: "NAVOIY", label: "Navoiy", keywords: ["navoiy", "navoi", "navoiy"] },
  { value: "QASHQADARYO", label: "Qashqadaryo", keywords: ["qashqadaryo", "qashqa"] },
  { value: "QORAQALPOGISTON", label: "Qoraqalpog'iston", keywords: ["qoraqalpoq", "karakalpak"] },
  { value: "SAMARQAND", label: "Samarqand", keywords: ["samarqand", "samarkand"] },
  { value: "SIRDARYO", label: "Sirdaryo", keywords: ["sirdaryo", "syrdarya"] },
  { value: "SURXONDARYO", label: "Surxondaryo", keywords: ["surxondaryo", "surkhandarya"] },
  { value: "TOSHKENT", label: "Toshkent viloyati", keywords: ["toshkent viloyati"] },
  { value: "TOSHKENT_SH", label: "Toshkent shahri", keywords: ["toshkent shahri", "toshkent sh", "tashkent"] },
  { value: "XORAZM", label: "Xorazm", keywords: ["xorazm", "khorezm"] },
];

const getClientRegion = (client: Client) => {
  const address = (client.address || "").toLowerCase();
  for (const region of REGION_CONFIGS) {
    if (region.keywords.some((k) => address.includes(k))) {
      return region.value;
    }
  }
  return null;
};

const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const scanInputRef = useRef<InputRef>(null);
  const [loading, setLoading] = useState(false);
  const currency = 'USD'; // USD only
  const rates = { USD: 1 };

  // Stock selection modal state
  const [isStockModalVisible, setIsStockModalVisible] = useState(false);
  const [stockSelectedRowKeys, setStockSelectedRowKeys] = useState<React.Key[]>([]);
  const [stockSelectedRows, setStockSelectedRows] = useState<any[]>([]);
  const [stockParams, setStockParams] = useState({
    page: 1,
    limit: 50,
    search: "",
    productName: "",
    color: "",
  });

  // Manual product modal state
  const [isManualProductModalVisible, setIsManualProductModalVisible] = useState(false);
  const [manualProductForm] = Form.useForm();

  const handleAddManualProduct = async () => {
    try {
      const values = await manualProductForm.validateFields();
      const currentItems = form.getFieldValue("items") || [];

      const newItem = {
        key: Date.now().toString(), // Unique key for Ant Design table
        isManual: true,
        productName: values.productName,
        colorName: values.colorName,
        colorCode: values.colorCode,
        weightKg: Number(values.weightKg),
        bagsCount: Number(values.bagsCount),
        price: Number(values.price),
        discount: Number(values.discount || 0),
        // Manual items don't have batch codes or batch details
        batchCode: "",
        batchCodes: [],
        batches: [],
      };

      const updatedItems = [...currentItems, newItem];
      form.setFieldsValue({ items: updatedItems });
      messageApi.success(`${newItem.productName} qo'lda qo'shildi`);
      setIsManualProductModalVisible(false);
      manualProductForm.resetFields();
    } catch (error) {
      messageApi.error("Qo'lda mahsulot qo'shishda xatolik yuz berdi");
      console.error("Error adding manual product:", error);
    }
  };

  // Query for stock items
  const { data: stockData, isLoading: isStockLoading } = usePaginatedQuery(
    ["stock-items", stockParams],
    (params) => finishedProductService.getProducts({ ...params, status: "ACTIVE" }),
    {
      ...stockParams,
    },
    {
      enabled: isStockModalVisible,
      keepPreviousData: true
    }
  );

  // Auto select state
  const [autoSelectForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState("1");
  const [selectedProductStats, setSelectedProductStats] = useState<any>(null);
  
  const autoSelectProductName = Form.useWatch('productName', autoSelectForm);
  const autoSelectColor = Form.useWatch('color', autoSelectForm);

  // Query for aggregated stock items for Auto Select
  const { data: aggregatedStockData } = usePaginatedQuery(
    ["aggregated-stock-items"],
    () => finishedProductService.getAggregatedProducts({ limit: 1000, status: "ACTIVE" }),
    { page: 1, limit: 1000 },
    { enabled: isStockModalVisible }
  );

  const autoSelectMutation = useApiMutation(
    (data: any) => finishedProductService.autoSelectProducts(data),
    {
      onSuccess: (response) => {
        if (!response || !response.products) {
             messageApi.error("Mahsulotlarni olishda xatolik yuz berdi");
             return;
        }
        const products = response.products;
        const totalWeight = response.totalWeight;
        const totalBags = response.totalBags;

        const requestedWeight = autoSelectForm.getFieldValue("weightKg");
        const requestedBags = autoSelectForm.getFieldValue("bagsCount");
        const targetType = autoSelectForm.getFieldValue("targetType") || 'weight';

        // Check discrepancy (> 0.5 kg or > 0 bags)
        const diff = targetType === 'weight' ? totalWeight - requestedWeight : totalBags - requestedBags;
        const hasDiscrepancy = Math.abs(diff) > (targetType === 'weight' ? 0.5 : 0);

        Modal.confirm({
            title: "Tanlangan partiyalar",
            width: 500,
            content: (
                <div>
                    <p>So'ralgan: <b>{requestedWeight} kg</b> ({requestedBags} qop)</p>
                    <p>Tanlandi: <b>{totalWeight} kg</b> ({totalBags} qop)</p>
                    {hasDiscrepancy && (
                         <p style={{ color: 'orange' }}>
                             Farq: {diff > 0 ? '+' : ''}{Number(diff).toFixed(1)} {targetType === 'weight' ? 'kg' : 'qop'}
                         </p>
                    )}
                    
                    <div style={{ marginTop: '10px' }}>
                        <strong>Partiyalar ro'yxati ({products.length} ta):</strong>
                        <div style={{ 
                            maxHeight: '200px', 
                            overflowY: 'auto', 
                            marginTop: '5px', 
                            background: '#f5f5f5', 
                            padding: '8px', 
                            borderRadius: '4px',
                            border: '1px solid #d9d9d9'
                        }}>
                            <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                {products.map((p: any) => (
                                    <li key={p._id} style={{ marginBottom: '4px' }}>
                                        <Text code>{p.batch}</Text> - <b>{p.weightKg}kg</b> / <b>{Number(p.bagsCount).toFixed(1)}qop</b>
                                        {p.isPartial && (
                                            <Tag color="orange" style={{ marginLeft: 5 }}>
                                                Qisman (Aslida: {p.originalWeight}kg / {p.originalBags}qop)
                                            </Tag>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    
                    <p style={{ marginTop: '15px' }}>Ushbu partiyalarni fakturaga qo'shishni tasdiqlaysizmi?</p>
                </div>
            ),
            okText: "Ha, qo'shish",
            cancelText: "Bekor qilish",
            onOk: () => addAutoSelectedItems(products)
        });
      },
      onError: (error: any) => {
          messageApi.error(error?.response?.data?.message || "Xatolik yuz berdi");
      }
    }
  );

  const addAutoSelectedItems = (products: any[]) => {
        if (products && products.length > 0) {
            const currentItems = form.getFieldValue("items") || [];
            let updatedItems = [...currentItems];
            let addedCount = 0;

            products.forEach((stockItem: any) => {
                 const scannedItem = {
                    batchCode: stockItem.batch,
                    productName: stockItem.productName,
                    colorName: stockItem.color,
                    colorCode: stockItem.colorCode,
                    weightKg: stockItem.weightKg,
                    bagsCount: stockItem.bagsCount,
                    // Store batch info for tracking
                    batches: [{
                        batch: stockItem.batch,
                        weight: stockItem.weightKg,
                        bags: stockItem.bagsCount
                    }]
                };
                
                const existingItemIndex = updatedItems.findIndex((item: any) => 
                    item.productName === scannedItem.productName && 
                    item.colorCode === scannedItem.colorCode &&
                    item.price === (item.price || 0)
                );

                if (existingItemIndex > -1) {
                    const existingItem = updatedItems[existingItemIndex];
                    if (!existingItem.batchCodes) existingItem.batchCodes = [];
                    if (!existingItem.batches) existingItem.batches = [];
                    
                    if (scannedItem.batchCode && !existingItem.batchCodes.includes(scannedItem.batchCode)) {
                        const updatedItem = { ...existingItem };
                        updatedItem.weightKg = Number(updatedItem.weightKg) + Number(scannedItem.weightKg);
                        updatedItem.bagsCount = Number(updatedItem.bagsCount) + Number(scannedItem.bagsCount);
                        updatedItem.batchCodes = [...(updatedItem.batchCodes || []), scannedItem.batchCode];
                        updatedItem.batches = [...(updatedItem.batches || []), ...scannedItem.batches];
                        updatedItems[existingItemIndex] = updatedItem;
                        addedCount++;
                    }
                } else {
                     const newItem = {
                        batchCode: scannedItem.batchCode,
                        batchCodes: [scannedItem.batchCode],
                        productName: scannedItem.productName,
                        colorName: scannedItem.colorName,
                        colorCode: scannedItem.colorCode,
                        weightKg: scannedItem.weightKg,
                        bagsCount: scannedItem.bagsCount,
                        price: 0,
                        discount: 0,
                        batches: scannedItem.batches
                    };
                    updatedItems.push(newItem);
                    addedCount++;
                }
            });
            
            if (addedCount > 0) {
                form.setFieldsValue({ items: updatedItems });
                messageApi.success(`${addedCount} ta mahsulot qo'shildi`);
                setIsStockModalVisible(false);
                autoSelectForm.resetFields();
                setSelectedProductStats(null);
                setAutoCalcInfo("");
            } else {
                messageApi.info("Tanlangan mahsulotlar allaqachon ro'yxatda mavjud");
            }
        }
  };

  const [autoCalcInfo, setAutoCalcInfo] = useState<string>("");

  const handleAutoCalc = (changedValues: any, allValues: any) => {
       if (!selectedProductStats) return;
       
       const avgWeight = selectedProductStats.bagsCount > 0 ? selectedProductStats.weightKg / selectedProductStats.bagsCount : 0;
       
       if (avgWeight === 0) return;

       if ('weightKg' in changedValues) {
           const val = Number(changedValues.weightKg);
           const exactBags = val / avgWeight;
           const roundedBags = Math.round(exactBags);
           
           autoSelectForm.setFieldsValue({ bagsCount: roundedBags });
           setAutoCalcInfo(`${val} kg ≈ ${exactBags.toFixed(1)} qop (O'rtacha ${avgWeight.toFixed(1)} kg dan)`);
       } else if ('bagsCount' in changedValues) {
           const val = Number(changedValues.bagsCount);
           const weight = Math.round(val * avgWeight * 100) / 100;
           autoSelectForm.setFieldsValue({ weightKg: weight });
           setAutoCalcInfo(`${val} qop ≈ ${weight} kg (O'rtacha ${avgWeight.toFixed(1)} kg dan)`);
       }
  };

  const handleAutoSelectSubmit = async () => {
      try {
          const values = await autoSelectForm.validateFields();
          autoSelectMutation.mutate({
              ...values,
              targetAmount: values.weightKg,
              targetType: 'weight'
          });
      } catch (err) {
          // Validation error
      }
  };

  // USD only - no conversion needed
  const convertToUzs = (amount: number) => Math.round(amount);
  const convertToUzsByCurrency = (amount: number, _cur: string) => Math.round(amount);
  const convertValue = (amount: number, _from: string, _to: string) => amount;

  // Query for clients
  const { data: clientsData } = useApiQuery(
    ["clients-all"],
    () => clientService.getAll({ page: 1, limit: 1000 })
  );

  // Query for accounts
  const { data: accountsData } = useApiQuery(
    ["accounts-list"],
    () => accountService.getAllAccounts()
  );

  // Watch form values for calculations
  const items = Form.useWatch("items", form) || [];
  const discountPercent = Form.useWatch("discountPercent", form) || 0;
  const payments = Form.useWatch("payments", form) || [];
  const initialPayment = (payments || []).reduce((sum: number, p: any) => {
    const amount = Number(p?.amount || 0);
    if (!amount) return sum;
    const fromCurrency = p?.currency || "USD";
    if (fromCurrency === "USD") {
      return sum + amount;
    }
    // For UZS/other currencies, convert using the provided rate
    const rate = Number(p?.rate || 1);
    return sum + (rate > 0 ? amount / rate : 0);
  }, 0);
  const selectedRegion = Form.useWatch("clientRegion", form);
  const selectedClientId = Form.useWatch("clientId", form);

  const filteredClients =
    (clientsData?.data || []).filter((client: Client) => {
      if (!selectedRegion || selectedRegion === "ALL") {
        return true;
      }
      return getClientRegion(client) === selectedRegion;
    });

  // Find selected client
  const selectedClient = (clientsData?.data || [])?.find(
    (client: any) => client._id === selectedClientId
  );

  // Calculate totals live
  const grossTotal = items.reduce((sum: number, item: any) => {
    return sum + (Number(item?.price || 0) * Number(item?.weightKg || 0));
  }, 0);
  
  const discountTotal = (grossTotal * discountPercent) / 100;
  const netTotal = grossTotal - discountTotal;
  const currentDebt = Math.max(0, netTotal - initialPayment);
  const totalDebt = convertValue(selectedClient?.currentDebt || 0, 'UZS') + currentDebt;

  // Fetch invoice if editing
  useEffect(() => {
    if (id) {
      setLoading(true);
      invoiceService.getInvoiceById(id)
        .then((response) => {
          if (response.success && response.data?.invoice) {
            const invoice = response.data.invoice;
            
            // Convert items to current currency
            const formattedItems = invoice.items.map((item: any) => ({
                ...item,
                price: convertValue(item.price || 0, 'UZS'),
                discount: convertValue(item.discount || 0, 'UZS'),
                total: convertValue(item.total || 0, 'UZS')
            }));

            form.setFieldsValue({
              clientId: invoice.clientId,
              items: formattedItems,
              discountPercent: invoice.discountPercent || 0,
              note: invoice.note,
              driverName: invoice.driver,
              carNumber: invoice.carNumber,
              handedBy: invoice.handedBy,
              initialPayment: convertValue(invoice.paid || 0, 'UZS')
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id, form]);

  // Focus scan input on mount
  useEffect(() => {
    setTimeout(() => scanInputRef.current?.focus(), 500);
  }, []);

  // Create invoice mutation
  const createInvoiceMutation = useApiMutation(
    (data: CreateInvoiceRequest) => invoiceService.createInvoice(data),
    {
      successMessage: "Faktura muvaffaqiyatli yaratildi",
      invalidateQueries: ["invoices"],
      onSuccess: (data: any) => {
        if (data?.data?.invoice) {
          const invoice = data.data.invoice;
          
          // Helper to convert from UZS back to selected currency for display
          const toCurrency = (val: number) => val / rates[currency];

          const exportData: InvoiceExportData = {
            invoiceNumber: invoice.invoiceNo,
            customerName: invoice.clientMeta.name,
            date: invoice.createdAt,
            totalAmount: toCurrency(invoice.netTotal),
            paidAmount: toCurrency(invoice.paid),
            remainingAmount: toCurrency(invoice.balance),
            status: getInvoiceStatus(invoice.paid, invoice.netTotal).status,
            driverName: invoice.driver,
            carNumber: invoice.carNumber,
            submitterName: invoice.handedBy,
            note: invoice.note,
            items: invoice.items.map((item: any) => ({
              productName: item.productName,
              colorName: item.colorName,
              colorCode: item.colorCode,
              bagsCount: item.bagsCount,
              weightKg: item.weightKg,
              quantity: item.count,
              price: toCurrency(item.price),
              total: toCurrency(item.total)
            }))
          };

          printInvoice(exportData);
          navigate("/invoices");
        } else {
          navigate("/invoices");
        }
      },
    }
  );

  // Update invoice mutation
  const updateInvoiceMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateInvoiceRequest }) =>
      invoiceService.updateInvoice(id, data),
    {
      successMessage: "Faktura muvaffaqiyatli yangilandi",
      invalidateQueries: ["invoices"],
      onSuccess: () => {
        navigate("/invoices");
      },
    }
  );

  // Scan batch mutation
  const scanBatchMutation = useApiMutation(
    (batchCode: string) => invoiceService.scanBatch(batchCode),
    {
        onError: (error: any) => {
            console.error("Scan mutation error:", error);
            const errorMessage = error?.response?.data?.message || "Partiya topilmadi yoki xatolik yuz berdi";
            messageApi.error(errorMessage);
            if (scanInputRef.current && scanInputRef.current.input) {
                scanInputRef.current.input.value = "";
            }
            setTimeout(() => scanInputRef.current?.focus(), 100);
        }
    }
  );

  // Handle stock selection submit
  const handleStockSubmit = () => {
    if (stockSelectedRows.length === 0) {
      messageApi.warning("Mahsulot tanlanmadi");
      return;
    }

    const currentItems = form.getFieldValue("items") || [];
    let updatedItems = [...currentItems];
    let addedCount = 0;

    stockSelectedRows.forEach((stockItem) => {
        // Prepare item object similar to scan result
        const scannedItem = {
            batchCode: stockItem.batch,
            productName: stockItem.productName,
            colorName: stockItem.color,
            colorCode: stockItem.colorCode,
            weightKg: stockItem.weightKg,
            bagsCount: stockItem.bagsCount,
            batches: [{
                batch: stockItem.batch,
                weight: stockItem.weightKg,
                bags: stockItem.bagsCount
            }]
        };

        const existingItemIndex = updatedItems.findIndex((item: any) => 
            item.productName === scannedItem.productName && 
            item.colorCode === scannedItem.colorCode &&
            item.price === (item.price || 0)
        );

        if (existingItemIndex > -1) {
            const existingItem = updatedItems[existingItemIndex];
            
            // Add batch code to list if not present
            if (!existingItem.batchCodes) existingItem.batchCodes = [];
            if (!existingItem.batches) existingItem.batches = [];
            
            if (scannedItem.batchCode && !existingItem.batchCodes.includes(scannedItem.batchCode)) {
                // Create new object for immutability
                const updatedItem = { ...existingItem };
                updatedItem.weightKg = Number(updatedItem.weightKg) + Number(scannedItem.weightKg);
                updatedItem.bagsCount = Number(updatedItem.bagsCount) + Number(scannedItem.bagsCount);
                updatedItem.batchCodes = [...(updatedItem.batchCodes || []), scannedItem.batchCode];
                updatedItem.batches = [...(updatedItem.batches || []), ...scannedItem.batches];
                
                updatedItems[existingItemIndex] = updatedItem;
                addedCount++;
            }
        } else {
             // Add new item
             const newItem = {
                batchCode: scannedItem.batchCode,
                batchCodes: [scannedItem.batchCode],
                productName: scannedItem.productName,
                colorName: scannedItem.colorName,
                colorCode: scannedItem.colorCode,
                weightKg: scannedItem.weightKg,
                bagsCount: scannedItem.bagsCount,
                price: 0,
                discount: 0,
                batches: scannedItem.batches
            };
            updatedItems.push(newItem);
            addedCount++;
        }
    });

    if (addedCount > 0) {
        form.setFieldsValue({ items: updatedItems });
        messageApi.success(`${addedCount} ta mahsulot qo'shildi`);
    } else {
        messageApi.info("Tanlangan mahsulotlar allaqachon ro'yxatda mavjud");
    }
    
    // Reset selection and close modal
    setStockSelectedRowKeys([]);
    setStockSelectedRows([]);
    setIsStockModalVisible(false);
  };

  // Handle scan
  const handleScan = async (e?: React.KeyboardEvent<HTMLInputElement>) => {
    // Get value from event or ref
    const batchCode = e?.currentTarget?.value?.trim() || scanInputRef.current?.input?.value?.trim();
    
    if (!batchCode) {
        if (!e) {
            messageApi.warning("Partiya kodini kiriting");
            scanInputRef.current?.focus();
        }
        return;
    }

    try {
        const data = await scanBatchMutation.mutateAsync(batchCode);
        
        if (data?.items?.length > 0) {
            const rawItem = data.items[0];
            const scannedItem = {
                ...rawItem,
                batchCode: rawItem.batch || rawItem.batchCode, // Fix for property name
                batches: [{
                    batch: rawItem.batch || rawItem.batchCode,
                    weight: rawItem.weightKg,
                    bags: rawItem.bagsCount
                }]
            };
            
            const currentItems = form.getFieldValue("items") || [];
            
            // Check if item already exists (merge logic)
            const existingItemIndex = currentItems.findIndex((item: any) => 
                item.productName === scannedItem.productName && 
                item.colorCode === scannedItem.colorCode &&
                item.price === (item.price || 0)
            );

            if (existingItemIndex > -1) {
                const updatedItems = [...currentItems];
                const existingItem = updatedItems[existingItemIndex];
                
                // Add batch code to list if not present
                if (!existingItem.batchCodes) existingItem.batchCodes = [];
                if (!existingItem.batches) existingItem.batches = [];

                if (scannedItem.batchCode && existingItem.batchCodes.includes(scannedItem.batchCode)) {
                    messageApi.warning("Bu mahsulot allaqachon qo'shilgan!");
                } else {
                    // Create new object for immutability
                    const updatedItem = { ...existingItem };
                    updatedItem.weightKg = Number(updatedItem.weightKg) + Number(scannedItem.weightKg);
                    updatedItem.bagsCount = Number(updatedItem.bagsCount) + Number(scannedItem.bagsCount);
                    
                    if (scannedItem.batchCode) {
                        updatedItem.batchCodes = [...(updatedItem.batchCodes || []), scannedItem.batchCode];
                        updatedItem.batches = [...(updatedItem.batches || []), ...scannedItem.batches];
                    }
                    
                    updatedItems[existingItemIndex] = updatedItem;
                    form.setFieldsValue({ items: updatedItems });
                    messageApi.success(`${scannedItem.productName} miqdori oshirildi`);
                }
            } else {
                // Add new item
                const newItem = {
                    batchCode: scannedItem.batchCode,
                    batchCodes: [scannedItem.batchCode],
                    productName: scannedItem.productName,
                    colorName: scannedItem.colorName,
                    colorCode: scannedItem.colorCode,
                    weightKg: scannedItem.weightKg,
                    bagsCount: scannedItem.bagsCount,
                    price: 0,
                    discount: 0,
                    batches: scannedItem.batches
                };
                const newItemsList = [...currentItems, newItem];
                form.setFieldsValue({ items: newItemsList });
                messageApi.success(`${scannedItem.productName} qo'shildi`);
            }
            
            // Clear input
            if (scanInputRef.current) {
                if (scanInputRef.current.input) {
                    scanInputRef.current.input.value = "";
                }
                const inputElement = scanInputRef.current.input;
                if (inputElement) {
                   inputElement.value = "";
                }
            }
            // Fallback: if event was passed, clear it too
            if (e && e.currentTarget) {
                e.currentTarget.value = "";
            }
        }
    } catch (error) {
        // Error handled in mutation
    }
  };

  // Handle form submit
  const handleSubmit = async (values: any) => {
    const selectedClient = clientsData?.data?.find(
      (client: any) => client._id === values.clientId
    );

    if (!selectedClient) {
      messageApi.error("Iltimos, mijozni tanlang!");
      return;
    }

    const items = values.items || [];
    if (items.length === 0) {
        messageApi.error("Kamida bitta mahsulot qo'shing!");
        return;
    }

    const grossTotal = items.reduce((sum: number, item: any) => {
      const itemTotal = (item.price || 0) * (item.weightKg || 0);
      const discount = (item.discount || 0);
      return sum + itemTotal - discount;
    }, 0);

    const discountTotal = (grossTotal * (values.discountPercent || 0)) / 100;
    const netTotal = grossTotal - discountTotal;

    const paymentsForm = (values.payments || []).filter(
      (p: any) => p.accountId && Number(p.amount || 0) > 0
    );

    // Calculate total payment in USD (invoice currency)
    const totalPaymentInUSD = paymentsForm.reduce(
      (sum: number, p: any) => {
        const amount = Number(p.amount || 0);
        if (!amount) return sum;
        const fromCurrency = p.currency || "USD";
        if (fromCurrency === "USD") {
          return sum + amount;
        }
        // For UZS, convert using the provided rate
        const rate = Number(p.rate || 1);
        return sum + (rate > 0 ? amount / rate : 0);
      },
      0
    );

    if (totalPaymentInUSD > netTotal + 0.0001) {
      messageApi.error(
        "To'lovlar yig'indisi faktura yakuniy summasidan oshmasligi kerak"
      );
      return;
    }

    if (!selectedClient) {
      messageApi.error("Iltimos, mijozni tanlang");
      return;
    }

    // Calculate total paid in USD for storage
    const totalPaidUSD = totalPaymentInUSD;

    const invoiceData = {
      clientId: values.clientId,
      clientMeta: {
        name: selectedClient.name || "",
        phone: selectedClient.phone || "",
      },
      driver: values.driverName,
      carNumber: values.carNumber,
      handedBy: values.handedBy,
      initialPayment: totalPaidUSD,
      accountId: paymentsForm[0]?.accountId,
      payments: (paymentsForm || [])
        .filter((p: any) => Number(p.amount || 0) > 0)
        .map((p: any) => {
          const amount = Number(p.amount || 0);
          const fromCurrency = p.currency || "USD";
          const rate = Number(p.rate || 1);
          const usdAmount = fromCurrency === "USD" ? amount : (rate > 0 ? amount / rate : 0);

          return {
            accountId: p.accountId,
            currency: fromCurrency,
            amount: amount, // Original amount in original currency
            rate: rate,
            amountUSD: usdAmount, // USD equivalent
          };
        }),
      currency,
      currencyRate: rates[currency],
      items: items.map((item: any) => ({
        batchCode: item.batchCode || "",
        batchCodes: item.batchCodes || [],
        batches: item.batches || [],
        isManual: item.isManual || false, // NEW: Pass isManual flag
        productName: item.productName || "",
        colorName: item.colorName || "",
        colorCode: item.colorCode || "",
        weightKg: Number(item.weightKg || 0),
        bagsCount: Number(item.bagsCount || 0),
        price: Number(item.price || 0),
        discount: Number(item.discount || 0),
      })),
      discountPercent: Number(values.discountPercent || 0),
      discountTotal: discountTotal,
      grossTotal: grossTotal,
      netTotal: netTotal,
      note: values.note,
      paid: totalPaidUSD,
      balance: netTotal - totalPaidUSD,
    };

    if (id) {
      await updateInvoiceMutation.mutateAsync({
        id: id,
        data: invoiceData,
      });
    } else {
      await createInvoiceMutation.mutateAsync(invoiceData);
    }
  };

  if (loading) {
      return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
        {contextHolder}

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate("/invoices")}
                />
                <Title level={4} style={{ margin: 0 }}>
                    {id ? "Tahrirlash" : "Yangi faktura"}
                </Title>
            </div>
            <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={form.submit}
                loading={createInvoiceMutation.isLoading || updateInvoiceMutation.isLoading}
            >
                {id ? "Saqlash" : "Yaratish"}
            </Button>
        </div>

        <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleSubmit} 
            initialValues={{ discountPercent: 0, items: [] }}
        >
            <Card className="shadow-sm">
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={8}>
                        <Form.Item name="clientRegion" label="Viloyat">
                            <Select 
                                placeholder="Viloyatni tanlang" 
                                allowClear
                                size="large"
                            >
                                <Option value="ALL">Barcha viloyatlar</Option>
                                {REGION_CONFIGS.map((region) => (
                                    <Option key={region.value} value={region.value}>{region.label}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Form.Item name="clientId" label="Mijoz" rules={[{ required: true, message: "Mijozni tanlang" }]}>
                            <Select 
                                placeholder="Mijozni tanlang" 
                                showSearch 
                                size="large"
                                filterOption={(input, option) => {
                                    if (!option || option.children === undefined || option.children === null) {
                                        return false;
                                    }
                                    const childrenText = String(option.children).toLowerCase();
                                    return childrenText.includes(input.toLowerCase());
                                }}
                            >
                                {filteredClients.map((client: any) => (
                                    <Option key={client._id} value={client._id}>{client.name} ({client.phone})</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Form.Item name="driverName" label="Haydovchi ismi">
                            <Input placeholder="Haydovchi ismini kiriting" size="large" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Form.Item name="carNumber" label="Avtomobil raqami">
                            <Input placeholder="Avtomobil raqamini kiriting" size="large" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Form.Item name="handedBy" label="Topshirgan odam (F.I.SH)">
                            <Input placeholder="Topshiruvchi ismini kiriting" size="large" />
                        </Form.Item>
                    </Col>
                    {/* Hisob-kitob summary */}
                    <Col xs={24}>
                        <div style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            padding: "12px",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            borderRadius: 8,
                            color: "#fff",
                            marginBottom: 8
                        }}>
                            <div style={{ flex: "1 1 100px", textAlign: "center", padding: "4px 8px" }}>
                                <div style={{ fontSize: 11, opacity: 0.8 }}>Jami</div>
                                <div style={{ fontSize: 18, fontWeight: "bold" }}>${formatNumber(grossTotal, 2)}</div>
                            </div>
                            <div style={{ flex: "1 1 100px", textAlign: "center", padding: "4px 8px" }}>
                                <div style={{ fontSize: 11, opacity: 0.8 }}>Chegirma</div>
                                <div style={{ fontSize: 18, fontWeight: "bold" }}>-${formatNumber(discountTotal, 2)}</div>
                            </div>
                            <div style={{ flex: "1 1 100px", textAlign: "center", padding: "4px 8px", background: "rgba(255,255,255,0.2)", borderRadius: 6 }}>
                                <div style={{ fontSize: 11, opacity: 0.8 }}>Yakuniy</div>
                                <div style={{ fontSize: 20, fontWeight: "bold" }}>${formatNumber(netTotal, 2)}</div>
                            </div>
                            <div style={{ flex: "1 1 100px", textAlign: "center", padding: "4px 8px" }}>
                                <div style={{ fontSize: 11, opacity: 0.8 }}>To'langan</div>
                                <div style={{ fontSize: 18, fontWeight: "bold", color: "#90EE90" }}>${formatNumber(initialPayment, 2)}</div>
                            </div>
                            <div style={{ flex: "1 1 100px", textAlign: "center", padding: "4px 8px", background: currentDebt > 0 ? "rgba(255,0,0,0.3)" : "rgba(0,255,0,0.3)", borderRadius: 6 }}>
                                <div style={{ fontSize: 11, opacity: 0.8 }}>Qarz</div>
                                <div style={{ fontSize: 20, fontWeight: "bold" }}>${formatNumber(currentDebt, 2)}</div>
                            </div>
                        </div>
                    </Col>

                    {/* To'lovlar */}
                    <Col xs={24}>
                        <Card
                            size="small"
                            title="💰 To'lovlar"
                            style={{ background: "#fafafa" }}
                        >
                            <Form.List name="payments">
                                {(fields, { add, remove }) => (
                                    <div>
                                        {fields.length === 0 && (
                                            <div style={{ textAlign: "center", padding: "16px 0", color: "#999" }}>
                                                To'lov qo'shilmagan
                                            </div>
                                        )}
                                        {fields.map((field, index) => {
                                            const currentPayments = form.getFieldValue("payments") || [];
                                            const payment = currentPayments[field.name] || {};
                                            const paymentCurrency = payment.currency || "USD";
                                            const paymentRate = payment.rate || 12500;
                                            const paymentAmount = payment.amount || 0;
                                            const usdEquivalent = paymentCurrency === "UZS" && paymentRate > 0
                                                ? paymentAmount / paymentRate
                                                : paymentAmount;

                                            return (
                                                <div
                                                    key={field.key}
                                                    style={{
                                                        marginBottom: 12,
                                                        padding: 12,
                                                        background: "#fff",
                                                        borderRadius: 8,
                                                        border: "1px solid #e8e8e8",
                                                    }}
                                                >
                                                    {/* Row 1: Currency + Account + Delete */}
                                                    <Row gutter={8} align="middle" style={{ marginBottom: 8 }}>
                                                        <Col xs={6}>
                                                            <Form.Item
                                                                name={[field.name, "currency"]}
                                                                style={{ marginBottom: 0 }}
                                                            >
                                                                <Select
                                                                    size="large"
                                                                    onChange={(val) => {
                                                                        const payments = form.getFieldValue("payments");
                                                                        // Clear account when currency changes
                                                                        payments[field.name].accountId = undefined;
                                                                        if (val === "UZS") {
                                                                            payments[field.name].rate = 12500;
                                                                        }
                                                                        form.setFieldsValue({ payments });
                                                                    }}
                                                                >
                                                                    <Option value="USD">USD</Option>
                                                                    <Option value="UZS">UZS</Option>
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                        <Col flex="auto">
                                                            <Form.Item
                                                                name={[field.name, "accountId"]}
                                                                style={{ marginBottom: 0 }}
                                                                rules={[{ required: true, message: "Hisob tanlang" }]}
                                                            >
                                                                <Select
                                                                    placeholder={`${paymentCurrency} hisob tanlang`}
                                                                    size="large"
                                                                    showSearch
                                                                    optionFilterProp="children"
                                                                >
                                                                    {(accountsData || [])
                                                                        ?.filter((account: any) => account.currency === paymentCurrency)
                                                                        ?.map((account: any) => (
                                                                            <Option key={account._id} value={account._id}>
                                                                                {account.name} ({formatNumber(account.currentBalance)})
                                                                            </Option>
                                                                        ))}
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                        <Col>
                                                            <Button
                                                                type="text"
                                                                danger
                                                                icon={<DeleteOutlined />}
                                                                onClick={() => remove(field.name)}
                                                                size="large"
                                                            />
                                                        </Col>
                                                    </Row>

                                                    {/* Row 2: Amount */}
                                                    {paymentCurrency === "USD" ? (
                                                        <Form.Item
                                                            name={[field.name, "amount"]}
                                                            style={{ marginBottom: 0 }}
                                                            rules={[{ required: true, message: "Summa kiriting" }]}
                                                        >
                                                            <InputNumber
                                                                min={0}
                                                                style={{ width: "100%" }}
                                                                size="large"
                                                                formatter={inputNumberFormatter}
                                                                parser={inputNumberParser}
                                                                placeholder="USD summa"
                                                                prefix="$"
                                                            />
                                                        </Form.Item>
                                                    ) : (
                                                        <Row gutter={8}>
                                                            <Col xs={10}>
                                                                <Form.Item
                                                                    name={[field.name, "rate"]}
                                                                    style={{ marginBottom: 0 }}
                                                                    rules={[{ required: true, message: "Kurs" }]}
                                                                >
                                                                    <InputNumber
                                                                        min={1}
                                                                        style={{ width: "100%" }}
                                                                        size="large"
                                                                        formatter={inputNumberFormatter}
                                                                        parser={inputNumberParser}
                                                                        addonBefore="Kurs"
                                                                    />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col xs={14}>
                                                                <Form.Item
                                                                    name={[field.name, "amount"]}
                                                                    style={{ marginBottom: 0 }}
                                                                    rules={[{ required: true, message: "Summa" }]}
                                                                >
                                                                    <InputNumber
                                                                        min={0}
                                                                        style={{ width: "100%" }}
                                                                        size="large"
                                                                        formatter={inputNumberFormatter}
                                                                        parser={inputNumberParser}
                                                                        addonAfter="so'm"
                                                                    />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col xs={24}>
                                                                <div style={{ marginTop: 4, fontSize: 13, color: "#52c41a" }}>
                                                                    = <strong>${formatNumber(usdEquivalent, 2)}</strong> USD
                                                                </div>
                                                            </Col>
                                                        </Row>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        <Button
                                            type="dashed"
                                            onClick={() => add({ currency: "USD", rate: 12500, amount: 0 })}
                                            block
                                            icon={<PlusOutlined />}
                                            size="large"
                                        >
                                            To'lov qo'shish
                                        </Button>
                                    </div>
                                )}
                            </Form.List>
                        </Card>
                    </Col>
                    <Col xs={24}>
                        <Card size="small" title="📦 Mahsulot qo'shish" style={{ background: "#f0f5ff" }}>
                            <Row gutter={[8, 8]}>
                                <Col xs={24} md={8}>
                                    <Input
                                        ref={scanInputRef}
                                        style={{ width: '100%' }}
                                        placeholder="Shtrix kodni skanerlang yoki kiriting"
                                        prefix={<BarcodeOutlined />}
                                        onPressEnter={handleScan}
                                        autoComplete="off"
                                        size="large"
                                    />
                                </Col>
                                <Col xs={12} md={4}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<PlusOutlined />}
                                        onClick={() => handleScan()}
                                        block
                                    >
                                        Qo'shish
                                    </Button>
                                </Col>
                                <Col xs={12} md={6}>
                                    <Button
                                        type="default"
                                        size="large"
                                        icon={<SearchOutlined />}
                                        onClick={() => setIsStockModalVisible(true)}
                                        block
                                    >
                                        Ombor
                                    </Button>
                                </Col>
                                <Col xs={12} md={6}>
                                    <Button
                                        type="default"
                                        size="large"
                                        icon={<PlusOutlined />}
                                        onClick={() => setIsManualProductModalVisible(true)}
                                        block
                                    >
                                        Qo'lda
                                    </Button>
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                </Row>
            </Card>

            <Card className="mt-4 shadow-sm" title="Mahsulotlar ro'yxati">
                <Form.List name="items">
                    {(fields, { remove }) => (
                    <Table
                        dataSource={fields}
                        pagination={false}
                        rowKey="key"
                        size="small"
                        scroll={{ x: 800 }}
                        key={items.length + JSON.stringify(items.map((i: any) => i.weightKg))}
                        summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={5} className="text-right font-bold">Jami:</Table.Summary.Cell>
                                <Table.Summary.Cell index={1} className="font-bold">{formatCurrency(grossTotal)}</Table.Summary.Cell>
                                <Table.Summary.Cell index={2} />
                            </Table.Summary.Row>
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={5} className="text-right font-bold">Chegirma ({discountPercent}%):</Table.Summary.Cell>
                                <Table.Summary.Cell index={1} className="text-red-500 font-bold">-{formatCurrency(discountTotal)}</Table.Summary.Cell>
                                <Table.Summary.Cell index={2} />
                            </Table.Summary.Row>
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={5} className="text-right font-bold text-lg">Yakuniy:</Table.Summary.Cell>
                                <Table.Summary.Cell index={1} className="text-green-600 font-bold text-lg">{formatCurrency(netTotal)}</Table.Summary.Cell>
                                <Table.Summary.Cell index={2} />
                            </Table.Summary.Row>
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={5} className="text-right font-bold">To'langan:</Table.Summary.Cell>
                                <Table.Summary.Cell index={1} className="font-bold">{formatCurrency(initialPayment)}</Table.Summary.Cell>
                                <Table.Summary.Cell index={2} />
                            </Table.Summary.Row>
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={5} className="text-right font-bold text-red-600">Qarz:</Table.Summary.Cell>
                                <Table.Summary.Cell index={1} className="text-red-600 font-bold">{formatCurrency(currentDebt)}</Table.Summary.Cell>
                                <Table.Summary.Cell index={2} />
                            </Table.Summary.Row>
                        </Table.Summary>
                        )}
                        columns={[
                        {
                            title: "Mahsulot",
                            key: "product",
                            render: (_, field) => {
                                const item = form.getFieldValue(["items", field.name]);
                                return (
                                    <div>
                                        <div className="font-medium">
                                          {item.isManual ? `${item.productName} (Qo'lda)` : item.productName}
                                        </div>
                                        <div className="text-xs text-gray-500">{item.colorName} ({item.colorCode})</div>
                                    </div>
                                )
                            }
                        },
                        {
                            title: "Kg",
                            key: "weight",
                            width: 100,
                            render: (_, field) => (
                            <Form.Item name={[field.name, "weightKg"]} noStyle rules={[{ required: true }]}>
                                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                            </Form.Item>
                            ),
                        },
                        {
                            title: "Qop",
                            key: "bags",
                            width: 80,
                            render: (_, field) => (
                            <Form.Item name={[field.name, "bagsCount"]} noStyle rules={[{ required: true }]}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                            ),
                        },
                        {
                            title: "Narx",
                            key: "price",
                            width: 100,
                            render: (_, field) => (
                            <Form.Item name={[field.name, "price"]} noStyle rules={[{ required: true }]}>
                                <InputNumber min={0} step={0.1} style={{ width: '100%' }} prefix="$" />
                            </Form.Item>
                            ),
                        },
                        {
                            title: "Jami",
                            key: "total",
                            width: 100,
                            render: (_, field) => {
                                const item = form.getFieldValue(["items", field.name]);
                                const total = (item.weightKg || 0) * (item.price || 0);
                                return <span className="font-bold">{formatCurrency(total)}</span>;
                            }
                        },
                        {
                            title: "",
                            key: "actions",
                            width: 50,
                            render: (_, field) => (
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                            ),
                        },
                        ]}
                    />
                    )}
                </Form.List>
            </Card>

            <Card className="mt-4 shadow-sm">
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Form.Item name="note" label="Izoh">
                            <Input.TextArea rows={2} placeholder="Qo'shimcha izoh..." />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="discountPercent" label="Chegirma (%)">
                            <InputNumber min={0} max={100} style={{ width: '100%' }} suffix="%" />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

        </Form>

        <Modal
            title="Ombordan mahsulot tanlash"
            open={isStockModalVisible}
            onCancel={() => {
                setIsStockModalVisible(false);
                autoSelectForm.resetFields();
                setSelectedProductStats(null);
            }}
            width={1000}
            footer={null}
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: "1",
                        label: "Qo'lda tanlash",
                        children: (
                            <>
                                <div className="mb-4">
                                    <Row gutter={[16, 16]}>
                                        <Col span={8}>
                                            <Input 
                                                placeholder="Qidiruv..." 
                                                allowClear
                                                value={stockParams.search}
                                                onChange={(e) => setStockParams({ ...stockParams, search: e.target.value, page: 1 })} 
                                            />
                                        </Col>
                                        <Col span={8}>
                                            <Input 
                                                placeholder="Mahsulot nomi" 
                                                allowClear
                                                value={stockParams.productName}
                                                onChange={(e) => setStockParams({ ...stockParams, productName: e.target.value, page: 1 })} 
                                            />
                                        </Col>
                                        <Col span={8}>
                                            <Input 
                                                placeholder="Rangi" 
                                                allowClear
                                                value={stockParams.color}
                                                onChange={(e) => setStockParams({ ...stockParams, color: e.target.value, page: 1 })} 
                                            />
                                        </Col>
                                    </Row>
                                </div>
                                <Table
                                    dataSource={stockData?.data || []}
                                    loading={isStockLoading}
                                    rowKey="_id"
                                    rowSelection={{
                                        selectedRowKeys: stockSelectedRowKeys,
                                        onChange: (keys, rows) => {
                                            setStockSelectedRowKeys(keys);
                                            setStockSelectedRows(rows);
                                        }
                                    }}
                                    pagination={{
                                        current: stockParams.page,
                                        pageSize: stockParams.limit,
                                        total: stockData?.pagination?.total || 0,
                                        onChange: (page, pageSize) => setStockParams({ ...stockParams, page, limit: pageSize }),
                                        showSizeChanger: true
                                    }}
                                    columns={[
                                        { title: "Partiya", dataIndex: "batch" },
                                        { title: "Mahsulot", dataIndex: "productName" },
                                        { title: "Rangi", dataIndex: "color" },
                                        { title: "Kod", dataIndex: "colorCode" },
                                        { title: "Og'irlik", dataIndex: "weightKg", render: (val) => `${val} kg` },
                                        { title: "Qop", dataIndex: "bagsCount" },
                                    ]}
                                    size="small"
                                />
                                <div style={{ textAlign: 'right', marginTop: 16 }}>
                                    <Space>
                                        <Button onClick={() => setIsStockModalVisible(false)}>Bekor qilish</Button>
                                        <Button type="primary" onClick={handleStockSubmit}>Qo'shish</Button>
                                    </Space>
                                </div>
                            </>
                        )
                    },
                    {
                        key: "2",
                        label: "Avtomatik tanlash",
                        children: (
                            <Form
                                form={autoSelectForm}
                                layout="vertical"
                                onValuesChange={handleAutoCalc}
                            >
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item
                                            name="productName"
                                            label="Mahsulot nomi"
                                            rules={[{ required: true, message: "Mahsulot nomini tanlang" }]}
                                        >
                                            <Select
                                                placeholder="Tanlang"
                                                showSearch
                                                optionFilterProp="children"
                                                onChange={() => {
                                                    autoSelectForm.setFieldsValue({ color: undefined, colorCode: undefined });
                                                    setSelectedProductStats(null);
                                                }}
                                            >
                                                {Array.from(new Set(aggregatedStockData?.data?.map((p: any) => p.productName) || [])).map((name: any) => (
                                                    <Option key={name} value={name}>{name}</Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            name="color"
                                            label="Rangi"
                                            rules={[{ required: true, message: "Rangni tanlang" }]}
                                        >
                                            <Select
                                                placeholder="Tanlang"
                                                showSearch
                                                optionFilterProp="children"
                                                disabled={!autoSelectProductName}
                                                onChange={() => {
                                                     autoSelectForm.setFieldsValue({ colorCode: undefined });
                                                     setSelectedProductStats(null);
                                                }}
                                            >
                                                {aggregatedStockData?.data
                                                    ?.filter((p: any) => p.productName === autoSelectProductName)
                                                    .map((p: any) => p.color)
                                                    .filter((v: any, i: any, a: any) => a.indexOf(v) === i)
                                                    .map((color: any) => (
                                                        <Option key={color} value={color}>{color}</Option>
                                                    ))
                                                }
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            name="colorCode"
                                            label="Rang kodi"
                                            rules={[{ required: true, message: "Rang kodini tanlang" }]}
                                        >
                                            <Select
                                                placeholder="Tanlang"
                                                showSearch
                                                optionFilterProp="children"
                                                disabled={!autoSelectColor}
                                                onChange={(val) => {
                                                    const stats = aggregatedStockData?.data?.find((p: any) => 
                                                        p.productName === autoSelectProductName && 
                                                        p.color === autoSelectColor && 
                                                        p.colorCode === val
                                                    );
                                                    setSelectedProductStats(stats);
                                                }}
                                            >
                                                {aggregatedStockData?.data
                                                    ?.filter((p: any) => 
                                                        p.productName === autoSelectProductName &&
                                                        p.color === autoSelectColor
                                                    )
                                                    .map((p: any) => (
                                                        <Option key={p.colorCode} value={p.colorCode}>{p.colorCode}</Option>
                                                    ))
                                                }
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                </Row>

                                {selectedProductStats && (
                                    <div className="mb-4 p-4 bg-blue-50 rounded">
                                        <Text strong>Mavjud:</Text> 
                                        <span className="ml-2">
                                            {selectedProductStats.weightKg} kg / {selectedProductStats.bagsCount} qop
                                            (O'rtacha: {(selectedProductStats.weightKg / selectedProductStats.bagsCount).toFixed(2)} kg/qop)
                                        </span>
                                    </div>
                                )}

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item
                                            name="weightKg"
                                            label="Og'irlik (kg)"
                                            rules={[{ required: true, message: "Kiriting" }]}
                                        >
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                min={0}
                                                max={selectedProductStats?.weightKg}
                                                formatter={inputNumberFormatter}
                                                parser={inputNumberParser}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            name="bagsCount"
                                            label="Qop soni"
                                            rules={[{ required: true, message: "Kiriting" }]}
                                        >
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                min={0}
                                                max={selectedProductStats?.bagsCount}
                                                formatter={inputNumberFormatter}
                                                parser={inputNumberParser}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                {autoCalcInfo && (
                                    <div className="mb-4 text-gray-500 italic text-right">
                                        {autoCalcInfo}
                                    </div>
                                )}

                                <div style={{ textAlign: 'right', marginTop: 16 }}>
                                    <Space>
                                        <Button onClick={() => setIsStockModalVisible(false)}>Bekor qilish</Button>
                                        <Button 
                                            type="primary" 
                                            onClick={handleAutoSelectSubmit}
                                            loading={autoSelectMutation.isLoading}
                                            disabled={!selectedProductStats}
                                        >
                                            Tanlash
                                        </Button>
                                    </Space>
                                </div>
                            </Form>
                        )
                    }
                ]}
            />
        </Modal>

        {/* Manual Product Entry Modal */}
        <Modal
            title="Qo'lda mahsulot qo'shish"
            open={isManualProductModalVisible}
            onCancel={() => {
                setIsManualProductModalVisible(false);
                manualProductForm.resetFields();
            }}
            onOk={handleAddManualProduct}
            confirmLoading={false} // No mutation loading here, pure client-side add
            destroyOnClose
        >
            <Form form={manualProductForm} layout="vertical" initialValues={{ discount: 0 }}>
                <Form.Item
                    name="productName"
                    label="Mahsulot nomi"
                    rules={[{ required: true, message: "Mahsulot nomini kiriting" }]}
                >
                    <Input placeholder="Mahsulot nomi" />
                </Form.Item>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="colorName"
                            label="Rangi"
                            rules={[{ required: true, message: "Rang nomini kiriting" }]}
                        >
                            <Input placeholder="Rangi" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="colorCode"
                            label="Rang kodi"
                            rules={[{ required: true, message: "Rang kodini kiriting" }]}
                        >
                            <Input placeholder="Rang kodi" />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="weightKg"
                            label="Og'irlik (kg)"
                            rules={[{ required: true, message: "Og'irlikni kiriting" }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                step={0.1}
                                formatter={inputNumberFormatter}
                                parser={inputNumberParser}
                                placeholder="Og'irlik"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="bagsCount"
                            label="Qop soni"
                            rules={[{ required: true, message: "Qop sonini kiriting" }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                formatter={inputNumberFormatter}
                                parser={inputNumberParser}
                                placeholder="Qop soni"
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="price"
                            label="Narx ($)"
                            rules={[{ required: true, message: "Narxni kiriting" }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                step={0.1}
                                formatter={inputNumberFormatter}
                                parser={inputNumberParser}
                                placeholder="Narx"
                                prefix="$"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="discount"
                            label="Chegirma ($)"
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                step={0.1}
                                formatter={inputNumberFormatter}
                                parser={inputNumberParser}
                                placeholder="Chegirma"
                                prefix="$"
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    </div>
  );
};

export default CreateInvoicePage;
