import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Row,
  Col,
  Select,
  AutoComplete,
  InputNumber,
  Input,
  Button,
  Space,
  DatePicker
} from "antd";
import dayjs from "dayjs";
import { PrinterOutlined } from "@ant-design/icons";
import { usePaginatedQuery, useApiMutation } from "@/hooks/useApi";
import { batchService, Batch } from "@/services/batchService";
import { materialService } from "@/services/materialService";
import { clientService } from "@/services/clientService";
import { inputNumberFormatter, inputNumberParser } from "@/utils";

const { Option } = Select;

interface BatchCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (batch: Batch) => void;
}

export const BatchCreateModal: React.FC<BatchCreateModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();

  // Data lists
  const [colorNames, setColorNames] = useState<string[]>([]);
  const [colorCodes, setColorCodes] = useState<string[]>([]);
  const [nextBatchNumber, setNextBatchNumber] = useState<string>("");
  const [availableThreadTypes, setAvailableThreadTypes] = useState<string[]>([]);
  const [availableThreadNumbers, setAvailableThreadNumbers] = useState<Array<{
    threadType: string;
    threadNumber: string;
    availableWeight: number;
  }>>([]);

  // Form interactive state
  const [selectedThreadType, setSelectedThreadType] = useState<string>("");
  const [maxWeight, setMaxWeight] = useState<number>(0);

  // Clients
  const { data: clientsData } = usePaginatedQuery(
    ["clients"],
    (params) => clientService.getAll(params),
    { page: 1, limit: 100, enabled: open }
  );

  const loadFormData = async () => {
    try {
      const [colorNamesRes, colorCodesRes, nextNumberRes, availableMaterialsRes] = await Promise.all([
        batchService.getBatchSuggestions("COLOR_NAME"),
        batchService.getBatchSuggestions("COLOR_CODE"),
        batchService.getNextBatchNumber(),
        materialService.getAvailableMaterials(),
      ]);
      if (colorNamesRes.success && colorNamesRes.data) {
        setColorNames(colorNamesRes.data.suggestions || []);
      }
      if (colorCodesRes.success && colorCodesRes.data) {
        setColorCodes(colorCodesRes.data.suggestions || []);
      }
      if (nextNumberRes.success && nextNumberRes.data) {
        setNextBatchNumber(nextNumberRes.data.batchNumber || "");
      }
      if (availableMaterialsRes.success && availableMaterialsRes.data) {
        setAvailableThreadTypes(availableMaterialsRes.data.threadTypes || []);
        setAvailableThreadNumbers(availableMaterialsRes.data.threadNumbers || []);
      }
    } catch (error) {
      console.error("Failed to load batch form data:", error);
    }
  };

  useEffect(() => {
    if (open) {
      loadFormData();
      setSelectedThreadType("");
      setMaxWeight(0);
      form.resetFields();
      form.setFieldValue("date", dayjs());
    }
  }, [open, form]);

  const handleThreadTypeChange = (value: string) => {
    setSelectedThreadType(value);
    form.setFieldValue("threadNumber", undefined);
    setMaxWeight(0);
  };

  const handleThreadNumberChange = (value: string) => {
    const material = availableThreadNumbers.find(
      m => m.threadType === selectedThreadType && m.threadNumber === value
    );
    if (material) {
      setMaxWeight(material.availableWeight);
    }
  };

  const filteredThreadNumbers = availableThreadNumbers.filter(
    m => m.threadType === selectedThreadType
  );

  const createBatchMutation = useApiMutation(
    (data: any) => batchService.create(data),
    {
      successMessage: "Partiya muvaffaqiyatli yaratildi",
      invalidateQueries: ["batches", "batchStats", "materials"],
      onSuccess: (response) => {
        console.log("response:", response);
        form.resetFields();
        if (onSuccess) {
          onSuccess(response); // avval onSuccess (navigate)
        }
        onClose(); // keyin modal yopiladi
      },
    }
  );

  const handleSubmit = async (values: any) => {
    const selectedClient = clientsData?.data?.find(
      (c: any) => c._id === values.clientId
    );

    const batchData: any = {
      threadType: values.threadType,
      threadNumber: values.threadNumber,
      colorName: values.colorName,
      colorCode: values.colorCode,
      weightKg: Number(values.weightKg),
      conesCount: values.conesCount ? Number(values.conesCount) : undefined,
      date: values.date?.toISOString(),
    };

    if (values.clientId) {
      batchData.clientId = values.clientId;
      batchData.clientName = selectedClient?.name;
    }

    if (values.comment) {
      batchData.comment = values.comment;
    }

    await createBatchMutation.mutateAsync(batchData);
  };

  return (
    <Modal
      title={
        <div className="flex items-center justify-between pr-8">
          <span>Partiya yaratish</span>
          {nextBatchNumber && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-mono">
              #{nextBatchNumber}
            </span>
          )}
        </div>
      }
      open={open}
      onCancel={() => {
        onClose();
        form.resetFields();
      }}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="threadType"
              label="Ip turi (xom ashyodan)"
              rules={[{ required: true, message: "Iltimos, ip turini tanlang!" }]}
            >
              <Select
                placeholder="Ip turini tanlang"
                showSearch
                onChange={handleThreadTypeChange}
                filterOption={(input, option) =>
                  String(option?.children ?? "").toLowerCase().includes(input.toLowerCase())
                }
              >
                {availableThreadTypes.map((t) => (
                  <Option key={t} value={t}>
                    {t}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="threadNumber"
              label="Ip raqami"
              rules={[{ required: true, message: "Iltimos, ip raqamini tanlang!" }]}
            >
              <Select
                placeholder={selectedThreadType ? "Ip raqamini tanlang" : "Avval ip turini tanlang"}
                showSearch
                disabled={!selectedThreadType}
                onChange={handleThreadNumberChange}
                filterOption={(input, option) =>
                  String(option?.children ?? "").toLowerCase().includes(input.toLowerCase())
                }
              >
                {filteredThreadNumbers.map((m) => (
                  <Option key={m.threadNumber} value={m.threadNumber}>
                    {m.threadNumber} ({m.availableWeight.toLocaleString()} kg mavjud)
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {maxWeight > 0 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-700">
              Mavjud xom ashyo: <strong>{maxWeight.toLocaleString()} kg</strong>
            </span>
          </div>
        )}

        <Form.Item
          name="clientId"
          label="Mijoz"
        >
          <Select
            placeholder="Mijozni tanlang (ixtiyoriy)"
            showSearch
            allowClear
            filterOption={(input, option) =>
              String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          >
            {(clientsData?.data || []).map((client: any) => (
              <Option key={client._id} value={client._id} label={client.name}>
                {client.name} {client.phone && `(${client.phone})`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="colorName"
              label="Rang nomi"
              rules={[{ required: true, message: "Iltimos, rang nomini kiriting!" }]}
            >
              <AutoComplete
                options={colorNames.map(c => ({ value: c }))}
                placeholder="Rang nomini kiriting"
                filterOption={(input, option) =>
                  (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="colorCode"
              label="Rang kodi"
              rules={[{ required: true, message: "Iltimos, rang kodini kiriting!" }]}
            >
              <AutoComplete
                options={colorCodes.map(c => ({ value: c }))}
                placeholder="Rang kodini kiriting"
                filterOption={(input, option) =>
                  (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="weightKg"
              label={`Og'irlik (kg)${maxWeight > 0 ? ` - max: ${maxWeight.toLocaleString()} kg` : ""}`}
              rules={[
                { required: true, message: "Iltimos, og'irlikni kiriting!" },
                {
                  validator: (_, value) => {
                    if (maxWeight > 0 && value > maxWeight) {
                      return Promise.reject(`Og'irlik ${maxWeight} kg dan oshmasligi kerak!`);
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                placeholder="0"
                min={0.1}
                max={maxWeight > 0 ? maxWeight : undefined}
                step={0.1}
                className="w-full"
                formatter={inputNumberFormatter}
                parser={inputNumberParser}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="conesCount"
              label="Bobina soni"
              rules={[{ required: false }]}
            >
              <InputNumber
                placeholder="0"
                min={1}
                step={1}
                className="w-full"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="date"
              label="Sana"
              rules={[{ required: true, message: "Iltimos, sanani kiriting!" }]}
            >
              <DatePicker
                placeholder="Sanani tanlang"
                format="DD.MM.YYYY"
                className="w-full"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="comment" label="Izoh">
          <Input.TextArea placeholder="Qo'shimcha ma'lumotlar..." rows={2} />
        </Form.Item>

        <Form.Item className="mb-0">
          <div className="flex justify-end space-x-2">
            <Button onClick={onClose}>Bekor qilish</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createBatchMutation.isLoading}
              icon={<PrinterOutlined />}
            >
              Partiya yaratish va chop etish
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};
