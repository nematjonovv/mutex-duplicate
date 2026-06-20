import dayjs from "dayjs";
import { User } from "@/types";

// Date formatting utilities
export const formatDate = (
  date: string | Date,
  format = "DD.MM.YYYY"
): string => {
  return dayjs(date).format(format);
};

export const formatDateTime = (
  date: string | Date,
  format = "DD.MM.YYYY HH:mm"
): string => {
  return dayjs(date).format(format);
};

export const formatTime = (date: string | Date, format = "HH:mm"): string => {
  return dayjs(date).format(format);
};

// Number formatting with space as thousands separator
// If decimals is not specified, shows up to 2 decimals but removes trailing zeros
export const formatNumber = (number: number, decimals?: number): string => {
  if (number === null || number === undefined || isNaN(number)) return "0";

  let result: string;
  if (decimals !== undefined) {
    // Fixed decimal places
    result = number.toFixed(decimals);
  } else {
    // Auto decimals: show up to 2 decimals, remove trailing zeros
    result = number.toFixed(2).replace(/\.?0+$/, "");
  }

  const parts = result.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(".");
};

// Format number with 2 decimal places
export const formatNumberWithDecimals = (number: number): string => {
  return formatNumber(number, 2);
};

// Currency formatting - USD only with space separator
export const formatCurrency = (amount: number, currency = "USD"): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return "$0.00";
  const formatted = formatNumber(Math.abs(amount), 2);
  const sign = amount < 0 ? "-" : "";
  return `${sign}$${formatted}`;
};

// Format money amount with space separator
export const formatMoneyAmount = (amount: number): string => {
  return formatNumber(amount, 2);
};

// InputNumber formatter - converts number to display string with spaces
export const inputNumberFormatter = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value.replace(/\s/g, "")) : value;
  if (isNaN(num)) return "";
  return formatNumber(num);
};

// InputNumber parser - converts display string back to number
export const inputNumberParser = (value: string | undefined): number => {
  if (!value) return 0;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// InputNumber formatter with decimals
export const inputNumberFormatterWithDecimals = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value.replace(/\s/g, "")) : value;
  if (isNaN(num)) return "";
  return formatNumber(num, 2);
};

export const formatCompactNumber = (num: number): string => {
  if (!num) return "0";
  const absNum = Math.abs(num);

  if (absNum >= 1_000_000_000) {
    return formatNumber(num / 1_000_000_000, 2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + " MLRD";
  }
  if (absNum >= 1_000_000) {
    return formatNumber(num / 1_000_000, 2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + " MLN";
  }
  if (absNum >= 1_000) {
    return formatNumber(num / 1_000, 1).replace(/\.0$/, '') + " K";
  }
  return formatNumber(num, 2);
};

// Phone number formatting
export const formatPhone = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Format as +998 XX XXX XX XX
  if (cleaned.length === 12 && cleaned.startsWith("998")) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(
      5,
      8
    )} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
  }

  // Format as +998 XXX XX XX XX
  if (cleaned.length === 12 && cleaned.startsWith("998")) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(
      6,
      8
    )} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
  }

  return phone;
};

// Clean phone number for API submission (remove spaces, dashes, parentheses)
export const cleanPhone = (phone: string): string => {
  return phone.replace(/[\s\-\(\)]/g, "");
};

// Validation utilities
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateTIN = (tin: string): boolean => {
  // TIN validation for Uzbekistan (9 digits)
  const tinRegex = /^\d{9}$/;
  return tinRegex.test(tin);
};

// Permission utilities
export const hasPermission = (
  user: User | null,
  permission: string
): boolean => {
  if (!user) return false;

  // Director has all permissions
  if (user.role === "DIRECTOR") return true;

  // Check specific permission
  return user.permissions.includes(permission);
};

export const hasRole = (user: User | null, role: User["role"]): boolean => {
  if (!user) return false;
  return user.role === role;
};

export const canAccessRoute = (user: User | null, route: string): boolean => {
  if (!user) return false;

  // Director can access everything
  if (user.role === "DIRECTOR") return true;

  // Check if user has permission for this route
  return user.permissions.some((permission) => {
    // Exact match
    if (permission === route) return true;

    // Wildcard match (e.g., "/users/*" matches "/users/123")
    if (permission.endsWith("/*")) {
      const baseRoute = permission.slice(0, -2);
      return route.startsWith(baseRoute);
    }

    return false;
  });
};

// Status utilities
export const getDebtStatus = (
  currentDebt: number
): { status: string; color: string } => {
  if (currentDebt === 0) {
    return { status: "To'liq to'langan", color: "green" };
  } else if (currentDebt > 0) {
    return { status: "Qarzi bor", color: "red" };
  } else {
    return { status: "Ortiqcha to'lov", color: "blue" };
  }
};

export const getInvoiceStatus = (
  paid: number,
  netTotal: number
): { status: string; color: string } => {
  if (paid >= netTotal) {
    return { status: "To'liq to'langan", color: "green" };
  } else if (paid > 0) {
    return { status: "Qisman to'langan", color: "orange" };
  } else {
    return { status: "To'lanmagan", color: "red" };
  }
};

// Color utilities
export const getRandomColor = (): string => {
  const colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// String utilities
export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

// Array utilities
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(
  array: T[],
  key: keyof T,
  direction: "asc" | "desc" = "asc"
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });
};

// Local storage utilities
export const setLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing from localStorage:", error);
  }
};

// Download utilities
export const downloadCSV = (data: any[], filename: string): void => {
  const csvContent = convertToCSV(data);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape commas and quotes
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ];

  return csvRows.join("\n");
};

// Print utilities
export const printElement = (elementId: string): void => {
  const element = document.getElementById(elementId);
  if (element) {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print</title>
            <style>
              body { font-family: Arial, sans-serif; }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${element.outerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
