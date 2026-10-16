// The adapter registry. Adding a report type = writing an adapter and listing
// it here (plus allowing the report_type in the migration's check constraint).
import type { BusinessSettings, ReportType } from "../domain/accounting-policy";
import { meeshoOrdersAdapter } from "./adapters/meesho-orders";
import { meeshoReturnsAdapter } from "./adapters/meesho-returns";
import { meeshoSettlementsAdapter } from "./adapters/meesho-settlements";
import { metaAdsAdapter } from "./adapters/meta-ads";
import { platformFeesAdapter } from "./adapters/platform-fees";
import { detectHeader, detectionConfidence, type HeaderDetection } from "./header-mapping";
import type { ImportAdapter, RawTable } from "./types";

export const ADAPTERS: Record<ReportType, ImportAdapter> = {
  meesho_orders: meeshoOrdersAdapter as ImportAdapter,
  meesho_settlements: meeshoSettlementsAdapter as ImportAdapter,
  meesho_returns: meeshoReturnsAdapter as ImportAdapter,
  platform_fees: platformFeesAdapter as ImportAdapter,
  meta_ads: metaAdsAdapter as ImportAdapter,
};

export function getAdapter(type: ReportType): ImportAdapter {
  return ADAPTERS[type];
}

export type DetectionResult = {
  reportType: ReportType;
  tableIndex: number;
  detection: HeaderDetection;
  confidence: number;
};

/**
 * Ranks every (sheet, report type) pair by how well the sheet's header row
 * matches the report's required and optional columns.
 */
export function detectReportTypes(tables: RawTable[], settings: BusinessSettings): DetectionResult[] {
  const results: DetectionResult[] = [];
  tables.forEach((table, tableIndex) => {
    for (const adapter of Object.values(ADAPTERS)) {
      const detection = detectHeader(table, adapter.fields, settings.imports.customAliases[adapter.reportType] ?? {});
      if (!detection) continue;
      results.push({ reportType: adapter.reportType, tableIndex, detection, confidence: detectionConfidence(detection) });
    }
  });
  return results.sort((a, b) => b.confidence - a.confidence || b.detection.matchedTotal - a.detection.matchedTotal);
}
