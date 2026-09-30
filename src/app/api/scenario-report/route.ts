import { renderScenarioReportPdf } from "@/features/calculator/lib/scenario-report-pdf";
import type { ScenarioReportData } from "@/features/calculator/lib/scenario-report";
import { apiError, apiHeaders } from "@/lib/observability";
export const runtime = "nodejs";
export async function POST(request: Request) { try { const body = await request.json() as { report?: ScenarioReportData }; if (!body.report || !Array.isArray(body.report.scenarios) || !Array.isArray(body.report.rows)) return apiError("VALIDATION_ERROR", 400, request); const pdf = await renderScenarioReportPdf(body.report); return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=BlockSystem-scenario-comparison.pdf", ...apiHeaders(request) } }); } catch { return apiError("INTERNAL_ERROR", 500, request); } }
