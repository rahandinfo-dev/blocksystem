/**
 * No verified local mortar-consumption or cement-ratio constant was supplied.
 * The estimator stays disabled until the user enters a confirmed consumption
 * value in m³ per m². These fields make later supplier/engineer presets safe.
 */
export const mortarConfiguration = {
  consumptionUnit: "m³/m²",
  cementRatioLabel: "ڕێژەی سیمەنت",
} as const;
