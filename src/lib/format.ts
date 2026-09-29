export function formatArea(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatQuantity(value: number): string { return formatInteger(value); }

export function formatLength(value: number, unit = "m"): string {
  return `${formatArea(value)} ${unit}`;
}

export function formatVolume(value: number, unit = "m³"): string {
  return `${formatArea(value)} ${unit}`;
}

export function formatPercentage(value: number): string {
  return `${formatArea(value)}%`;
}
