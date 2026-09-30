import type { Language } from "../../../lib/i18n";
import { documentText } from "../../../lib/document-messages.ts";
import type { ProjectDocumentData } from "./project-document.ts";

export interface DocumentSection {
  title: string;
  rows: Array<[string, string]>;
}
/** Preview, print and PDF consume the same rows. Formatting never enters calculations. */
export function documentSections(
  data: ProjectDocumentData,
  language: Language,
): DocumentSection[] {
  const locale = language === "ku" ? "ckb-IQ" : language;
  const t = (key: string) => documentText(language, `documents.${key}`);
  const n = (value: number) =>
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      numberingSystem: "latn",
    }).format(value);
  const money = (value: number, currency: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: currency === "IQD" ? 0 : 2,
      numberingSystem: "latn",
    }).format(value);
  const date = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeZone: "UTC",
          numberingSystem: "latn",
        }).format(parsed);
  };
  const rows: Array<[string, string]> = [
    [t("project"), data.project.name],
    [t("reference"), data.reference],
    [t("issued"), date(data.issuedAt)],
  ];
  if (data.project.reference)
    rows.push([t("projectReference"), data.project.reference]);
  if (data.project.client) rows.push([t("client"), data.project.client]);
  if (data.project.location) rows.push([t("location"), data.project.location]);
  if (data.validUntil) rows.push([t("validUntil"), date(data.validUntil)]);
  const r = data.result;
  const sections: DocumentSection[] = [
    { title: t(data.kind), rows },
    {
      title: t("material"),
      rows: [
        [t("material"), data.block.specification],
        [t("gross"), `${n(r.grossWallArea)} m²`],
        [t("openings"), `${n(r.totalOpeningArea)} m²`],
        ...(r.totalStructuralDeductionArea
          ? [
              [t("deductions"), `${n(r.totalStructuralDeductionArea)} m²`] as [
                string,
                string,
              ],
            ]
          : []),
        [t("net"), `${n(r.netWallArea)} m²`],
        [t("base"), n(r.requiredBlocks)],
        [t("waste"), `${n(r.wasteBlocks)} (${n(r.wastePercentage)}%)`],
        [t("final"), n(r.recommendedBlocks)],
      ],
    },
  ];
  if (r.cost) {
    const c = r.cost;
    const costs: Array<[string, string]> = [
      [t("price"), money(c.unitPrice, c.currency)],
      [t("materialCost"), money(c.recommendedTotalCost, c.currency)],
    ];
    for (const [key, value] of [
      ["wasteCost", c.wasteCost],
      ["labour", c.laborCost],
      ["transport", c.transportCost],
      ["mortar", c.mortarCost],
      ["additional", c.otherCost],
    ] as const)
      if (value)
        costs.push([
          key === "additional" ? c.otherCostLabel || t(key) : t(key),
          money(value, c.currency),
        ]);
    costs.push([t("total"), money(c.grandTotal, c.currency)]);
    sections.push({ title: t("total"), rows: costs });
  }
  if (data.kind === "detailed")
    data.rooms.forEach((room, index) =>
      sections.push({
        title: `${t("details")} ${n(index + 1)} — ${room.name}`,
        rows: [
          [t("gross"), `${n(room.gross)} m²`],
          [t("openings"), `${n(room.openings)} m²`],
          [t("net"), `${n(room.net)} m²`],
        ],
      }),
    );
  if (data.kind === "scenarios") {
    const baseline = data.scenarios.find((s) => s.baseline);
    for (const s of data.scenarios) {
      const values: Array<[string, string]> = [
        [t("base"), n(s.base)],
        [t("waste"), n(s.waste)],
        [t("final"), n(s.final)],
      ];
      if (s.total !== undefined && s.currency)
        values.push([t("total"), money(s.total, s.currency)]);
      if (baseline && s !== baseline) {
        values.push([
          `${t("difference")} · ${t("final")}`,
          n(s.final - baseline.final),
        ]);
        if (s.total !== undefined && baseline.total !== undefined)
          values.push([
            `${t("difference")} · ${t("total")}`,
            s.currency === baseline.currency
              ? money(s.total - baseline.total, s.currency!)
              : t("currencyMismatch"),
          ]);
      }
      sections.push({
        title: `${s.name}${s.baseline ? ` · ${t("baseline")}` : ""}`,
        rows: values,
      });
    }
  }
  if (data.notes)
    sections.push({ title: t("notes"), rows: [["", data.notes]] });
  if (data.terms)
    sections.push({ title: t("terms"), rows: [["", data.terms]] });
  if (data.preparedBy)
    sections.push({
      title: t("signature"),
      rows: [["", `${data.preparedBy}\n________________________`]],
    });
  return sections;
}
