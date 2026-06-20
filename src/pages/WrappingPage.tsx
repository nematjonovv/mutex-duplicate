import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Card, message, Spin, InputRef } from "antd";
import { ScanOutlined } from "@ant-design/icons";
import { batchService } from "@/services/batchService";
import { useAuthStore } from "@/store/authStore";

const LAST_WRAPPING_BATCH_KEY = "last_wrapping_batch_id";

const WrappingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const inputRef = useRef<InputRef>(null);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Check for last batch and redirect
  useEffect(() => {
    // For WRAPPER users, use their profile's lastWrappedBatchId
    if (user?.role === "WRAPPER" && user.lastWrappedBatchId) {
      navigate(`/dyeing/wrapping/${user.lastWrappedBatchId}`, { replace: true });
      return;
    }

    // For other users, use localStorage
    const lastBatchId = localStorage.getItem(LAST_WRAPPING_BATCH_KEY);
    if (lastBatchId && lastBatchId !== "undefined" && lastBatchId !== "null") {
      navigate(`/dyeing/wrapping/${lastBatchId}`, { replace: true });
    } else {
      inputRef.current?.focus();
    }
  }, [navigate, user]);

  // Search for batch and navigate
  const handleSearch = async (value: string) => {
    const batchNumber = value.trim();
    if (!batchNumber) return;

    setLoading(true);
    try {
      const response = await batchService.scanBatch(batchNumber);
      if (response.success && response.data?.details) {
        const batch = response.data.details;
        if (["CREATED", "PROCESSING", "WRAPPING", "WRAPPED"].includes(batch.status)) {
          navigate(`/dyeing/wrapping/${batch._id}`);
        } else {
          message.warning(`Bu partiya qoplash uchun yaroqli emas`);
          setSearchValue("");
          inputRef.current?.focus();
        }
      } else {
        message.error("Partiya topilmadi");
        setSearchValue("");
        inputRef.current?.focus();
      }
    } catch (error) {
      message.error("Partiya topilmadi");
      setSearchValue("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Qoplash</h1>
          <p className="text-gray-500">Partiya raqamini kiriting</p>
        </div>

        <Spin spinning={loading}>
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Masalan: 26-001"
            prefix={<ScanOutlined className="text-gray-400" />}
            size="large"
            autoFocus
            onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
            className="text-center text-lg"
          />
        </Spin>

        <div className="text-center mt-4 text-gray-400 text-sm">
          Enter bosing yoki skaner qiling
        </div>
      </Card>
    </div>
  );
};

export default WrappingPage;
