import { formatCurrency as formatCurrencyUtil } from '@/utils';

// Simplified currency hook - USD only
export const useCurrency = () => {
  const currency = 'USD';

  const convertPrice = (amount: number) => {
    // No conversion needed - already in USD
    if (!amount) return 0;
    return amount;
  };

  const formatPrice = (amount: number) => {
    return formatCurrencyUtil(amount, 'USD');
  };

  return {
    currency,
    rates: { USD: 1 },
    setCurrency: () => {}, // No-op since we only use USD
    setRate: () => {}, // No-op
    formatPrice,
    convertPrice
  };
};
