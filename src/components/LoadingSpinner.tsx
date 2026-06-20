import React from "react";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

interface LoadingSpinnerProps {
  size?: "small" | "default" | "large";
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "large",
  text = "Yuklanmoqda...",
  fullScreen = false,
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
        <div className="text-center">
          <Spin indicator={antIcon} size={size} />
          <div className="mt-4 text-gray-600">{text}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <Spin indicator={antIcon} size={size} />
        <div className="mt-4 text-gray-600">{text}</div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
