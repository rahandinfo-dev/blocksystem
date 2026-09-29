export type CurrencyCode = "IQD" | "USD";

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export interface ManualExchangeRate {
  /** Explicit user-entered Iraqi dinars for one US dollar. */
  iqdPerUsd: number;
  source: string;
  updatedAt: string;
}

export const currencyOptions: Array<{ value: CurrencyCode; label: string }> = [
  { value: "IQD", label: "دیناری عێراقی (IQD)" },
  { value: "USD", label: "دۆلاری ئەمریکی (USD)" },
];

export function formatMoney(amount: number, currency: CurrencyCode): string {
  if (!Number.isFinite(amount)) return "—";
  if (currency === "USD") {
    return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
  }
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)} دینار`;
}

export function formatMoneyInput(value: string): string {
  if (value === "" || !/^\d*(\.\d*)?$/.test(value)) return value;
  const [whole, fraction] = value.split(".");
  const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(whole || 0));
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

export function convertMoney(money: Money, target: CurrencyCode, exchangeRate: ManualExchangeRate): Money | null {
  if (!Number.isFinite(money.amount) || !Number.isFinite(exchangeRate.iqdPerUsd) || exchangeRate.iqdPerUsd <= 0) return null;
  if (money.currency === target) return money;
  return target === "IQD"
    ? { amount: money.amount * exchangeRate.iqdPerUsd, currency: "IQD" }
    : { amount: money.amount / exchangeRate.iqdPerUsd, currency: "USD" };
}
