import React, { useState, useRef } from "react";
import {
  Card,
  Button,
  Input,
  InputNumber,
  Space,
  Tag,
  Modal,
  message,
  Select,
  Row,
  Col,
  Typography,
  Divider,
  Radio,
  Alert,
  Descriptions,
  List,
  Empty,
  Spin,
  Tooltip,
  Checkbox,
  Table,
  Segmented,
  Form,
} from "antd";
import {
  RollbackOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  ScanOutlined,
  InboxOutlined,
  BarcodeOutlined,
  FileTextOutlined,
  FormOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { returnService, BagSearchResult } from "@/services/returnService";
import { accountService } from "@/services/accountService";
import { clientService } from "@/services/clientService";
import { finishedProductService } from "@/services/finishedProductService";
import { ReturnItem, CreateReturnRequest, CreateManualReturnRequest, Invoice, Client } from "@/types";
import { PrintableBarcode, BarcodeItem } from "@/components/PrintableBarcode";
import { formatDate, formatCurrency, formatNumber, inputNumberFormatter, inputNumberParser } from "@/utils";

const { Search } = Input;
const { Option } = Select;
const { Text, Title, Paragraph } = Typography;

interface ReturnBag extends BagSearchResult {
  id: string;
  condition: 'GOOD' | 'DEFECTIVE';
}

interface InvoiceItem {
  _id?: string;
  batchCode?: string;
  batch?: string;
  productName: string;
  name?: string; // alias for productName
  colorName?: string;
  colorCode?: string;
  weightKg: number;
  bagsCount?: number;
  price: number;
  total?: number;
  discount?: number;
}

type SearchMode = 'bag' | 'invoice' | 'manual';

// Region configurations for client filtering
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
  { value: "NAVOIY", label: "Navoiy", keywords: ["navoiy", "navoi"] },
  { value: "QASHQADARYO", label: "Qashqadaryo", keywords: ["qashqadaryo", "qashqa"] },
  { value: "QORAQALPOGISTON", label: "Qoraqalpog'iston", keywords: ["qoraqalpoq", "karakalpak"] },
  { value: "SAMARQAND", label: "Samarqand", keywords: ["samarqand", "samarkand"] },
  { value: "SIRDARYO", label: "Sirdaryo", keywords: ["sirdaryo", "syrdarya"] },
  { value: "SURXONDARYO", label: "Surxondaryo", keywords: ["surxondaryo", "surkhandarya"] },
  { value: "TOSHKENT", label: "Toshkent viloyati", keywords: ["toshkent viloyati"] },
  { value: "TOSHKENT_SH", label: "Toshkent shahri", keywords: ["toshkent shahri", "toshkent sh", "tashkent"] },
  { value: "XORAZM", label: "Xorazm", keywords: ["xorazm", "khorezm"] },
];

const getClientRegion = (client: Client): string | null => {
  const address = (client.address || "").toLowerCase();
  for (const region of REGION_CONFIGS) {
    if (region.keywords.some((k) => address.includes(k))) {
      return region.value;
    }
  }
  return null;
};

interface ManualItem {
  id: string;
  batchCode: string;
  productName: string;
  colorName: string;
  colorCode: string;
  brutto: number;
  tara: number;
  weightKg: number; // netto = brutto - tara
  bagsCount: number;
  price: number;
  total: number;
  condition: 'GOOD' | 'DEFECTIVE';
}

const ReturnsPage: React.FC = () => {
  const [searchMode, setSearchMode] = useState<SearchMode>('bag');
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [returnBags, setReturnBags] = useState<ReturnBag[]>([]);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [refundMethod, setRefundMethod] = useState<'DEBT_REDUCTION' | 'CASH_REFUND'>('DEBT_REDUCTION');
  const [refundAccountId, setRefundAccountId] = useState<string>('');
  const [refundCurrency, setRefundCurrency] = useState<'USD' | 'UZS'>('USD');
  const [refundRate, setRefundRate] = useState<number>(12500);
  const [note, setNote] = useState('');
  const searchInputRef = useRef<any>(null);

  // Invoice search state
  const [foundInvoice, setFoundInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<string[]>([]);
  const [itemConditions, setItemConditions] = useState<Record<string, 'GOOD' | 'DEFECTIVE'>>({});

  // Manual entry state
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [selectedManualClient, setSelectedManualClient] = useState<Client | null>(null);
  console.log(selectedManualClient);

  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [isAddManualItemModalVisible, setIsAddManualItemModalVisible] = useState(false);
  const [manualItemForm] = Form.useForm();
  const [manualBatchCounter, setManualBatchCounter] = useState(1);
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const barcodePrintRef = useRef<HTMLDivElement>(null);
  const [printingItems, setPrintingItems] = useState<BarcodeItem[]>([]);

  const convert = (amount: number) => amount; // USD only

  const handlePrintBarcode = useReactToPrint({
    content: () => barcodePrintRef.current,
  });

  const handlePrintBarcodeItems = (items: BarcodeItem[]) => {
    if (!items || items.length === 0) return;

    setPrintingItems(items);
    setTimeout(() => {
      handlePrintBarcode();
    }, 100);
  };

  // Get unique invoice info from bags (for bag mode) or from foundInvoice (for invoice mode)
  // Extract clientId string from object if populated
  const getClientId = (clientId: any): string => {
    if (typeof clientId === 'object' && clientId?._id) {
      return clientId._id;
    }
    return clientId || '';
  };
  console.log(foundInvoice);

  const bagInvoice = returnBags.length > 0 ? returnBags[0].invoice : null;
  const invoiceInfo = searchMode === 'bag'
    ? (bagInvoice ? { ...bagInvoice, clientId: getClientId(bagInvoice.clientId) } : null)
    : (foundInvoice ? {
      _id: foundInvoice._id,
      invoiceNo: foundInvoice.invoiceNo,
      createdAt: foundInvoice.createdAt,
      clientId: getClientId(foundInvoice.clientId),
      clientMeta: foundInvoice.clientMeta,
      balance: foundInvoice.clientId?.balance,
      paid: foundInvoice.paid,
      netTotal: foundInvoice.netTotal,
      driver: foundInvoice.driver,
      carNumber: foundInvoice.carNumber,
      handedBy: foundInvoice.handedBy,
      note: foundInvoice.note,
    } : null);

  // Query for accounts (for cash refund)
  const { data: accountsData } = useApiQuery(
    ["accounts"],
    () => accountService.getAllAccounts(),
    { enabled: true }
  );

  // Query for clients (for manual mode)
  const { data: clientsData } = useApiQuery(
    ["clients"],
    () => clientService.getClients({ limit: 100 }),
    { enabled: searchMode === 'manual' }
  );

  const allClients = (clientsData as any)?.clients || (clientsData as any)?.data || [];

  // Query for aggregated finished products (for manual mode - product/color selection)
  const { data: aggregatedProductsData } = useApiQuery(
    ["aggregated-products"],
    () => finishedProductService.getAggregatedProducts({ limit: 1000 }),
    { enabled: searchMode === 'manual' }
  );

  const aggregatedProducts = (aggregatedProductsData as any)?.data || [];

  // Get unique product names
  const uniqueProductNames = [...new Set(aggregatedProducts.map((p: any) => p.productName))] as string[];

  // Get colors for selected product
  const getColorsForProduct = (productName: string) => {
    return aggregatedProducts.filter((p: any) => p.productName === productName);
  };

  // Filter clients by selected region
  const filteredClients = allClients.filter((client: Client) => {
    if (!selectedRegion || selectedRegion === 'ALL') {
      return true;
    }
    return getClientRegion(client) === selectedRegion;
  });

  // Create return mutation
  const createReturnMutation = useApiMutation(
    (data: CreateReturnRequest | CreateManualReturnRequest) => returnService.createReturn(data),
    {
      successMessage: "Qaytarish muvaffaqiyatli amalga oshirildi",
      invalidateQueries: ["returns", "invoices"],
      onSuccess: () => {
        handleReset();
      },
    }
  );

  // Search for bag by batch code
  const handleSearchBag = async () => {
    const searchValue = searchText.trim().toUpperCase();
    if (!searchValue) {
      message.warning("Qop raqamini kiriting");
      return;
    }

    // Check if this bag is already added
    if (returnBags.some(bag => bag.batchCode === searchValue)) {
      message.warning("Bu qop allaqachon ro'yxatga qo'shilgan");
      setSearchText("");
      searchInputRef.current?.focus();
      return;
    }

    setIsSearching(true);
    try {
      const response = await returnService.searchBagByBatchCode(searchValue);

      if (response.success && response.data?.bag) {
        const bag = response.data.bag;

        // Check if bags are from the same invoice
        if (returnBags.length > 0 && returnBags[0].invoice._id !== bag.invoice._id) {
          message.error("Faqat bitta fakturadan qoplarni qaytarish mumkin. Avval ro'yxatni tozalang.");
          setSearchText("");
          searchInputRef.current?.focus();
          return;
        }

        // Add bag to return list
        const newBag: ReturnBag = {
          ...bag,
          id: `${bag.batchCode}-${Date.now()}`,
          condition: 'GOOD',
        };

        setReturnBags(prev => [...prev, newBag]);
        message.success(`"${bag.batchCode}" qopi topildi va qo'shildi`);
        setSearchText("");

        // Set default refund method based on invoice balance
        if (returnBags.length === 0 && bag.invoice.balance > 0) {
          setRefundMethod('DEBT_REDUCTION');
        } else if (returnBags.length === 0) {
          setRefundMethod('CASH_REFUND');
        }

        // Focus back to search input for continuous scanning
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      } else {
        message.error(response.message || "Qop topilmadi");
      }
    } catch (error: any) {
      console.error('Bag search error:', error);
      message.error(error.response?.data?.message || "Qop qidirishda xatolik");
    } finally {
      setIsSearching(false);
    }
  };

  // Search for invoice by number
  const handleSearchInvoice = async () => {
    const searchValue = searchText.trim().toUpperCase();
    if (!searchValue) {
      message.warning("Faktura raqamini kiriting");
      return;
    }

    setIsSearching(true);
    try {
      const response = await returnService.getInvoiceByNumber(searchValue);

      if (response.success && response.data?.invoice) {
        const invoice = response.data.invoice;
        setFoundInvoice(invoice);
        setSelectedInvoiceItems([]);
        setItemConditions({});
        message.success(`Faktura "${invoice.invoiceNo}" topildi`);
        setSearchText("");

        // Set default refund method based on invoice balance
        if (invoice.balance > 0) {
          setRefundMethod('DEBT_REDUCTION');
        } else {
          setRefundMethod('CASH_REFUND');
        }
      } else {
        message.error(response.message || "Faktura topilmadi");
      }
    } catch (error: any) {
      console.error('Invoice search error:', error);
      message.error(error.response?.data?.message || "Faktura qidirishda xatolik");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search based on mode
  const handleSearch = () => {
    if (searchMode === 'bag') {
      handleSearchBag();
    } else {
      handleSearchInvoice();
    }
  };

  // Toggle item selection for invoice mode
  const handleToggleItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoiceItems(prev => [...prev, itemId]);
      // Set default condition to GOOD
      setItemConditions(prev => ({ ...prev, [itemId]: 'GOOD' }));
    } else {
      setSelectedInvoiceItems(prev => prev.filter(id => id !== itemId));
      setItemConditions(prev => {
        const newConditions = { ...prev };
        delete newConditions[itemId];
        return newConditions;
      });
    }
  };

  // Update item condition for invoice mode
  const handleItemConditionChange = (itemId: string, condition: 'GOOD' | 'DEFECTIVE') => {
    setItemConditions(prev => ({ ...prev, [itemId]: condition }));
  };

  // Select all items from invoice
  const handleSelectAllItems = (checked: boolean) => {
    if (checked && foundInvoice?.items) {
      const allIds = foundInvoice.items.map((item: InvoiceItem, index: number) =>
        item._id || item.batchCode || item.batch || `item-${index}`
      );
      setSelectedInvoiceItems(allIds);
      const conditions: Record<string, 'GOOD' | 'DEFECTIVE'> = {};
      allIds.forEach(id => { conditions[id] = 'GOOD'; });
      setItemConditions(conditions);
    } else {
      setSelectedInvoiceItems([]);
      setItemConditions({});
    }
  };

  // Remove bag from list
  const handleRemoveBag = (bagId: string) => {
    setReturnBags(prev => prev.filter(bag => bag.id !== bagId));
  };

  // Update bag condition
  const handleConditionChange = (bagId: string, condition: 'GOOD' | 'DEFECTIVE') => {
    setReturnBags(prev => prev.map(bag =>
      bag.id === bagId ? { ...bag, condition } : bag
    ));
  };

  // Get selected items from invoice for invoice mode
  const getSelectedInvoiceItemsData = (): ReturnBag[] => {
    if (!foundInvoice?.items) return [];
    return foundInvoice.items
      .map((item: InvoiceItem, index: number) => {
        const itemId = item._id || item.batchCode || item.batch || `item-${index}`;
        if (!selectedInvoiceItems.includes(itemId)) return null;
        // Calculate total if not present
        const calculatedTotal = (item.total && item.total > 0) ? item.total : (item.price || 0) * (item.weightKg || 0);
        return {
          id: itemId,
          batchCode: item.batchCode || item.batch || `BATCH-${index}`,
          productName: item.productName || item.name || 'Mahsulot',
          colorName: item.colorName || '',
          colorCode: item.colorCode || '',
          weightKg: item.weightKg || 0,
          bagsCount: item.bagsCount || 1,
          price: item.price || 0,
          total: calculatedTotal,
          condition: itemConditions[itemId] || 'GOOD',
          invoice: {
            _id: foundInvoice._id,
            invoiceNo: foundInvoice.invoiceNo,
            createdAt: foundInvoice.createdAt,
            clientId: foundInvoice.clientId,
            clientMeta: foundInvoice.clientMeta,
            balance: foundInvoice.balance,
            paid: foundInvoice.paid,
            netTotal: foundInvoice.netTotal,
          },
        } as ReturnBag;
      })
      .filter(Boolean) as ReturnBag[];
  };

  // Convert manual items to ReturnBag format for unified handling
  const getManualItemsAsReturnBags = (): ReturnBag[] => {
    return manualItems.map(item => ({
      ...item,
      batchCode: item.batchCode,
      invoice: {
        _id: '',
        invoiceNo: 'Qo\'lda kiritilgan',
        createdAt: new Date().toISOString(),
        clientId: selectedManualClient?._id || '',
        clientMeta: {
          name: selectedManualClient?.name || 'Noma\'lum',
          phone: selectedManualClient?.phone || ''
        },
        balance: selectedManualClient?.currentDebt || 0,
        paid: 0,
        netTotal: 0,
      },
    }));
  };

  // Get manual client balance for refund calculations
  const manualClientBalance = selectedManualClient?.currentDebt || 0;

  // Get all items for return (bag mode, invoice mode, or manual mode)
  const allReturnItems = searchMode === 'bag'
    ? returnBags
    : searchMode === 'invoice'
      ? getSelectedInvoiceItemsData()
      : getManualItemsAsReturnBags();

  // Calculate totals
  const totalReturnAmount = allReturnItems.reduce((sum, bag) => sum + bag.total, 0);
  const totalWeight = allReturnItems.reduce((sum, bag) => sum + bag.weightKg, 0);
  const totalBagsCount = allReturnItems.reduce((sum, bag) => sum + bag.bagsCount, 0);
  const goodBags = allReturnItems.filter(bag => bag.condition === 'GOOD');
  const defectiveBags = allReturnItems.filter(bag => bag.condition === 'DEFECTIVE');

  // Check if we have items to return
  const hasItemsToReturn = searchMode === 'bag'
    ? returnBags.length > 0
    : searchMode === 'invoice'
      ? selectedInvoiceItems.length > 0
      : manualItems.length > 0;

  // Handle return submit
  const handleSubmitReturn = () => {
    if (!hasItemsToReturn) {
      message.warning("Kamida bitta mahsulotni tanlang");
      return;
    }



    setIsConfirmModalVisible(true);
  };

  // Confirm return
  const handleConfirmReturn = async () => {
    // Manual returns don't require invoiceInfo
    if (searchMode !== 'manual' && !invoiceInfo) return;

    const items: ReturnItem[] = allReturnItems.map(bag => ({
      batchCode: bag.batchCode || '',
      productName: bag.productName || 'Mahsulot',
      colorName: bag.colorName || '',
      colorCode: bag.colorCode || '',
      weightKg: bag.weightKg || 0,
      bagsCount: bag.bagsCount || 1,
      price: bag.price || 0,
      total: bag.total || 0,
      condition: bag.condition,
    }));

    if (searchMode === 'manual') {
      // Manual return - mijoz bo'lishi yoki bo'lmasligi mumkin
      const manualReturnData: CreateManualReturnRequest = {
        isManual: true,
        clientId: selectedManualClient?._id || undefined,
        clientName: selectedManualClient?.name || undefined,
        items,
        totalAmount: totalReturnAmount,
        note,
      };

      await createReturnMutation.mutateAsync(manualReturnData);
    } else {
      // Regular return with invoice
      if (!invoiceInfo) return;

      const returnData: CreateReturnRequest = {
        invoiceId: invoiceInfo._id,
        invoiceNo: invoiceInfo.invoiceNo,
        clientId: invoiceInfo.clientId,
        clientName: invoiceInfo.clientMeta?.name || '',
        items,
        totalAmount: totalReturnAmount,
        note,
      };

      await createReturnMutation.mutateAsync(returnData);
    }

    setIsConfirmModalVisible(false);
  };

  // Reset form
  const handleReset = () => {
    setSearchText("");
    setReturnBags([]);
    setFoundInvoice(null);
    setSelectedInvoiceItems([]);
    setItemConditions({});
    setRefundMethod('DEBT_REDUCTION');
    setRefundAccountId('');
    setRefundCurrency('USD');
    setRefundRate(12500);
    setNote('');
    // Reset manual entry state
    setManualItems([]);
    setSelectedManualClient(null);
    setSelectedRegion('');
    setManualBatchCounter(1);
    setSelectedProductName('');
    manualItemForm.resetFields();
  };

  // Generate reversed batch code for manual returns (e.g., "001-26-RET" instead of "26-001")
  const generateManualBatchCode = () => {
    const currentYear = new Date().getFullYear().toString().slice(-2); // e.g., "26" for 2026
    const batchNum = manualBatchCounter.toString().padStart(3, '0');
    return `${batchNum}-${currentYear}-RET`; // Reversed format with RET suffix: XXX-YY-RET
  };

  // Add manual item
  const handleAddManualItem = (values: any) => {
    const brutto = values.brutto || 0;
    const tara = values.tara || 0;
    const netto = brutto - tara; // weightKg = netto
    const total = netto * (values.price || 0);
    const batchCode = generateManualBatchCode();
    const newItem: ManualItem = {
      id: `manual-${Date.now()}`,
      batchCode,
      productName: values.productName,
      colorName: values.colorName || '',
      colorCode: values.colorCode || '#cccccc',
      brutto,
      tara,
      weightKg: netto,
      bagsCount: 1, // Always 1 bag per item
      price: values.price || 0,
      total,
      condition: values.condition || 'GOOD',
    };
    setManualItems(prev => [...prev, newItem]);
    setManualBatchCounter(prev => prev + 1); // Increment counter for next item
    setIsAddManualItemModalVisible(false);
    setSelectedProductName('');
    manualItemForm.resetFields();
    message.success(`Mahsulot qo'shildi (Partiya: ${batchCode})`);

    // Prepare label for printing
    const labelItem: BarcodeItem = {
      code: batchCode,
      productName: values.productName,
      color: values.colorName || '',
      colorCode: values.colorCode || '',
      weight: brutto,
      tara: tara,
      date: new Date().toLocaleDateString('uz-UZ'),
      description: values.condition === 'DEFECTIVE' ? 'YAROQSIZ' : '',
    };
    handlePrintBarcodeItems([labelItem]);
  };

  // Remove manual item
  const handleRemoveManualItem = (itemId: string) => {
    setManualItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Update manual item condition
  const handleManualItemConditionChange = (itemId: string, condition: 'GOOD' | 'DEFECTIVE') => {
    setManualItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, condition } : item
    ));
  };

  // Handle search mode change
  const handleSearchModeChange = (mode: SearchMode) => {
    handleReset();
    setSearchMode(mode);
  };

  return (
    <div className="space-y-6">
      <div style={{ display: "none" }}>
        <div ref={barcodePrintRef}>
          <PrintableBarcode items={printingItems} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={2} style={{ margin: 0, fontSize: '1.5rem' }}>
            <RollbackOutlined className="mr-2" />
            Mahsulot qaytarish (Vozvrat)
          </Title>
          <Text type="secondary">
            {searchMode === 'bag' ? 'Qop raqami orqali' : searchMode === 'invoice' ? 'Faktura raqami orqali' : 'Qo\'lda kiritish orqali'} mahsulotlarni qaytarish
          </Text>
        </div>
        {hasItemsToReturn && (
          <Button danger onClick={handleReset}>
            <DeleteOutlined /> Tozalash
          </Button>
        )}
      </div>

      {/* Search Section */}
      <Card
        className="shadow-sm"
        style={{
          background: searchMode === 'bag'
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : searchMode === 'invoice'
              ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
              : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          border: 'none'
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24}>
            <div className="mb-4">
              <Segmented
                value={searchMode}
                onChange={(val) => handleSearchModeChange(val as SearchMode)}
                options={[
                  {
                    label: (
                      <Space>
                        <BarcodeOutlined />
                        <span>Qop raqami</span>
                      </Space>
                    ),
                    value: 'bag',
                  },
                  {
                    label: (
                      <Space>
                        <FileTextOutlined />
                        <span>Faktura raqami</span>
                      </Space>
                    ),
                    value: 'invoice',
                  },
                  {
                    label: (
                      <Space>
                        <FormOutlined />
                        <span>Qo'lda kiritish</span>
                      </Space>
                    ),
                    value: 'manual',
                  },
                ]}
                size="large"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              />
            </div>
          </Col>
          <Col xs={24} md={16} lg={12}>
            {searchMode === 'manual' ? (
              <>
                <div className="text-white mb-3">
                  <FormOutlined style={{ fontSize: '20px' }} className="mr-2" />
                  <Text strong style={{ color: 'white', fontSize: '16px' }}>
                    Mahsulot ma'lumotlarini qo'lda kiriting
                  </Text>
                </div>
                <div className="space-y-3">
                  <Select
                    placeholder="Viloyatni tanlang"
                    size="large"
                    allowClear
                    value={selectedRegion || undefined}
                    onChange={(value) => {
                      setSelectedRegion(value || '');
                      setSelectedManualClient(null); // Reset client when region changes
                    }}
                    style={{ width: '100%', background: 'white', borderRadius: '8px' }}
                  >
                    <Option value="ALL">Barcha viloyatlar</Option>
                    {REGION_CONFIGS.map((region) => (
                      <Option key={region.value} value={region.value}>
                        {region.label}
                      </Option>
                    ))}
                  </Select>
                  <Select
                    placeholder="Mijozni tanlang (ixtiyoriy)"
                    size="large"
                    showSearch
                    allowClear
                    value={selectedManualClient?._id}
                    onChange={(value) => {
                      const client = filteredClients.find((c: Client) => c._id === value);
                      setSelectedManualClient(client || null);
                    }}
                    filterOption={(input, option) =>
                      (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: '100%', background: 'white', borderRadius: '8px' }}
                    disabled={!selectedRegion}
                  >
                    {filteredClients.map((client: Client) => (
                      <Option key={client._id} value={client._id}>
                        {client.name} - {client.phone}
                      </Option>
                    ))}
                  </Select>
                </div>
                <Paragraph style={{ color: 'rgba(255,255,255,0.8)', marginTop: '8px', marginBottom: 0 }}>
                  Viloyatni tanlang, keyin mijozni tanlang.
                </Paragraph>
              </>
            ) : (
              <>
                <div className="text-white mb-3">
                  {searchMode === 'bag' ? (
                    <>
                      <BarcodeOutlined style={{ fontSize: '20px' }} className="mr-2" />
                      <Text strong style={{ color: 'white', fontSize: '16px' }}>
                        Qop raqamini kiriting yoki skanerlang
                      </Text>
                    </>
                  ) : (
                    <>
                      <FileTextOutlined style={{ fontSize: '20px' }} className="mr-2" />
                      <Text strong style={{ color: 'white', fontSize: '16px' }}>
                        Faktura raqamini kiriting
                      </Text>
                    </>
                  )}
                </div>
                <Search
                  ref={searchInputRef}
                  placeholder={searchMode === 'bag' ? "Masalan: FP-260209-1590" : "Masalan: INV-250301-0001"}
                  allowClear
                  enterButton={
                    <Button type="primary" icon={<ScanOutlined />}>
                      Qidirish
                    </Button>
                  }
                  size="large"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value.toUpperCase())}
                  onSearch={handleSearch}
                  loading={isSearching}
                  style={{ background: 'white', borderRadius: '8px' }}
                />
                <Paragraph style={{ color: 'rgba(255,255,255,0.8)', marginTop: '8px', marginBottom: 0 }}>
                  {searchMode === 'bag'
                    ? "Har bir qopning o'ziga xos raqami bor. Raqamni yozib qo'shing."
                    : "Faktura raqamini kiriting va mahsulotlarni tanlang."
                  }
                </Paragraph>
              </>
            )}
          </Col>
          <Col xs={24} md={8} lg={12}>
            {isSearching && (
              <div className="text-center">
                <Spin size="large" />
                <div className="text-white mt-2">Qidirilmoqda...</div>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {/* Invoice Info (shown when bags are added or invoice is found) */}
      {invoiceInfo && (
        <Card
          title={
            <Space>
              <InboxOutlined />
              Faktura ma'lumotlari
            </Space>
          }
          className="shadow-sm"
          extra={
            <Tag color="blue" className="text-lg px-3 py-1">
              {invoiceInfo.invoiceNo}
            </Tag>
          }
        >
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="Mijoz">
              <Text strong>{invoiceInfo.clientMeta?.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Telefon">{invoiceInfo.clientMeta?.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Sana">{formatDate(invoiceInfo.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Haydovchi">
              {(invoiceInfo as any)?.driver || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Mashina raqami">
              {(invoiceInfo as any)?.carNumber || (invoiceInfo.clientMeta as any)?.carNo || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Topshiruvchi">
              {(invoiceInfo as any)?.handedBy || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Jami summa">
              <Text strong className="text-green-600">
                {formatCurrency(convert(invoiceInfo.netTotal))}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="To'langan">
              <Text strong>{formatCurrency(convert(invoiceInfo.paid))}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Qoldiq (Qarz)">
              <Text strong className={invoiceInfo.balance > 0 ? "text-red-600" : "text-green-600"}>
                {formatCurrency(convert(invoiceInfo.balance))}
              </Text>
            </Descriptions.Item>
            {(invoiceInfo as any)?.note && (
              <Descriptions.Item label="Izoh" span={3}>
                {(invoiceInfo as any).note}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* Manual Client Info (shown when client is selected in manual mode) */}
      {searchMode === 'manual' && selectedManualClient && (
        <Card
          title={
            <Space>
              <InboxOutlined />
              Mijoz ma'lumotlari
            </Space>
          }
          className="shadow-sm"
          extra={
            <Tag color="magenta" className="text-lg px-3 py-1">
              Qo'lda kiritish
            </Tag>
          }
        >
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="Mijoz">
              <Text strong>{selectedManualClient.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Telefon">{selectedManualClient.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Manzil">{selectedManualClient.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="Jami qarz">
              <Text strong className={selectedManualClient.currentDebt > 0 ? "text-red-600" : "text-green-600"}>
                {formatCurrency(convert(selectedManualClient.currentDebt || 0))}
              </Text>
            </Descriptions.Item>
            {selectedManualClient.notes && (
              <Descriptions.Item label="Izoh" span={2}>
                {selectedManualClient.notes}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* Invoice Items Selection (for invoice mode) */}
      {searchMode === 'invoice' && foundInvoice && foundInvoice.items && (
        <Card
          title={
            <Space>
              <span>Faktura mahsulotlari</span>
              <Tag color="blue">{foundInvoice.items.length} ta</Tag>
            </Space>
          }
          className="shadow-sm"
          extra={
            <Checkbox
              checked={selectedInvoiceItems.length === foundInvoice.items.length}
              indeterminate={selectedInvoiceItems.length > 0 && selectedInvoiceItems.length < foundInvoice.items.length}
              onChange={(e) => handleSelectAllItems(e.target.checked)}
            >
              Hammasini tanlash
            </Checkbox>
          }
        >
          <Table
            dataSource={foundInvoice.items.map((item: InvoiceItem, index: number) => ({
              ...item,
              key: item._id || item.batchCode || item.batch || `item-${index}`,
            }))}
            pagination={false}
            size="small"
            columns={[
              {
                title: '',
                dataIndex: 'key',
                key: 'select',
                width: 50,
                render: (key: string) => (
                  <Checkbox
                    checked={selectedInvoiceItems.includes(key)}
                    onChange={(e) => handleToggleItem(key, e.target.checked)}
                  />
                ),
              },
              {
                title: 'Partiya',
                dataIndex: 'batchCode',
                key: 'batchCode',
                render: (text: string, record: InvoiceItem) => (
                  <Tag color="geekblue" className="font-mono">
                    {text || record.batch || '-'}
                  </Tag>
                ),
              },
              {
                title: 'Mahsulot',
                dataIndex: 'productName',
                key: 'productName',
                render: (text: string, record: InvoiceItem) => (
                  <Space>
                    {record.colorCode && (
                      <div
                        className="w-4 h-4 rounded"
                        style={{ background: record.colorCode, border: '1px solid #d9d9d9' }}
                      />
                    )}
                    <span>{text || record.name || 'Mahsulot'}</span>
                    {record.colorName && <Tag>{record.colorName}</Tag>}
                  </Space>
                ),
              },
              {
                title: 'Og\'irlik',
                dataIndex: 'weightKg',
                key: 'weightKg',
                render: (val: number) => <strong>{formatNumber(val, 2)} kg</strong>,
              },
              {
                title: 'Qoplar',
                dataIndex: 'bagsCount',
                key: 'bagsCount',
                render: (val: number) => val || 1,
              },
              {
                title: 'Narx',
                dataIndex: 'price',
                key: 'price',
                render: (val: number) => formatCurrency(convert(val)),
              },
              {
                title: 'Summa',
                dataIndex: 'total',
                key: 'total',
                render: (val: number, record: InvoiceItem) => {
                  // Calculate total if not present or is 0
                  const calculatedTotal = val && val > 0 ? val : (record.price || 0) * (record.weightKg || 0);
                  return (
                    <Text strong className="text-green-600">{formatCurrency(convert(calculatedTotal))}</Text>
                  );
                },
              },
              {
                title: 'Holat',
                dataIndex: 'key',
                key: 'condition',
                width: 180,
                render: (key: string) => (
                  selectedInvoiceItems.includes(key) ? (
                    <Radio.Group
                      value={itemConditions[key] || 'GOOD'}
                      onChange={(e) => handleItemConditionChange(key, e.target.value)}
                      optionType="button"
                      buttonStyle="solid"
                      size="small"
                    >
                      <Radio.Button value="GOOD" style={{
                        background: (itemConditions[key] || 'GOOD') === 'GOOD' ? '#52c41a' : undefined,
                        borderColor: (itemConditions[key] || 'GOOD') === 'GOOD' ? '#52c41a' : undefined,
                        color: (itemConditions[key] || 'GOOD') === 'GOOD' ? 'white' : undefined
                      }}>
                        <CheckCircleOutlined /> Yaroqli
                      </Radio.Button>
                      <Radio.Button value="DEFECTIVE" style={{
                        background: itemConditions[key] === 'DEFECTIVE' ? '#ff4d4f' : undefined,
                        borderColor: itemConditions[key] === 'DEFECTIVE' ? '#ff4d4f' : undefined,
                        color: itemConditions[key] === 'DEFECTIVE' ? 'white' : undefined
                      }}>
                        <CloseCircleOutlined /> Yaroqsiz
                      </Radio.Button>
                    </Radio.Group>
                  ) : (
                    <Text type="secondary">Tanlang</Text>
                  )
                ),
              },
            ]}
          />
          {selectedInvoiceItems.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <Space split={<Divider type="vertical" />}>
                <span>Tanlangan: <strong>{selectedInvoiceItems.length}</strong> ta</span>
                <span>Jami: <strong>{formatCurrency(convert(totalReturnAmount))}</strong></span>
                <span>Og'irlik: <strong>{formatNumber(totalWeight, 2)} kg</strong></span>
              </Space>
            </div>
          )}
        </Card>
      )}

      {/* Return Bags List (for bag mode only) */}
      {searchMode === 'bag' && (
        <Card
          title={
            <Space>
              <span>Qaytariladigan qoplar</span>
              <Tag color="blue">{returnBags.length} ta</Tag>
            </Space>
          }
          className="shadow-sm"
        >
          {returnBags.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-gray-500">
                  Hali qop qo'shilmagan. Yuqoridagi qidiruv maydoniga qop raqamini kiriting.
                </span>
              }
            >
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => searchInputRef.current?.focus()}
              >
                Qop qo'shish
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={returnBags}
              renderItem={(bag) => (
                <List.Item
                  className="hover:bg-gray-50 transition-colors rounded-lg mb-2 border border-gray-200 px-4"
                  style={{ background: bag.condition === 'DEFECTIVE' ? '#fff2f0' : '#f6ffed' }}
                  actions={[
                    <Tooltip title="O'chirish" key="delete">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveBag(bag.id)}
                      />
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{
                          background: bag.colorCode || '#1890ff',
                          border: '2px solid rgba(0,0,0,0.1)'
                        }}
                      >
                        {bag.bagsCount}
                      </div>
                    }
                    title={
                      <Space wrap>
                        <Tag color="geekblue" className="font-mono">
                          {bag.batchCode}
                        </Tag>
                        <Text strong>{bag.productName}</Text>
                        <Tag>{bag.colorName}</Tag>
                      </Space>
                    }
                    description={
                      <Space split={<Divider type="vertical" />}>
                        <span><strong>{bag.weightKg}</strong> kg</span>
                        <span><strong>{bag.bagsCount}</strong> qop</span>
                        <span>Narxi: <strong>{formatCurrency(convert(bag.price))}/kg</strong></span>
                        <span className="text-green-600 font-semibold">
                          Summa: {formatCurrency(convert(bag.total))}
                        </span>
                      </Space>
                    }
                  />
                  <div className="ml-4">
                    <Radio.Group
                      value={bag.condition}
                      onChange={(e) => handleConditionChange(bag.id, e.target.value)}
                      optionType="button"
                      buttonStyle="solid"
                      size="small"
                    >
                      <Radio.Button value="GOOD" style={{
                        background: bag.condition === 'GOOD' ? '#52c41a' : undefined,
                        borderColor: bag.condition === 'GOOD' ? '#52c41a' : undefined,
                        color: bag.condition === 'GOOD' ? 'white' : undefined
                      }}>
                        <CheckCircleOutlined /> Yaroqli
                      </Radio.Button>
                      <Radio.Button value="DEFECTIVE" style={{
                        background: bag.condition === 'DEFECTIVE' ? '#ff4d4f' : undefined,
                        borderColor: bag.condition === 'DEFECTIVE' ? '#ff4d4f' : undefined,
                        color: bag.condition === 'DEFECTIVE' ? 'white' : undefined
                      }}>
                        <CloseCircleOutlined /> Yaroqsiz
                      </Radio.Button>
                    </Radio.Group>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>
      )}

      {/* Manual Items List (for manual mode only) */}
      {searchMode === 'manual' && (
        <Card
          title={
            <Space>
              <span>Qo'lda kiritilgan mahsulotlar</span>
              <Tag color="magenta">{manualItems.length} ta</Tag>
            </Space>
          }
          className="shadow-sm"
          extra={
            manualItems.length > 0 && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsAddManualItemModalVisible(true)}
              >
                Yana qo'shish
              </Button>
            )
          }
        >
          {manualItems.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={null}
            >
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => setIsAddManualItemModalVisible(true)}
              >
                Mahsulot qo'shish
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={manualItems}
              renderItem={(item) => (
                <List.Item
                  className="hover:bg-gray-50 transition-colors rounded-lg mb-2 border border-gray-200 px-4"
                  style={{ background: item.condition === 'DEFECTIVE' ? '#fff2f0' : '#f6ffed' }}
                  actions={[
                    <Tooltip title="O'chirish" key="delete">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveManualItem(item.id)}
                      />
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{
                          background: item.colorCode || '#1890ff',
                          border: '2px solid rgba(0,0,0,0.1)'
                        }}
                      >
                        {item.bagsCount}
                      </div>
                    }
                    title={
                      <Space wrap>
                        <Tag color="magenta" className="font-mono">
                          {item.batchCode}
                        </Tag>
                        <Text strong>{item.productName}</Text>
                        {item.colorName && <Tag>{item.colorName}</Tag>}
                      </Space>
                    }
                    description={
                      <Space split={<Divider type="vertical" />} wrap>
                        <span>Brutto: <strong>{formatNumber(item.brutto)}</strong> kg</span>
                        <span>Tara: <strong>{formatNumber(item.tara)}</strong> kg</span>
                        <span>Netto: <strong>{formatNumber(item.weightKg)}</strong> kg</span>
                        <span><strong>1</strong> qop</span>
                        <span>Narxi: <strong>{formatCurrency(convert(item.price))}/kg</strong></span>
                        <span className="text-green-600 font-semibold">
                          Summa: {formatCurrency(convert(item.total))}
                        </span>
                      </Space>
                    }
                  />
                  <div className="ml-4">
                    <Radio.Group
                      value={item.condition}
                      onChange={(e) => handleManualItemConditionChange(item.id, e.target.value)}
                      optionType="button"
                      buttonStyle="solid"
                      size="small"
                    >
                      <Radio.Button value="GOOD" style={{
                        background: item.condition === 'GOOD' ? '#52c41a' : undefined,
                        borderColor: item.condition === 'GOOD' ? '#52c41a' : undefined,
                        color: item.condition === 'GOOD' ? 'white' : undefined
                      }}>
                        <CheckCircleOutlined /> Yaroqli
                      </Radio.Button>
                      <Radio.Button value="DEFECTIVE" style={{
                        background: item.condition === 'DEFECTIVE' ? '#ff4d4f' : undefined,
                        borderColor: item.condition === 'DEFECTIVE' ? '#ff4d4f' : undefined,
                        color: item.condition === 'DEFECTIVE' ? 'white' : undefined
                      }}>
                        <CloseCircleOutlined /> Yaroqsiz
                      </Radio.Button>
                    </Radio.Group>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>
      )}

      {/* Summary and Actions */}
      {hasItemsToReturn && (
        <Card className="shadow-sm">
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Title level={5}>Qaytarish xulosasi</Title>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Jami qoplar soni">
                  <Text strong>{totalBagsCount} ta qop</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Jami og'irlik">
                  <Text strong>{totalWeight.toFixed(2)} kg</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Yaroqli qoplar">
                  <Tag color="green">{goodBags.length} ta ({goodBags.reduce((s, b) => s + b.weightKg, 0).toFixed(2)} kg)</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Yaroqsiz qoplar">
                  <Tag color="red">{defectiveBags.length} ta ({defectiveBags.reduce((s, b) => s + b.weightKg, 0).toFixed(2)} kg)</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Jami qaytarish summasi">
                  <Text strong className="text-xl text-green-600">
                    {formatCurrency(convert(totalReturnAmount))}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Col>

            <Col xs={24} md={12}>
              <div className="p-3 bg-red-50 rounded border border-red-200 text-yellow-600 text-sm">
                <span className="text-gray-500">Mijoz holati:</span>
                <Tag color={(foundInvoice?.clientId as any)?.balance < 0 ? "red" : "green"}>
                  {(foundInvoice?.clientId as any)?.balance < 0
                    ? `Qarzi bor: $${Math.abs((foundInvoice?.clientId as any)?.balance || 0)}`
                    : `Avansi bor: $${(foundInvoice?.clientId as any)?.balance || 0}`
                  }
                </Tag>
              </div>
              <div className="p-3 bg-red-50 rounded border border-red-200 text-yellow-600 text-sm">
                <span className="text-gray-500">Faktura summasi:</span>
                <Tag color={(foundInvoice?.clientId as any)?.balance < 0 ? "red" : "green"}>
                  {foundInvoice?.netTotal}$
                </Tag>
              </div>
              <div className="p-3 bg-red-50 rounded border border-red-200 text-yellow-600 text-sm">
                {(() => {
                  const balance = (foundInvoice?.clientId as any)?.balance || 0;
                  const returnAmount = totalReturnAmount || 0;
                  const newBalance = balance + returnAmount;

                  if (balance === 0) {
                    return <>Faktura qaytarilsa <b>${returnAmount}</b> avans yoziladi.</>;
                  } else if (balance < 0) {
                    if (newBalance >= 0) {
                      return <>Faktura qaytarilsa mijozning <b>${Math.abs(balance)}</b> qarzi to'lanib, <b>${newBalance}</b> avans qoladi.</>;
                    }
                    return <>Faktura qaytarilsa mijozning qarzi <b>${Math.abs(balance)}</b> dan <b>${Math.abs(newBalance)}</b> ga tushadi.</>;
                  } else {
                    return <>Faktura qaytarilsa mijozning avansi <b>${balance}</b> dan <b>${newBalance}</b> ga ko'tariladi.</>;
                  }
                })()}
              </div>

              <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm flex items-center justify-between">
                <span className="text-gray-500">Mijoz yakuniy holati:</span>
                {(() => {
                  const balance = (foundInvoice?.clientId as any)?.balance || 0;
                  const returnAmount = totalReturnAmount || 0;
                  const newBalance = balance + returnAmount;

                  if (newBalance > 0) {
                    return <Tag color="green">Avans: ${newBalance}</Tag>;
                  } else if (newBalance < 0) {
                    return <Tag color="red">Qarz: ${Math.abs(newBalance)}</Tag>;
                  } else {
                    return <Tag color="default">$0</Tag>;
                  }
                })()}
              </div>
            </Col>
          </Row>

          <Divider />

          <div className="flex justify-end">
            <Space>
              <Button onClick={handleReset}>Bekor qilish</Button>
              <Button
                type="primary"
                icon={<RollbackOutlined />}
                size="large"
                onClick={handleSubmitReturn}
                loading={createReturnMutation.isLoading}
              >
                Qaytarishni tasdiqlash
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* Confirmation Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined className="text-yellow-500" />
            Qaytarishni tasdiqlang
          </Space>
        }
        open={isConfirmModalVisible}
        onOk={handleConfirmReturn}
        onCancel={() => setIsConfirmModalVisible(false)}
        okText="Tasdiqlash"
        cancelText="Bekor qilish"
        confirmLoading={createReturnMutation.isLoading}
        width={600}
      >
        <div className="space-y-4">
          <Alert
            message="Diqqat!"
            description="Qaytarish tasdiqlangandan so'ng, yaroqli mahsulotlar bazaga qaytariladi, yaroqsiz mahsulotlar esa yaroqsiz mahsulotlar ro'yxatiga qo'shiladi."
            type="warning"
            showIcon
          />

          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Faktura">
              {searchMode === 'manual' ? "Qo'lda kiritilgan" : invoiceInfo?.invoiceNo}
            </Descriptions.Item>
            <Descriptions.Item label="Mijoz">
              {searchMode === 'manual' ? (selectedManualClient?.name || "Noma'lum") : invoiceInfo?.clientMeta?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Qoplar soni">{totalBagsCount} ta</Descriptions.Item>
            <Descriptions.Item label="Jami og'irlik">{totalWeight.toFixed(2)} kg</Descriptions.Item>
            <Descriptions.Item label="Qaytarish summasi">
              <Text strong className="text-green-600">
                {formatCurrency(convert(totalReturnAmount))}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Yaroqli">{goodBags.length} ta qop</Descriptions.Item>
            <Descriptions.Item label="Yaroqsiz">{defectiveBags.length} ta qop</Descriptions.Item>
            <Descriptions.Item label="Qaytarish usuli">
              {searchMode === 'manual' && !selectedManualClient ? 'Naqd pul qaytarish' : (refundMethod === 'DEBT_REDUCTION' ? 'Qarzdan ayirish' : 'Naqd pul qaytarish')}
            </Descriptions.Item>
            {/* Non-manual: Debt reduction with remaining cash refund */}
            {searchMode !== 'manual' && refundMethod === 'DEBT_REDUCTION' && invoiceInfo && totalReturnAmount > invoiceInfo.balance && (
              <>
                <Descriptions.Item label="Qarzdan ayiriladi">
                  <Text strong className="text-orange-600">
                    {formatCurrency(invoiceInfo.balance)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Naqd qaytariladi">
                  <Text strong className="text-green-600">
                    {formatCurrency(totalReturnAmount - invoiceInfo.balance)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Valyuta">
                  <Tag color={refundCurrency === 'USD' ? 'green' : 'blue'}>
                    {refundCurrency === 'USD' ? 'USD (Dollar)' : 'UZS (So\'m)'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Hisobdan ayriladigan summa">
                  <Text strong className="text-red-600">
                    {refundCurrency === 'USD'
                      ? formatCurrency(totalReturnAmount - invoiceInfo.balance)
                      : `${formatNumber((totalReturnAmount - invoiceInfo.balance) * refundRate)} so'm`
                    }
                  </Text>
                </Descriptions.Item>
              </>
            )}
            {/* Non-manual: Debt reduction fully covers return (no cash refund needed) */}
            {searchMode !== 'manual' && refundMethod === 'DEBT_REDUCTION' && invoiceInfo && totalReturnAmount <= invoiceInfo.balance && (
              <Descriptions.Item label="Qarzdan ayiriladi">
                <Text strong className="text-orange-600">
                  {formatCurrency(totalReturnAmount)}
                </Text>
              </Descriptions.Item>
            )}
            {/* Non-manual: Full cash refund */}
            {searchMode !== 'manual' && refundMethod === 'CASH_REFUND' && (
              <>
                <Descriptions.Item label="Valyuta">
                  <Tag color={refundCurrency === 'USD' ? 'green' : 'blue'}>
                    {refundCurrency === 'USD' ? 'USD (Dollar)' : 'UZS (So\'m)'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Hisobdan ayriladigan summa">
                  <Text strong className="text-red-600">
                    {refundCurrency === 'USD'
                      ? formatCurrency(totalReturnAmount)
                      : `${formatNumber(totalReturnAmount * refundRate)} so'm`
                    }
                  </Text>
                </Descriptions.Item>
              </>
            )}
            {/* Manual: No client - full cash refund */}
            {searchMode === 'manual' && !selectedManualClient && (
              <>
                <Descriptions.Item label="Valyuta">
                  <Tag color={refundCurrency === 'USD' ? 'green' : 'blue'}>
                    {refundCurrency === 'USD' ? 'USD (Dollar)' : 'UZS (So\'m)'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Hisobdan ayriladigan summa">
                  <Text strong className="text-red-600">
                    {refundCurrency === 'USD'
                      ? formatCurrency(totalReturnAmount)
                      : `${formatNumber(totalReturnAmount * refundRate)} so'm`
                    }
                  </Text>
                </Descriptions.Item>
              </>
            )}
            {/* Manual with client: Cash refund selected */}
            {searchMode === 'manual' && selectedManualClient && refundMethod === 'CASH_REFUND' && (
              <>
                <Descriptions.Item label="Valyuta">
                  <Tag color={refundCurrency === 'USD' ? 'green' : 'blue'}>
                    {refundCurrency === 'USD' ? 'USD (Dollar)' : 'UZS (So\'m)'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Hisobdan ayriladigan summa">
                  <Text strong className="text-red-600">
                    {refundCurrency === 'USD'
                      ? formatCurrency(totalReturnAmount)
                      : `${formatNumber(totalReturnAmount * refundRate)} so'm`
                    }
                  </Text>
                </Descriptions.Item>
              </>
            )}
            {/* Manual with client: Debt reduction - return exceeds debt */}
            {searchMode === 'manual' && selectedManualClient && refundMethod === 'DEBT_REDUCTION' && totalReturnAmount > (selectedManualClient.currentDebt || 0) && (
              <>
                <Descriptions.Item label="Qarzdan ayiriladi">
                  <Text strong className="text-orange-600">
                    {formatCurrency(selectedManualClient.currentDebt || 0)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Naqd qaytariladi">
                  <Text strong className="text-green-600">
                    {formatCurrency(totalReturnAmount - (selectedManualClient.currentDebt || 0))}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Valyuta">
                  <Tag color={refundCurrency === 'USD' ? 'green' : 'blue'}>
                    {refundCurrency === 'USD' ? 'USD (Dollar)' : 'UZS (So\'m)'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Hisobdan ayriladigan summa">
                  <Text strong className="text-red-600">
                    {refundCurrency === 'USD'
                      ? formatCurrency(totalReturnAmount - (selectedManualClient.currentDebt || 0))
                      : `${formatNumber((totalReturnAmount - (selectedManualClient.currentDebt || 0)) * refundRate)} so'm`
                    }
                  </Text>
                </Descriptions.Item>
              </>
            )}
            {/* Manual with client: Debt reduction - debt fully covers return */}
            {searchMode === 'manual' && selectedManualClient && refundMethod === 'DEBT_REDUCTION' && totalReturnAmount <= (selectedManualClient.currentDebt || 0) && (
              <Descriptions.Item label="Qarzdan ayiriladi">
                <Text strong className="text-orange-600">
                  {formatCurrency(totalReturnAmount)}
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>

          {allReturnItems.length > 0 && (
            <div className="mt-4">
              <Text strong className="block mb-2">Qaytariladigan mahsulotlar:</Text>
              <div className="flex flex-wrap gap-2">
                {allReturnItems.map(item => (
                  <Tag
                    key={item.id}
                    color={item.condition === 'GOOD' ? 'green' : 'red'}
                  >
                    {item.batchCode} - {item.productName}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Manual Item Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            Mahsulot qo'shish
            <Tag color="magenta" className="font-mono">
              Partiya: {generateManualBatchCode()}
            </Tag>
          </Space>
        }
        open={isAddManualItemModalVisible}
        onCancel={() => {
          setIsAddManualItemModalVisible(false);
          setSelectedProductName('');
          manualItemForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={manualItemForm}
          layout="vertical"
          onFinish={handleAddManualItem}
          initialValues={{ bagsCount: 1, condition: 'GOOD' }}
        >
          <Form.Item
            name="productName"
            label="Mahsulot nomi"
            rules={[{ required: true, message: 'Mahsulot nomini tanlang' }]}
          >
            <Select
              placeholder="Mahsulotni tanlang"
              showSearch
              allowClear
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
              onChange={(value) => {
                setSelectedProductName(value || '');
                // Reset color fields when product changes
                manualItemForm.setFieldsValue({ colorName: undefined, colorCode: undefined });
              }}
            >
              {uniqueProductNames.map((name) => (
                <Option key={name} value={name}>
                  {name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="colorName"
            label="Rang"
            rules={[{ required: true, message: 'Rangni tanlang' }]}
          >
            <Select
              placeholder={selectedProductName ? "Rangni tanlang" : "Avval mahsulotni tanlang"}
              disabled={!selectedProductName}
              showSearch
              allowClear
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
              onChange={(value) => {
                // Auto-fill colorCode when color is selected
                const selectedColor = getColorsForProduct(selectedProductName).find(
                  (p: any) => p.color === value
                );
                if (selectedColor) {
                  manualItemForm.setFieldsValue({ colorCode: selectedColor.colorCode });
                }
              }}
            >
              {getColorsForProduct(selectedProductName).map((product: any) => (
                <Option key={`${product.color}-${product.colorCode}`} value={product.color}>
                  <Space>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: product.colorCode,
                        borderRadius: 4,
                        border: '1px solid #d9d9d9',
                        display: 'inline-block',
                      }}
                    />
                    {product.color}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="colorCode" hidden>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="brutto"
                label="Brutto (kg)"
                rules={[{ required: true, message: 'Bruttoni kiriting' }]}
              >
                <InputNumber
                  min={0}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="Brutto"
                  formatter={inputNumberFormatter}
                  parser={inputNumberParser}
                  onChange={() => {
                    const brutto = manualItemForm.getFieldValue('brutto') || 0;
                    const tara = manualItemForm.getFieldValue('tara') || 0;
                    const netto = Math.max(0, brutto - tara);
                    manualItemForm.setFieldsValue({ netto: Number(netto.toFixed(2)) });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tara"
                label="Tara (kg)"
                rules={[{ required: true, message: 'Tarani kiriting' }]}
              >
                <InputNumber
                  min={0}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="Tara"
                  formatter={inputNumberFormatter}
                  parser={inputNumberParser}
                  onChange={() => {
                    const brutto = manualItemForm.getFieldValue('brutto') || 0;
                    const tara = manualItemForm.getFieldValue('tara') || 0;
                    const netto = Math.max(0, brutto - tara);
                    manualItemForm.setFieldsValue({ netto: Number(netto.toFixed(2)) });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="netto"
                label="Netto (kg)"
              >
                <InputNumber
                  disabled
                  style={{ width: '100%', backgroundColor: '#f5f5f5' }}
                  formatter={inputNumberFormatter}
                  parser={inputNumberParser}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="price"
            label="Narx ($/kg)"
            rules={[{ required: true, message: 'Narxni kiriting' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="Masalan: 5.50"
              formatter={inputNumberFormatter}
              parser={inputNumberParser}
            />
          </Form.Item>

          <Form.Item
            name="condition"
            label="Holati"
            rules={[{ required: true, message: 'Holatni tanlang' }]}
          >
            <Radio.Group optionType="button" buttonStyle="solid">
              <Radio.Button value="GOOD">
                <CheckCircleOutlined /> Yaroqli
              </Radio.Button>
              <Radio.Button value="DEFECTIVE">
                <CloseCircleOutlined /> Yaroqsiz
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setIsAddManualItemModalVisible(false);
                manualItemForm.resetFields();
              }}>
                Bekor qilish
              </Button>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                Qo'shish
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReturnsPage;
