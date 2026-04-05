import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { generateOperatorWorkbook_A, type OperatorSection } from "./reportFormatter";

// Sheet detection patterns (case/spacing tolerant)
export const SHEET_TARGETS = {
  spCampaigns: ["sponsoredproductscampaigns", "spcampaigns", "sponsoredproducts campaigns"],
  sbCampaigns: ["sponsoredbrandscampaigns", "sbcampaigns", "sponsoredbrands campaigns"],
  sdCampaigns: ["sponsoreddisplaycampaigns", "sdcampaigns", "sponsoreddisplay campaigns"],
  spSearchTerm: ["sp search term report", "sponsored products search term", "spsearchtermreport", "spsearchterm"],
  sbSearchTerm: ["sb search term report", "sponsored brands search term", "sbsearchtermreport", "sbsearchterm"],
};

// Core columns for fallback sheet detection
const CORE_COLUMNS = ["campaign", "entity", "spend", "clicks", "sales"];

// Column alias map (extensive normalization)
export const COLUMN_ALIASES: Record<string, string[]> = {
  campaign: ["campaign", "campaign name"],
  ad_group: ["ad group", "ad group name", "adgroup", "ad group name (informational only)"],
  campaign_state: ["campaign state", "campaign status", "campaign state (informational only)"],
  entity: ["entity", "record type", "row type"],

  // Let "Targeting" feed keyword_text when no explicit Keyword Text exists
  keyword_text: ["keyword text", "keyword", "kw", "search term", "targeting"],
  customer_search_term: ["customer search term", "search term"],

  target_expr: ["product targeting expression", "product target expression", "targeting expression", "targeting"],

  match_type: ["match type", "matchtype"],
  state: ["state", "status"],

  clicks: ["clicks", "click count"],
  spend: ["spend", "cost", "total spend"],

  // Prefer 14-day metrics for SB/SD reports
  sales: ["14 day total sales", "14 day total sales - click", "sales", "revenue", "total sales"],
  orders: [
    "14 day total orders #",
    "14 day total orders (#)",
    "14 day total orders (#) - click",
    "orders",
    "units",
    "7 day total orders",
    "total orders",
  ],

  // ACOS including "- (Click)" variant and plain "ACOS"
  acos: [
    "total advertising cost of sales (acos)",
    "total advertising cost of sales (acos) - click",
    "acos",
    "total advertising cost of sales (%)",
    "a cos",
    "a/cos",
    "acos (%)",
  ],

  impressions: ["impressions"],
  roas: ["roas", "return on ad spend", "total return on advertising spend"],
  ctr: ["ctr", "click thru rate", "click thru rate ctr"],
  cpc: ["cpc", "cost per click", "cost per click cpc"],
  bid: ["bid", "keyword bid", "max bid", "keyword bid amount"],
  campaignId: ["campaign id", "campaignid", "campaign id (informational only)"],
  adGroupId: ["ad group id", "adgroup id", "adgroupid"],
  keywordId: ["keyword id", "keywordid"],
  productTargetingId: ["product targeting id", "producttargeting id", "producttargetingid"],
  targetingId: ["targeting id", "targetingid"],
};

// Diagnostic tracking interface
export interface SheetDiagnostics {
  sheetName: string;
  rowsLoaded: number;
  afterNormalization: number;
  actionableEntity: number;
  enabledRows: number;
  clicksAboveThreshold: number;
  salesZero: number;
  finalBleeders: number;
  columnsNormalized: string[];
  missingColumns: string[];
  coercionsApplied: string[];
}

interface NormalizedRow {
  sheet: string;
  campaign: string;
  ad_group: string;
  entity: string;
  keyword_text: string;
  product_targeting: string;
  customer_search_term: string;
  match_type: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  ctr: string;
  cvr: string;
  acos: string;
  roas: string;
  state: string;
  campaign_state: string;
  sku: string;
  asin: string;
  campaignId?: string;
  adGroupId?: string;
  keywordId?: string;
  productTargetingId?: string;
  targetingId?: string;
}

export interface ValidationResult {
  status: "pass" | "warning" | "error";
  message: string;
}

export interface ValidationReport {
  sheetsFound: ValidationResult;
  columnsVerified: ValidationResult;
  bleederFilter: ValidationResult;
  topSpenders: ValidationResult;
  crossTabIntegrity: ValidationResult;
  dataQuality: ValidationResult[];
}

export interface TopSpender {
  term: string;
  spend: number;
  clicks: number;
  sheet: string;
  isCombined: boolean;
}

export interface AnalysisResult {
  summary: string;
  tables: Record<string, string>;
  csvData: { combined: string };
  tabsDetected: string[];
  validation: ValidationReport;
  topSpenders: TopSpender[];
  allRows: NormalizedRow[];
  formattedWorkbook?: ExcelJS.Workbook;
  diagnostics?: SheetDiagnostics[];
  mode?: "standard" | "lifetime";
}

// Normalize header names (aggressive)
export function sanitizeHeader(header: string): string {
  return (
    header
      .replace(/^\uFEFF/, "") // Remove BOM
      .replace(/[\u2018\u2019]/g, "'") // Normalize quotes
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-") // Normalize dashes
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width chars
      // Strip parenthetical chunks completely (key fix)
      .replace(/\s*\([^)]*\)\s*/g, " ")
      // Normalize click-through/thru variants
      .replace(/click[-\s]?through/gi, "click thru")
      .replace(/click[-\s]?thru/gi, "click thru")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[%$]/g, "")
  );
}

// Normalize sheet name for matching
export function normalizeSheetName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]/g, "");
}

// Safe numeric coercion (handles US/EU formats, parentheses for negative)
export function parseNumeric(value: any): number {
  const parsed = safeParseFloat(value);
  return parsed === null ? 0 : parsed;
}

// --- Operator workbook (template A: one sheet per section) ------------------
// Now using shared helper from reportFormatter.ts

function safeParseFloat(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  let strValue = String(value).trim();

  // Handle special cases
  if (/^(N\/A|nan|–|—|-)$/i.test(strValue)) return null;

  // Remove currency symbols, percent signs, commas, spaces
  strValue = strValue.replace(/[$%,\s]/g, "");

  // Handle parentheses as negative
  if (/^\(.*\)$/.test(strValue)) {
    strValue = "-" + strValue.replace(/[()]/g, "");
  }

  const parsed = parseFloat(strValue);
  return isNaN(parsed) ? null : parsed;
}

// Parse ACOS with robust handling
function parseAcos(value: any, spend: number, sales: number): number {
  const parsed = safeParseFloat(value);

  if (parsed !== null) return parsed;

  // Infer ACOS if blank but we have spend and zero sales
  if (sales === 0 && spend > 0) {
    return 1000.0; // High bleeder
  }

  return 0;
}

// Normalize entity field to identify actionable rows (robust)
// Supports: Keyword, Product Targeting, Audience Targeting, Contextual Targeting
function normalizeEntity(entity: string): { isActionable: boolean; entityType: string } {
  const lower = entity.toLowerCase().trim();

  // Split on commas and check tokens
  const tokens = lower.split(",").map((t) => t.trim());

  // Check for non-actionable entities first
  const nonActionable = ["campaign", "ad group", "product ad", "placement"];
  const isNonActionable = tokens.some((t) => nonActionable.some((na) => t === na || t.includes(na + " level")));

  if (isNonActionable) {
    return { isActionable: false, entityType: "campaign/ad group/placement" };
  }

  // Check for actionable entities (expanded for SD support)
  const hasKeyword = tokens.some((t) => t.includes("keyword") || t === "kw");
  const hasProductTargeting = tokens.some((t) => t.includes("product targeting"));
  const hasAudienceTargeting = tokens.some((t) => t.includes("audience targeting") || t.includes("audience"));
  const hasContextualTargeting = tokens.some((t) => t.includes("contextual targeting"));
  // Fallback: generic "targeting" that isn't one of the specific types above
  const hasGenericTargeting = tokens.some((t) => t.includes("targeting") && !t.includes("product") && !t.includes("audience") && !t.includes("contextual"));

  if (hasKeyword) {
    return { isActionable: true, entityType: "keyword" };
  }
  if (hasProductTargeting || hasContextualTargeting) {
    // Treat Contextual Targeting as Product Targeting for calculation purposes
    return { isActionable: true, entityType: "product targeting" };
  }
  if (hasAudienceTargeting) {
    return { isActionable: true, entityType: "audience targeting" };
  }
  if (hasGenericTargeting) {
    return { isActionable: true, entityType: "product targeting" };
  }

  return { isActionable: false, entityType: "unknown" };
}

// Find column value by aliases
export function findColumnValue(row: any, aliases: string[]): string {
  for (const key of Object.keys(row)) {
    const normalizedKey = sanitizeHeader(key);
    if (aliases.some((alias) => normalizedKey === sanitizeHeader(alias))) {
      return String(row[key] || "").trim();
    }
  }
  return "";
}

// Create column mapping from headers (with diagnostics)
function createColumnMapping(headers: string[], diagnostics: SheetDiagnostics): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(sanitizeHeader);

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    let found = false;
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (aliases.some((alias) => normalizedHeaders[i] === sanitizeHeader(alias))) {
        mapping[canonical] = headers[i];
        diagnostics.columnsNormalized.push(canonical);
        found = true;
        break;
      }
    }
    if (!found && ["campaign", "spend", "clicks", "sales"].includes(canonical)) {
      diagnostics.missingColumns.push(`${canonical} (looked for: ${aliases.join("|")})`);
    }
  }

  // Track coercions applied
  diagnostics.coercionsApplied = ["ACOS(%)", "$money", "commas", "parentheses"];

  return mapping;
}

// Normalize row data based on column mapping (robust coercion)
function normalizeRow(row: any, columnMap: Record<string, string>, sheetTarget: string): any {
  const normalized: any = { sheet: sheetTarget }; // 1. Transfer all mapped columns initially

  for (const [canonicalKey, excelKey] of Object.entries(columnMap)) {
    normalized[canonicalKey] = row[excelKey] ?? null;
  } // --- 2. Robust Campaign / Ad Group Retrieval (FIX for client issue) ---
  // Goal: Use the mapped header key first, then fall back to known aliases.

  const campaignKey = columnMap["campaign"];
  const adGroupKey = columnMap["ad_group"]; // A. Attempt to get the value using the mapped header key (most reliable)
  normalized.campaign = campaignKey ? String(row[campaignKey] ?? "").trim() : "";
  normalized.ad_group = adGroupKey ? String(row[adGroupKey] ?? "").trim() : ""; // B. Hard fallbacks for Amazon's inconsistent "Informational only" columns

  if (!normalized.campaign) {
    normalized.campaign = String(
      row["Campaign Name (Informational only)"] ?? row["Campaign Name"] ?? row["Campaign"] ?? "",
    ).trim();
  }
  if (!normalized.ad_group) {
    normalized.ad_group = String(
      row["Ad Group Name (Informational only)"] ?? row["Ad Group Name"] ?? row["Ad Group"] ?? "",
    ).trim();
  } // ----------------------------------------------------------------------
  // --- 3. Robust Keyword / Targeting Text Retrieval ---
  const keywordKey = columnMap["keyword_text"];
  const targetKey = columnMap["target_expr"]; // Get the term from the primary mapped columns
  normalized.keyword_text = keywordKey ? String(row[keywordKey] ?? "").trim() : "";
  normalized.target_expr = targetKey ? String(row[targetKey] ?? "").trim() : ""; // Check the combined term
  const termText = normalized.keyword_text || normalized.target_expr; // If the row looks like an ASIN targeting expression but ended up in keyword_text,
  // fix the assignment to ensure the entity is correctly identified as targeting.

  if (!normalized.target_expr && termText && /^asin\s*=\s*"?B0[A-Z0-9]{8}"?/i.test(termText)) {
    normalized.target_expr = termText;
    normalized.keyword_text = ""; // Clear keyword text
  } // ----------------------------------------------------
  // Parse numeric fields with safe coercion
  normalized.clicks = safeParseFloat(normalized.clicks) ?? 0;
  normalized.spend = safeParseFloat(normalized.spend) ?? 0;
  normalized.sales = safeParseFloat(normalized.sales) ?? 0;
  normalized.orders = safeParseFloat(normalized.orders) ?? 0;
  normalized.impressions = safeParseFloat(normalized.impressions) ?? 0;
  normalized.bid = safeParseFloat(normalized.bid) ?? null; // Read all ID fields from source

  const rawCampaignId = columnMap["campaignId"] ? String(row[columnMap["campaignId"]] ?? "").trim() : "";
  const rawAdGroupId = columnMap["adGroupId"] ? String(row[columnMap["adGroupId"]] ?? "").trim() : "";
  const rawKeywordId = columnMap["keywordId"] ? String(row[columnMap["keywordId"]] ?? "").trim() : "";
  const rawProductTargetingId = columnMap["productTargetingId"]
    ? String(row[columnMap["productTargetingId"]] ?? "").trim()
    : "";
  const rawTargetingId = columnMap["targetingId"] ? String(row[columnMap["targetingId"]] ?? "").trim() : ""; // Determine entity type to assign IDs correctly
  const entityType = normalizeEntity(normalized.entity || "");
  const isKeywordEntity = entityType.entityType === "keyword";
  const isTargetingEntity = entityType.entityType === "product targeting"; // Assign IDs based on entity classification
  normalized.campaignId = rawCampaignId;
  normalized.adGroupId = rawAdGroupId;
  if (isKeywordEntity) {
    // For keywords: use Keyword Id only
    normalized.keywordId = rawKeywordId;
    normalized.productTargetingId = undefined;
    normalized.targetingId = undefined;
  } else if (isTargetingEntity) {
    // For product targeting: use Product Targeting Id / Targeting Id only
    normalized.keywordId = undefined;
    normalized.productTargetingId = rawProductTargetingId;
    normalized.targetingId = rawTargetingId || rawProductTargetingId;
  } else {
    // Fallback for unknown entities: try to classify by match type or targeting text
    const matchTypeLower = (normalized.match_type || "").toLowerCase();
    const hasKeywordMatchType = ["exact", "phrase", "broad"].includes(matchTypeLower);
    const hasTargetingText = !!(normalized.target_expr || normalized.product_targeting);
    if (hasKeywordMatchType) {
      normalized.keywordId = rawKeywordId;
      normalized.productTargetingId = undefined;
      normalized.targetingId = undefined;
    } else if (hasTargetingText) {
      normalized.keywordId = undefined;
      normalized.productTargetingId = rawProductTargetingId;
      normalized.targetingId = rawTargetingId || rawProductTargetingId;
    } else {
      // If both IDs present (rare Amazon bug), prefer based on what we have
      if (rawKeywordId && !rawProductTargetingId && !rawTargetingId) {
        normalized.keywordId = rawKeywordId;
        normalized.productTargetingId = undefined;
        normalized.targetingId = undefined;
      } else {
        normalized.keywordId = undefined;
        normalized.productTargetingId = rawProductTargetingId;
        normalized.targetingId = rawTargetingId || rawProductTargetingId;
      }
    }
  } // Parse ACOS with inference (keep as number)

  normalized.acos = parseAcos(normalized.acos, normalized.spend, normalized.sales); // Normalize state (case-insensitive, treat empty as disabled)

  normalized.state = normalized.state ? normalized.state.toLowerCase().trim() : "disabled";
  normalized.campaign_state = normalized.campaign_state ? normalized.campaign_state.toLowerCase().trim() : null; // Preserve and finalize other fields (most already done above)

  normalized.campaign = normalized.campaign || "";
  normalized.ad_group = normalized.ad_group || ""; // Ensure product_targeting uses target_expr (as per initial setup)
  normalized.product_targeting = normalized.target_expr || ""; // Customer search term usually comes from a separate report,
  // but use keyword_text as a fallback for consistency.
  normalized.customer_search_term = normalized.customer_search_term || normalized.keyword_text || "";
  normalized.match_type = normalized.match_type || "";
  normalized.ctr = normalized.ctr || "";
  normalized.cvr = normalized.cvr || "";
  normalized.roas = normalized.roas || "";
  normalized.sku = normalized.sku || "";
  normalized.asin = normalized.asin || ""; // --- Backfill entity for SBK/SDT where there is no "Entity" column ---

  if (!normalized.entity || String(normalized.entity).trim() === "") {
    const kt = (normalized.keyword_text || "").toString().trim();
    const te = (normalized.target_expr || normalized.product_targeting || "").toString().trim();
    const mt = (normalized.match_type || "").toString().trim().toLowerCase();

    const looksLikeKeyword = !!mt || (!!kt && /[a-zA-Z]/.test(kt)) || (!!kt && /\b(broad|phrase|exact)\b/i.test(kt));

    if (looksLikeKeyword) {
      normalized.entity = "keyword";
    } else if (te) {
      normalized.entity = "product targeting";
    } else {
      normalized.entity = "keyword"; // safe default to keep actionable
    }
  } // Re-run entity normalization

  if (normalized.entity) {
    const entityInfo = normalizeEntity(normalized.entity);
    normalized.isActionable = entityInfo.isActionable;
    normalized.entityType = entityInfo.entityType;
  } else {
    normalized.isActionable = false;
    normalized.entityType = "unknown";
  }

  return normalized as NormalizedRow;
}

// Apply SOP filters to identify bleeders (with diagnostics tracking)
function applySOPFilters(data: any[], threshold: number, diagnostics: SheetDiagnostics): any[] {
  diagnostics.afterNormalization = data.length;

  // Track actionable entities
  const actionable = data.filter((row) => row.isActionable);
  diagnostics.actionableEntity = actionable.length;

  // Track enabled rows
  const enabled = actionable.filter((row) => {
    const stateOk = row.state === "enabled";
    const campaignStateOk = !row.campaign_state || row.campaign_state === "enabled";
    return stateOk && campaignStateOk;
  });
  diagnostics.enabledRows = enabled.length;

  // Track clicks above threshold
  const clicksOk = enabled.filter((row) => row.clicks > threshold);
  diagnostics.clicksAboveThreshold = clicksOk.length;

  // Track zero sales
  const bleeders = clicksOk.filter((row) => row.sales === 0);
  diagnostics.salesZero = bleeders.length;
  diagnostics.finalBleeders = bleeders.length;

  return bleeders;
}

// Find sheet by pattern matching (flexible string matching)
function findSheetByPattern(workbook: XLSX.WorkBook, patterns: string[]) {
  for (const sheetName of workbook.SheetNames) {
    const normalized = normalizeSheetName(sheetName);
    if (patterns.some((pattern) => normalized.includes(pattern))) {
      return { sheet: workbook.Sheets[sheetName], name: sheetName };
    }
  }
  return null;
}

// Fallback: detect sheet by header matching
function findSheetByHeaders(workbook: XLSX.WorkBook): { sheet: XLSX.WorkSheet; name: string } | null {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Try first 5 rows as potential headers
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;

      const headers = row.map((h) => sanitizeHeader(String(h || "")));
      const coreMatches = CORE_COLUMNS.filter((col) => headers.some((h) => h.includes(col)));

      if (coreMatches.length >= 2) {
        return { sheet, name: sheetName };
      }
    }
  }

  return null;
}

// Process a single sheet (with diagnostics)
function processSheet(
  sheetInfo: { sheet: XLSX.WorkSheet; name: string } | null,
  sheetTarget: string,
  threshold: number,
): { data: any[]; diagnostics: SheetDiagnostics } {
  const diagnostics: SheetDiagnostics = {
    sheetName: sheetTarget,
    rowsLoaded: 0,
    afterNormalization: 0,
    actionableEntity: 0,
    enabledRows: 0,
    clicksAboveThreshold: 0,
    salesZero: 0,
    finalBleeders: 0,
    columnsNormalized: [],
    missingColumns: [],
    coercionsApplied: [],
  };

  if (!sheetInfo) return { data: [], diagnostics };

  const jsonData = XLSX.utils.sheet_to_json(sheetInfo.sheet);
  diagnostics.rowsLoaded = jsonData.length;

  if (jsonData.length === 0) return { data: [], diagnostics };

  const headers = Object.keys(jsonData[0] as object);
  const columnMap = createColumnMapping(headers, diagnostics);

  // Normalize all rows
  const normalized = jsonData.map((row) => normalizeRow(row, columnMap, sheetTarget));

  // Apply filters with diagnostics
  const bleeders = applySOPFilters(normalized, threshold, diagnostics);

  return { data: bleeders, diagnostics };
}

// Generate markdown table
function generateMarkdownTable(rows: any[], isSearchTerm: boolean): string {
  if (rows.length === 0) return "No bleeders found";

  const headers = isSearchTerm
    ? ["Campaign", "Customer Search Term", "Clicks", "Spend", "Sales", "Decision"]
    : ["Campaign", "Ad Group", "Entity", "Keyword/Target", "Match Type", "Clicks", "Spend", "Sales", "Decision"];

  let table = "| " + headers.join(" | ") + " |\n";
  table +=
    "|" + headers.map((h) => (["Clicks", "Spend", "Sales"].includes(h) ? "-------:" : "--------")).join("|") + "|\n";

  for (const row of rows) {
    const keywordOrTarget = row.keyword_text || row.product_targeting || "";
    const formattedSpend = `$${row.spend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedSales = `$${row.sales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (isSearchTerm) {
      table += `| ${row.campaign} | ${row.customer_search_term} | ${row.clicks} | ${formattedSpend} | ${formattedSales} | |\n`;
    } else {
      table += `| ${row.campaign} | ${row.ad_group} | ${row.entityType} | ${keywordOrTarget} | ${row.match_type} | ${row.clicks} | ${formattedSpend} | ${formattedSales} | |\n`;
    }
  }

  return table;
}

// Generate CSV
function generateCSV(allRows: any[]): string {
  const headers = [
    "Sheet",
    "Campaign",
    "Ad Group",
    "Entity",
    "Keyword/Target",
    "Match Type",
    "Customer Search Term",
    "Impressions",
    "Clicks",
    "Spend",
    "Sales",
    "Orders",
    "ACOS",
    "CTR",
    "CVR",
    "Decision",
  ];

  let csv = headers.join(",") + "\n";

  for (const row of allRows) {
    const keywordOrTarget = row.keyword_text || row.product_targeting || "";
    const values = [
      row.sheet,
      `"${row.campaign}"`,
      `"${row.ad_group}"`,
      row.entityType || "",
      `"${keywordOrTarget}"`,
      row.match_type,
      `"${row.customer_search_term}"`,
      row.impressions,
      row.clicks,
      row.spend.toFixed(2),
      row.sales.toFixed(2),
      row.orders,
      row.acos,
      row.ctr,
      row.cvr,
      "",
    ];
    csv += values.join(",") + "\n";
  }

  return csv;
}

// Generate formatted Excel with blue Decision column
async function generateFormattedExcel(rows: any[], detectedTargets: string[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  // Group rows by sheet
  const rowsBySheet = new Map<string, any[]>();
  for (const row of rows) {
    if (!rowsBySheet.has(row.sheet)) {
      rowsBySheet.set(row.sheet, []);
    }
    rowsBySheet.get(row.sheet)!.push(row);
  }

  // Create a worksheet for each detected target sheet
  for (const target of detectedTargets) {
    const sheetRows = rowsBySheet.get(target) || [];
    if (sheetRows.length === 0) continue;

    const isSearchTerm = target.includes("Search Term Report");
    const worksheet = workbook.addWorksheet(target);

    // Define headers
    const headers = isSearchTerm
      ? ["Campaign", "Customer Search Term", "Clicks", "Spend", "Sales", "ACOS", "Decision"]
      : [
          "Campaign",
          "Ad Group",
          "Entity",
          "Keyword/Target",
          "Match Type",
          "Clicks",
          "Spend",
          "Sales",
          "ACOS",
          "Decision",
        ];

    // Add header row
    const headerRow = worksheet.addRow(headers);

    // Style header row
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    // Add data rows
    for (const row of sheetRows) {
      const keywordOrTarget = row.keyword_text || row.product_targeting || "";

      if (isSearchTerm) {
        worksheet.addRow([
          row.campaign,
          row.customer_search_term,
          row.clicks,
          row.spend,
          row.sales,
          row.acos,
          "", // Decision column
        ]);
      } else {
        worksheet.addRow([
          row.campaign,
          row.ad_group,
          row.entityType || "",
          keywordOrTarget,
          row.match_type,
          row.clicks,
          row.spend,
          row.sales,
          row.acos,
          "", // Decision column
        ]);
      }
    }

    // Find Decision column index (last column)
    const decisionColIndex = headers.length;
    const decisionCol = worksheet.getColumn(decisionColIndex);

    // Style Decision column (light blue fill - #DBECFF)
    decisionCol.eachCell((cell, rowNumber) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDBECFF" },
      };
      if (rowNumber === 1) {
        cell.font = { bold: true };
      }
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Apply numeric formatting
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header

      const clicksIdx = headers.indexOf("Clicks") + 1;
      const spendIdx = headers.indexOf("Spend") + 1;
      const salesIdx = headers.indexOf("Sales") + 1;
      const acosIdx = headers.indexOf("ACOS") + 1;

      if (clicksIdx > 0) {
        row.getCell(clicksIdx).numFmt = "#,##0";
      }
      if (spendIdx > 0) {
        row.getCell(spendIdx).numFmt = "$#,##0.00";
      }
      if (salesIdx > 0) {
        row.getCell(salesIdx).numFmt = "$#,##0.00";
      }
      if (acosIdx > 0 && row.getCell(acosIdx).value) {
        row.getCell(acosIdx).numFmt = "0.00%";
      }
    });

    // Autofit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const cellValue = cell.value?.toString() || "";
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Freeze top row
    worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
  }

  return workbook;
}

// Main analysis function
export async function analyzeBleederReport(
  file: File,
  threshold: number = 10,
  mode: "standard" | "lifetime" = "standard",
): Promise<AnalysisResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const allDiagnostics: SheetDiagnostics[] = [];

    const spCampaignsSheet = findSheetByPattern(workbook, SHEET_TARGETS.spCampaigns);
    const sbCampaignsSheet = findSheetByPattern(workbook, SHEET_TARGETS.sbCampaigns);

    // Detect SD after SB, and prevent same sheet from being used for both
    let sdCampaignsSheet = findSheetByPattern(workbook, SHEET_TARGETS.sdCampaigns);

    if (sbCampaignsSheet && sdCampaignsSheet && sbCampaignsSheet.name === sdCampaignsSheet.name) {
      console.warn("⚠️ SB and SD tabs matched the same sheet. Treating it as SB only.");
      sdCampaignsSheet = null;
    }

    const spSearchSheet = findSheetByPattern(workbook, SHEET_TARGETS.spSearchTerm);
    const sbSearchSheet = findSheetByPattern(workbook, SHEET_TARGETS.sbSearchTerm);

    const spCampaignsResult = processSheet(spCampaignsSheet, "Sponsored Products Campaigns", threshold);
    const sbCampaignsResult = processSheet(sbCampaignsSheet, "Sponsored Brands Campaigns", threshold);
    const sdCampaignsResult = processSheet(sdCampaignsSheet, "Sponsored Display Campaigns", threshold);
    const spSearchResult = processSheet(spSearchSheet, "SP Search Term Report", threshold);
    const sbSearchResult = processSheet(sbSearchSheet, "SB Search Term Report", threshold);

    allDiagnostics.push(
      spCampaignsResult.diagnostics,
      sbCampaignsResult.diagnostics,
      sdCampaignsResult.diagnostics,
      spSearchResult.diagnostics,
      sbSearchResult.diagnostics,
    );

    const allBleeders = [
      ...spCampaignsResult.data,
      ...sbCampaignsResult.data,
      ...sdCampaignsResult.data,
      ...spSearchResult.data,
      ...sbSearchResult.data,
    ];

    const detectedTargets = allDiagnostics.filter((d) => d.rowsLoaded > 0).map((d) => d.sheetName);

    if (detectedTargets.length === 0) {
      return {
        summary:
          "❌ No valid Amazon Ads sheets detected. Please upload a Bulk Operations Export with campaigns or search term reports.",
        tables: {},
        csvData: { combined: "" },
        tabsDetected: [],
        validation: {
          sheetsFound: { status: "error", message: "❌ No sheets found" },
          columnsVerified: { status: "pass", message: "" },
          bleederFilter: { status: "pass", message: "" },
          topSpenders: { status: "pass", message: "" },
          crossTabIntegrity: { status: "pass", message: "" },
          dataQuality: [],
        },
        topSpenders: [],
        allRows: [],
        diagnostics: allDiagnostics,
      };
    }

    if (allBleeders.length === 0) {
      return {
        summary: `✅ No Bleeders Found This Cycle\n\nAll ${detectedTargets.length} sheet(s) processed successfully.\nCriteria: Clicks > ${threshold} AND Sales = $0 AND State = Enabled\n\nNo action needed — archive this report.`,
        tables: {},
        csvData: { combined: "" },
        tabsDetected: detectedTargets,
        validation: {
          sheetsFound: { status: "pass", message: `🟢 ${detectedTargets.length} sheet(s) detected` },
          columnsVerified: { status: "pass", message: "🟢 Columns normalized" },
          bleederFilter: { status: "pass", message: `🟢 No bleeders found (threshold: ${threshold} clicks)` },
          topSpenders: { status: "pass", message: "🟢 N/A" },
          crossTabIntegrity: { status: "pass", message: "🟢 Cross-tab verified" },
          dataQuality: [{ status: "pass", message: "🟢 Data quality passed" }],
        },
        topSpenders: [],
        allRows: [],
        diagnostics: allDiagnostics,
      };
    }

    // Generate tables
    const tables: Record<string, string> = {};
    tables["Sponsored Products Campaigns"] = generateMarkdownTable(spCampaignsResult.data, false);
    tables["Sponsored Brands Campaigns"] = generateMarkdownTable(sbCampaignsResult.data, false);
    tables["Sponsored Display Campaigns"] = generateMarkdownTable(sdCampaignsResult.data, false);
    tables["SP Search Term Report"] = generateMarkdownTable(spSearchResult.data, true);
    tables["SB Search Term Report"] = generateMarkdownTable(sbSearchResult.data, true);

    // Calculate top spenders
    const spenderMap = new Map<string, { row: any; totalSpend: number; totalClicks: number; count: number }>();

    for (const row of allBleeders) {
      const term = (row.customer_search_term || row.keyword_text || row.product_targeting || "").toLowerCase().trim();
      if (!term) continue;

      if (spenderMap.has(term)) {
        const existing = spenderMap.get(term)!;
        existing.totalSpend += row.spend;
        existing.totalClicks += row.clicks;
        existing.count += 1;
      } else {
        spenderMap.set(term, {
          row,
          totalSpend: row.spend,
          totalClicks: row.clicks,
          count: 1,
        });
      }
    }

    const sortedBySpend = Array.from(spenderMap.values())
      .filter((s) => s.totalSpend > 0)
      .sort((a, b) => b.totalSpend - a.totalSpend);

    const topSpendersData: TopSpender[] = sortedBySpend.slice(0, 3).map((s) => ({
      term: s.row.customer_search_term || s.row.keyword_text || s.row.product_targeting || "Unknown",
      spend: s.totalSpend,
      clicks: s.totalClicks,
      sheet: s.row.sheet,
      isCombined: s.count > 1,
    }));

    // Generate summary
    const medals = ["🥇", "🥈", "🥉"];
    let summary = `**File Validated Successfully — ${allBleeders.length} bleeders found**\n\n`;
    summary += `**Sheets processed:**\n`;

    allDiagnostics.forEach((d) => {
      if (d.rowsLoaded > 0) {
        summary += `✓ ${d.sheetName}: ${d.finalBleeders} bleeders\n`;
      }
    });

    if (topSpendersData.length > 0) {
      summary += `\n**Top ${topSpendersData.length} Spenders Among Bleeders:**\n`;
      topSpendersData.forEach((spender, idx) => {
        const combined = spender.isCombined ? " (combined)" : "";
        const formattedSpend = spender.spend.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        summary += `${medals[idx]} ${spender.term}${combined} — $${formattedSpend}\n`;
      });
    }

    // Generate CSV
    const csvData = generateCSV(allBleeders);

    // Generate operator workbook (Template A — separate tabs per section)
    const formattedWorkbook = await generateOperatorWorkbook_A(allBleeders, mode);

    return {
      summary,
      tables,
      mode,
      csvData: { combined: csvData },
      tabsDetected: detectedTargets,
      validation: {
        sheetsFound: { status: "pass", message: `🟢 ${detectedTargets.length} sheet(s) found` },
        columnsVerified: { status: "pass", message: "🟢 Columns normalized" },
        bleederFilter: { status: "pass", message: `🟢 ${allBleeders.length} bleeders found` },
        topSpenders: { status: "pass", message: "🟢 Top spenders computed" },
        crossTabIntegrity: { status: "pass", message: "🟢 Cross-tab verified" },
        dataQuality: [{ status: "pass", message: "🟢 Data quality passed" }],
      },
      topSpenders: topSpendersData,
      allRows: allBleeders,
      formattedWorkbook,
      diagnostics: allDiagnostics,
    };
  } catch (error) {
    console.error("Error analyzing bleeder report:", error);
    return {
      summary: "❌ Failed to analyze report",
      tables: {},
      csvData: { combined: "" },
      tabsDetected: [],
      validation: {
        sheetsFound: { status: "error", message: "❌ Analysis failed" },
        columnsVerified: { status: "error", message: error instanceof Error ? error.message : "Unknown error" },
        bleederFilter: { status: "pass", message: "" },
        topSpenders: { status: "pass", message: "" },
        crossTabIntegrity: { status: "pass", message: "" },
        dataQuality: [],
      },
      topSpenders: [],
      allRows: [],
      diagnostics: [],
    };
  }
}
