/** Dimension-safe conversion utilities. Canonical calculation values are metres, m² and m³. */
export type LengthUnit = "mm" | "cm" | "m" | "in" | "ft";
export type AreaUnit = "mm²" | "cm²" | "m²" | "in²" | "ft²";
export type VolumeUnit = "mm³" | "cm³" | "m³";

const lengthToMetres: Record<LengthUnit, number> = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 };
const areaToSquareMetres: Record<AreaUnit, number> = { "mm²": 0.000001, "cm²": 0.0001, "m²": 1, "in²": 0.00064516, "ft²": 0.09290304 };
const volumeToCubicMetres: Record<VolumeUnit, number> = { "mm³": 0.000000001, "cm³": 0.000001, "m³": 1 };

function convert(value: number, fromFactor: number, toFactor: number): number { return Number.isFinite(value) ? Number(((value * fromFactor) / toFactor).toPrecision(15)) : Number.NaN; }
export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number { return convert(value, lengthToMetres[from], lengthToMetres[to]); }
export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number { return convert(value, areaToSquareMetres[from], areaToSquareMetres[to]); }
export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number { return convert(value, volumeToCubicMetres[from], volumeToCubicMetres[to]); }
export const lengthUnits: readonly LengthUnit[] = ["mm", "cm", "m", "in", "ft"];
export const areaUnits: readonly AreaUnit[] = ["mm²", "cm²", "m²", "in²", "ft²"];
export const volumeUnits: readonly VolumeUnit[] = ["mm³", "cm³", "m³"];
