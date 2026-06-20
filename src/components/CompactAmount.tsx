import React, { useState } from 'react';
import { formatCompactNumber, formatNumber } from '@/utils';

interface CompactAmountProps {
  amount: number;
  currency?: string;
  className?: string;
}

export const CompactAmount: React.FC<CompactAmountProps> = ({ amount, currency = "USD", className = "" }) => {
  const [showFull, setShowFull] = useState(false);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFull(!showFull);
  };

  const formatFull = (value: number) => {
    if (currency === 'UZS') {
      return `${formatNumber(value)} so'm`;
    }
    return `$${formatNumber(value, 2)}`;
  };

  return (
    <span
      className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      onClick={toggle}
      title={showFull ? "Qisqartirish" : "To'liq ko'rish"}
    >
      {showFull
        ? formatFull(amount)
        : formatCompactNumber(amount)
      }
    </span>
  );
};
