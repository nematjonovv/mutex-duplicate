import { FinishedProduct } from "@/types";

export interface AggregatedFinishedProduct {
  _id: string;
  productName: string;
  color: string;
  colorCode: string;
  weightKg: number;
  bagsCount: number;
  createdAt: string;
}

export interface FinishedProductSummary {
  productName: string;
  weightKg: number;
  createdAt: string;
}

export const EMPTY_COLOR_CODE = "__empty__";

export const normalizeColorCode = (colorCode?: string) => colorCode || EMPTY_COLOR_CODE;

export const denormalizeColorCode = (colorCode?: string) =>
  colorCode === EMPTY_COLOR_CODE ? "" : colorCode || "";

export const getBatchGroupKey = (batch?: string) => {
  if (!batch) return "Noma'lum";
  const lastDash = batch.lastIndexOf("-");
  if (lastDash <= 0) return batch;
  return batch.slice(0, lastDash);
};

export const summarizeByProductName = (items: AggregatedFinishedProduct[]): FinishedProductSummary[] => {
  const map = new Map<string, FinishedProductSummary>();

  items.forEach((item) => {
    const current = map.get(item.productName);
    if (!current) {
      map.set(item.productName, {
        productName: item.productName,
        weightKg: item.weightKg,
        createdAt: item.createdAt,
      });
      return;
    }

    current.weightKg += item.weightKg;
    if (new Date(item.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      current.createdAt = item.createdAt;
    }
  });

  return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName));
};

export const groupFinishedProductsByWrapping = (items: FinishedProduct[]) => {
  return items.reduce<Record<string, FinishedProduct[]>>((acc, item) => {
    const key = getBatchGroupKey(item.batch);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
};
