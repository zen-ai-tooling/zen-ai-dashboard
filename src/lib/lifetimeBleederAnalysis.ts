/**
 * Lifetime Bleeder Analysis — Two-File Merge Logic
 * 
 * This analyzer requires two files:
 * 1. Lifetime Targeting Report (CSV/Excel from Campaign Manager Targeting Tab with Lifetime filter)
 * 2. Reference Bulk File (60-day Amazon Bulk Operations export for ID mapping)
 * 
 * It filters for targets with 10+ clicks and 0 sales/orders, excluding ranking campaigns,
 * then merges IDs from the Bulk file to produce a decision-ready output.
 */

import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { 
  buildBulkRowsFromCanonical, 
  bulkRowToArray, 
  BULK_UPDATE_HEADERS,
  recordTypeToProductEntity,
  type AmazonProduct,
  type CanonicalBulkInputRow,
  type AmazonRecordType
} from "./amazonBulkBuilder";

// Configurable threshold
export const LIFETIME_CLICK_THRESHOLD = 10;

// Campaign name patterns to exclude
const RANKING_PATTERNS = [/rank/i, /ranking/i, /launch/i];

export interface LifetimeBleederRow {
  campaignName: string;
  adGroupName: string;
  targetingText: string;
  matchType?: string;
  clicks: number;
  orders: number;
  sales: number;
  spend: number;
  impressions?: number;
  cpc?: number;
  acos?: number;
  // IDs from Bulk file mapping
  campaignId?: string;
  adGroupId?: string;
  keywordId?: string;
  productTargetingId?: string;
  targetingId?: string;
  // Pre-filled decision
  decision: string;
  // Source tracking
  source?: "SP" | "SB" | "SD";
  // Entity type
  entityType?: string;
}

// Skipped item for error log
export interface SkippedItemRow {
  campaignName: string;
  adGroupName: string;
  targeting: string;
  clicks: number;
  reason: string;
}

export interface LifetimeBleederResult {
  bleeders: LifetimeBleederRow[];
  totalRows: number;
  filteredCount: number;
  unmappableCount: number;
  excludedRankingCount: number;
  totalSpend: number;
  decisionWorkbook: ExcelJS.Workbook;
  decisionFileName: string;
  // Grouped by channel for multi-tab output
  groupedBleeders: {
    sp: LifetimeBleederRow[];
    sb: LifetimeBleederRow[];
    sd: LifetimeBleederRow[];
  };
  // Skipped items for transparency log
  skippedItems: SkippedItemRow[];
}

interface BulkIdMap {
  campaignId: string;
  adGroupId: string;
  keywordId?: string;
  productTargetingId?: string;
  targetingId?: string;
  source?: "SP" | "SB" | "SD";
  matchType?: string;
}

// Normalize text for matching
const normalizeText = (text: string): string =>
  String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeHeader = (header: string): string =>
  String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Normalize match type for key generation
 * Strips prefixes like "Keyword - " and lowercases
 * Examples: "Keyword - Broad" -> "broad", "EXACT" -> "exact", "Product Targeting" -> "producttargeting"
 */
const normalizeMatchType = (matchType: string): string => {
  let mt = String(matchType ?? "").trim().toLowerCase();
  // Strip common prefixes
  mt = mt.replace(/^keyword\s*[-–—]\s*/i, "");
  mt = mt.replace(/^targeting\s*[-–—]\s*/i, "");
  // Remove spaces and special chars
  mt = mt.replace(/[^a-z0-9]/g, "");
  return mt;
};

// Alias lookups for column detection - LIFETIME REPORT (Amazon UI Export)
const LIFETIME_REPORT_ALIASES = {
  campaign: ["Campaign", "Campaign Name", "Campaign Name (Informational only)"],
  adGroup: ["Ad group", "Ad Group", "Ad Group Name", "Ad Group Name (Informational only)"],
  targeting: ["Target", "Targeting", "Keyword Text", "Keyword", "Targeting Expression"],
  matchType: ["Targeting type", "Match Type", "MatchType"],
  clicks: ["Clicks"],
  orders: [
    "Orders",
    "14 Day Total Orders (#)",
    "7 Day Total Orders (#)",
    "Total Orders (#)",
    "14 Day Total Orders",
    "7 Day Total Orders",
    "Total Orders",
  ],
  sales: [
    "Sales",
    "14 Day Total Sales",
    "7 Day Total Sales",
    "Total Sales",
    "14 Day Total Sales - (Click)",
  ],
  spend: ["Spend", "Cost", "Spend ($)"],
  impressions: ["Impressions", "Viewable Impressions"],
  // Status columns for Ghost Buster filtering
  campaignStatus: ["Campaign Status", "Campaign State", "Campaign state"],
  adGroupStatus: ["Ad Group Status", "Ad Group State", "Ad group state"],
  status: ["Status", "State", "Targeting Status", "Keyword Status"],
};

// Alias lookups for BULK FILE (Amazon Bulk Operations Export)
// CRITICAL: Prioritize "(Informational only)" columns because standard columns are EMPTY for child entity rows
// Amazon Bulk files have Campaign Name in Column J (empty for keywords) but "Campaign Name (Informational only)" in Column K (populated)
const BULK_FILE_ALIASES = {
  // CRITICAL ORDER: Informational columns FIRST - they are always populated for keyword/targeting rows
  campaign: ["Campaign Name (Informational only)", "Campaign Name", "Campaign", "CampaignName"],
  adGroup: ["Ad Group Name (Informational only)", "Ad Group Name", "Ad Group", "AdGroup Name", "AdGroupName"],
  // IMPORTANT: Comprehensive keyword detection - prioritize resolved/informational columns
  keywordText: [
    "Keyword Text (Informational only)",
    "Keyword (Informational only)",
    "Keyword Text",
    "Keyword",
    "KeywordText",
  ],
  productTargeting: [
    // CRITICAL: Resolved/Informational columns FIRST - they contain the actual targeting expression
    "Resolved Targeting Expression (Informational only)",
    "Resolved Product Targeting Expression (Informational only)",
    "Product Targeting Expression",
    "Targeting Expression",
    "Product Targeting",
    "Targeting",
    "TargetingExpression",
  ],
  matchType: ["Match Type", "MatchType", "Match type", "Targeting Type"],
  campaignId: ["Campaign Id", "CampaignId", "Campaign ID", "CampaignID"],
  adGroupId: ["Ad Group Id", "AdGroupId", "Ad Group ID", "AdGroupID"],
  keywordId: ["Keyword Id", "KeywordId", "Keyword ID", "KeywordID"],
  productTargetingId: ["Product Targeting Id", "ProductTargetingId", "Product Targeting ID", "ProductTargetingID"],
  targetingId: ["Targeting Id", "TargetingId", "Targeting ID", "TargetingID"],
  // Entity/Record Type column - used to identify row type
  entity: ["Entity", "Record Type", "Type", "RecordType"],
};

const findColumn = (headers: string[], aliases: string[]): number => {
  const norm = headers.map((h) => normalizeHeader(h));
  for (const alias of aliases) {
    const idx = norm.indexOf(normalizeHeader(alias));
    if (idx !== -1) return idx;
  }
  return -1;
};

const safeParseFloat = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;
  let str = String(value).trim();
  str = str.replace(/[$,%\s]/g, "");
  str = str.replace(/,/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const isRankingCampaign = (campaignName: string): boolean =>
  RANKING_PATTERNS.some((pattern) => pattern.test(campaignName));

// Infer source from campaign name or sheet name
const inferSource = (campaignName: string, sheetName?: string): "SP" | "SB" | "SD" => {
  const lower = campaignName.toLowerCase();
  if (lower.includes("sp_") || lower.includes("sp ") || lower.includes("sponsored product")) return "SP";
  if (lower.includes("sb_") || lower.includes("sb ") || lower.includes("sponsored brand")) return "SB";
  if (lower.includes("sd_") || lower.includes("sd ") || lower.includes("sponsored display")) return "SD";
  
  // Fallback to sheet name
  if (sheetName) {
    const sn = sheetName.toLowerCase();
    if (sn.includes("sponsored products") || sn.includes("sp ")) return "SP";
    if (sn.includes("sponsored brands") || sn.includes("sb ")) return "SB";
    if (sn.includes("sponsored display") || sn.includes("sd ")) return "SD";
  }
  
  return "SP"; // Default to SP
};

// Classify entity type based on targeting text
// Supports: Keyword, Product Targeting, Audience Targeting, Contextual Targeting
const classifyEntityType = (targetingText: string, matchType?: string, entityHint?: string): string => {
  const lower = (targetingText || "").toLowerCase();
  const hintLower = (entityHint || "").toLowerCase();
  
  // Explicit entity hint from Entity column takes precedence
  if (hintLower.includes("audience targeting") || hintLower.includes("audience")) {
    return "Audience Targeting";
  }
  if (hintLower.includes("contextual targeting")) {
    // Contextual Targeting uses Product Targeting ID column
    return "Product Targeting";
  }
  
  // Audience targeting patterns (SD VCPM)
  if (
    lower.includes("views=") ||
    lower.includes("purchases=") ||
    lower.includes("audience:") ||
    lower.includes("in-market") ||
    lower.includes("lifestyle")
  ) {
    return "Audience Targeting";
  }
  
  // Product targeting patterns
  if (
    lower.includes("asin=") ||
    lower.includes("category=") ||
    lower.includes("brand=") ||
    lower.includes("price=") ||
    lower.includes("rating=")
  ) {
    return "Product Targeting";
  }
  
  // SP Auto targeting types (close-match, loose-match, substitutes, complements)
  // These are system-generated targets that use Product Targeting ID, not Keyword ID
  if (
    lower.includes("close-match") ||
    lower.includes("loose-match") ||
    lower.includes("substitutes") ||
    lower.includes("complements")
  ) {
    return "Product Targeting";
  }
  
  // If we have a keyword match type, it's a keyword
  const mt = (matchType || "").toLowerCase();
  if (["exact", "phrase", "broad"].includes(mt)) {
    return "Keyword";
  }
  
  // Default to Keyword for text-based targets
  return "Keyword";
};

/**
 * Determine the reason why a bleeder couldn't be mapped
 */
const determineSkipReason = (
  targetingText: string,
  campaignName: string,
  bulkCampaignNames: Set<string>
): string => {
  const lowerTarget = targetingText.toLowerCase();
  
  // Check for expanded auto-targets first (these can't be paused via bulk)
  if (
    lowerTarget.includes("expanded") ||
    lowerTarget.includes("substitutes") ||
    lowerTarget.includes("complements") ||
    lowerTarget.includes("audience:")
  ) {
    return "System Auto-Target (Cannot pause via Bulk)";
  }
  
  // Check if the campaign itself isn't in the bulk file
  const normalizedCampaign = normalizeText(campaignName);
  if (!bulkCampaignNames.has(normalizedCampaign)) {
    return "Campaign Not Found in 30-Day Bulk File";
  }
  
  // Default reason
  return "Target ID Missing";
};

/**
 * Build ID lookup map from Bulk file — PHONE BOOK LOGIC
 * 
 * CRITICAL: This function acts STRICTLY as an ID lookup. It does NOT filter by:
 * - Performance metrics (clicks, spend, impressions, orders)
 * - State/Status (enabled, paused, archived)
 * 
 * It ONLY filters by:
 * - Entity type: Must be a Keyword, Product Targeting, or Audience Targeting row
 * - Required IDs: Must have Campaign ID (needed for UPDATE operations)
 * 
 * Returns both the ID map and a set of normalized campaign names for reason determination
 */
const buildBulkIdMap = (bulkWorkbook: XLSX.WorkBook): { idMap: Map<string, BulkIdMap>; campaignNames: Set<string> } => {
  const idMap = new Map<string, BulkIdMap>();
  const campaignNames = new Set<string>();

  // Valid entity types that we want to capture (targeting-level rows only)
  // IMPORTANT: These are case-insensitive partial matches
  // Expanded to include Contextual Targeting (SD) and Audience Targeting (SD VCPM)
  const TARGETING_ENTITY_TYPES = [
    "keyword",
    "product targeting",
    "audience targeting",
    "contextual targeting",
    "negative keyword",
    "negative product targeting",
    "campaign negative keyword",
  ];

  // Debug counters
  let totalRowsProcessed = 0;
  let rowsSkippedNoCampaign = 0;
  let rowsSkippedNoTargeting = 0;
  let rowsSkippedNoCampaignId = 0;

  for (const sheetName of bulkWorkbook.SheetNames) {
    const sheet = bulkWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
    if (data.length < 2) continue;

    const headers = data[0].map((h) => String(h ?? ""));
    
    // Log detected columns for debugging
    console.log(`[LIFETIME] Processing sheet: "${sheetName}" with ${data.length - 1} rows`);
    
    const campaignCol = findColumn(headers, BULK_FILE_ALIASES.campaign);
    const adGroupCol = findColumn(headers, BULK_FILE_ALIASES.adGroup);
    const keywordTextCol = findColumn(headers, BULK_FILE_ALIASES.keywordText);
    const productTargetingCol = findColumn(headers, BULK_FILE_ALIASES.productTargeting);
    const matchTypeCol = findColumn(headers, BULK_FILE_ALIASES.matchType);
    const entityCol = findColumn(headers, BULK_FILE_ALIASES.entity);
    
    const campaignIdCol = findColumn(headers, BULK_FILE_ALIASES.campaignId);
    const adGroupIdCol = findColumn(headers, BULK_FILE_ALIASES.adGroupId);
    const keywordIdCol = findColumn(headers, BULK_FILE_ALIASES.keywordId);
    const productTargetingIdCol = findColumn(headers, BULK_FILE_ALIASES.productTargetingId);
    const targetingIdCol = findColumn(headers, BULK_FILE_ALIASES.targetingId);

    // Log column detection results
    console.log(`[LIFETIME] Column detection for "${sheetName}":`, {
      campaignCol,
      adGroupCol,
      keywordTextCol,
      productTargetingCol,
      entityCol,
      campaignIdCol,
      keywordIdCol,
      targetingIdCol,
    });

    if (campaignCol === -1) {
      console.warn(`[LIFETIME] Skipping sheet "${sheetName}" - no Campaign column found`);
      continue;
    }

    let sheetEntriesAdded = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      totalRowsProcessed++;

      const campaignName = String(row[campaignCol] ?? "").trim();
      const adGroupName = adGroupCol !== -1 ? String(row[adGroupCol] ?? "").trim() : "";
      
      // CRITICAL: Capture BOTH keyword text AND product targeting text
      const keywordText = keywordTextCol !== -1 ? String(row[keywordTextCol] ?? "").trim() : "";
      const productTargeting = productTargetingCol !== -1 ? String(row[productTargetingCol] ?? "").trim() : "";
      const rawMatchType = matchTypeCol !== -1 ? String(row[matchTypeCol] ?? "").trim() : "";
      const entityType = entityCol !== -1 ? String(row[entityCol] ?? "").trim().toLowerCase() : "";
      
      // Use keyword text first, then fall back to product targeting
      // Also handle 'substitutes' and 'close-match' auto-targeting which may appear as product targeting
      const targetingText = keywordText || productTargeting;

      // Skip rows with empty campaign names
      if (!campaignName) {
        rowsSkippedNoCampaign++;
        continue;
      }

      // Track ALL campaign names for reason determination (BEFORE any filtering)
      campaignNames.add(normalizeText(campaignName));

      // ENTITY FILTER: Only include targeting-level rows
      // Method 1: Check Entity column if present
      const hasTargetingEntity = entityCol !== -1 && TARGETING_ENTITY_TYPES.some(t => entityType.includes(t));
      // Method 2: Has targeting text (keyword or product targeting expression)
      const hasTargetingText = targetingText.length > 0;
      // Method 3: Special auto-targeting rows (substitutes, close-match, loose-match, complements)
      const isAutoTargeting = productTargeting.toLowerCase().includes("substitutes") ||
                              productTargeting.toLowerCase().includes("close-match") ||
                              productTargeting.toLowerCase().includes("loose-match") ||
                              productTargeting.toLowerCase().includes("complements");
      
      // CRITICAL: Skip rows that are NOT targeting entities (campaign-level, ad-group-level rows)
      // A row is a targeting row if it either has an Entity type we recognize OR has targeting text OR is auto-targeting
      if (!hasTargetingEntity && !hasTargetingText && !isAutoTargeting) {
        rowsSkippedNoTargeting++;
        continue;
      }

      // Normalize matchType - strip prefixes like "Keyword - " and lowercase
      // Examples: "Keyword - Broad" -> "broad", "EXACT" -> "exact"
      const normalizedMatchType = normalizeMatchType(rawMatchType);

      // Create normalized lookup key INCLUDING matchType for disambiguation
      // Key Format: campaign::adGroup::target::matchType
      // This distinguishes between Broad/Phrase/Exact versions of the same keyword
      const key = `${normalizeText(campaignName)}::${normalizeText(adGroupName)}::${normalizeText(targetingText)}::${normalizedMatchType}`;

      // Get Campaign ID - REQUIRED for UPDATE operations
      const campaignId = campaignIdCol !== -1 ? String(row[campaignIdCol] ?? "").trim() : "";
      if (!campaignId) {
        rowsSkippedNoCampaignId++;
        continue;
      }

      // =========================================================================
      // PHONE BOOK LOGIC: NO PERFORMANCE OR STATE FILTERING
      // We capture IDs regardless of:
      // - Clicks (0 or any value)
      // - Spend (0 or any value)
      // - Impressions (0 or any value)
      // - State (Enabled, Paused, Archived)
      // =========================================================================

      const entry: BulkIdMap = {
        campaignId,
        adGroupId: adGroupIdCol !== -1 ? String(row[adGroupIdCol] ?? "").trim() : "",
        keywordId: keywordIdCol !== -1 ? String(row[keywordIdCol] ?? "").trim() : undefined,
        productTargetingId: productTargetingIdCol !== -1 ? String(row[productTargetingIdCol] ?? "").trim() : undefined,
        targetingId: targetingIdCol !== -1 ? String(row[targetingIdCol] ?? "").trim() : undefined,
        source: inferSource(campaignName, sheetName),
        matchType: rawMatchType,
      };

      // Fallback: use Product Targeting ID as Targeting ID if missing
      // This handles 'substitutes', 'close-match' etc. which use Targeting ID
      if (!entry.targetingId && entry.productTargetingId) {
        entry.targetingId = entry.productTargetingId;
      }

      idMap.set(key, entry);
      sheetEntriesAdded++;
    }

    console.log(`[LIFETIME] Sheet "${sheetName}" added ${sheetEntriesAdded} entries to ID map`);
  }

  console.log(`[LIFETIME] PHONE BOOK build complete:`, {
    totalIdMapEntries: idMap.size,
    uniqueCampaigns: campaignNames.size,
    totalRowsProcessed,
    rowsSkippedNoCampaign,
    rowsSkippedNoTargeting,
    rowsSkippedNoCampaignId,
  });

  return { idMap, campaignNames };
};

/** Safe sanitization for Excel values */
const xlSafe = (v: any): string | number => {
  if (v === undefined || v === null || Number.isNaN(v)) return "";
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  let s = String(v);
  s = s.replace(/\r?\n/g, " ");
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, "");

  const leadingCharsToEscape = ["=", "+", "-", "@", "|"];
  s = s.trim();

  if (s.length > 0 && leadingCharsToEscape.includes(s[0])) {
    s = "'" + s;
  }

  return s;
};

/** Colors for Excel styling */
const LIGHT_BLUE = "FFDBECFF";
const HEADER_GRAY = "FFD9D9D9";

/**
 * Generate the multi-tab decision workbook (Bleeders 1.0 style)
 */
const generateLifetimeDecisionWorkbook = async (
  groupedBleeders: { sp: LifetimeBleederRow[]; sb: LifetimeBleederRow[]; sd: LifetimeBleederRow[] }
): Promise<ExcelJS.Workbook> => {
  const wb = new ExcelJS.Workbook();

  // Add instructions sheet
  const instructionsSheet = wb.addWorksheet("INSTRUCTIONS — READ FIRST");
  const instructions = [
    "Module: Bleeding Lifetime Targets",
    "",
    "Valid Actions:",
    "• Pause — Pauses the targeting (keyword or product target)",
    "• (blank) — No action, target will be skipped",
    "",
    "Instructions:",
    "1. Review each row in the tabs below (SP, SB, SD)",
    "2. Type 'Pause' in the Decision column for targets you want to pause",
    "3. Leave Decision blank for targets you want to keep",
    "4. Save the file",
    "5. Upload the file back to the Decision Processor",
    "",
    "Notes:",
    "• IMPORTANT: Decision column is blank by default — you must review and manually mark 'Pause'",
    "• These are targets with 10+ clicks and 0 lifetime sales",
    "• Hidden ID columns at the end are required for Amazon Bulk Operations",
    "• Do not delete or modify hidden columns",
  ];
  
  instructions.forEach((line, index) => {
    const row = instructionsSheet.addRow([xlSafe(line)]);
    if (line.includes("Module:") || line.includes("Valid Actions:") || line.includes("Instructions:") || line.includes("Notes:")) {
      row.font = { bold: true, size: 12 };
    }
    row.alignment = { wrapText: true, vertical: "top" };
  });
  instructionsSheet.getColumn(1).width = 100;

  // Column schema for decision sheet (matches Bleeders 1.0)
  const HEADERS = [
    "Campaign Name",    // A
    "Ad Group Name",    // B
    "Entity",           // C
    "Targeting",        // D
    "Clicks",           // E
    "Decision",         // F (blue column)
    "Spend",            // G
    "CPC",              // H
    "Total Sales",      // I
    "ACOS",             // J
    "Orders",           // K
    // Hidden ID columns
    "Campaign Id",
    "Ad Group Id",
    "Keyword Id",
    "Product Targeting Id",
    "Targeting Id",
  ];

  const DECISION_COL_INDEX = 6; // 1-based index for Decision column

  const tabs: { name: string; rows: LifetimeBleederRow[] }[] = [
    { name: "Sponsored Products - Targeting", rows: groupedBleeders.sp },
    { name: "Sponsored Brands - Targeting", rows: groupedBleeders.sb },
    { name: "Sponsored Display - Targeting", rows: groupedBleeders.sd },
  ];

  for (const tab of tabs) {
    if (tab.rows.length === 0) continue;

    const ws = wb.addWorksheet(tab.name.substring(0, 31), {
      properties: { defaultColWidth: 12, showGridLines: true },
      views: [{ state: "frozen", xSplit: 0, ySplit: 2 }],
    });

    // Title row
    const titleRow = ws.addRow([`Bleeding Lifetime Targets — ${tab.name}`]);
    titleRow.font = { bold: true };
    titleRow.eachCell((c) => (c.border = { bottom: { style: "thick" } }));

    // Header row
    const headerRow = ws.addRow(HEADERS.map((h) => xlSafe(h)));
    headerRow.font = { bold: true };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_GRAY } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.eachCell((c) => {
      c.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
      };
    });

    // Data rows
    for (const bleeder of tab.rows) {
      const cpc = bleeder.clicks > 0 ? bleeder.spend / bleeder.clicks : 0;
      const acos = bleeder.sales > 0 ? (bleeder.spend / bleeder.sales) * 100 : 0;

      const rowData = [
        xlSafe(bleeder.campaignName),
        xlSafe(bleeder.adGroupName),
        xlSafe(bleeder.entityType || "Keyword"),
        xlSafe(bleeder.targetingText),
        bleeder.clicks,
        xlSafe(bleeder.decision),
        bleeder.spend,
        cpc,
        bleeder.sales,
        acos / 100, // Store as decimal for percentage formatting
        bleeder.orders,
        // Hidden ID columns
        xlSafe(bleeder.campaignId || ""),
        xlSafe(bleeder.adGroupId || ""),
        xlSafe(bleeder.keywordId || ""),
        xlSafe(bleeder.productTargetingId || ""),
        xlSafe(bleeder.targetingId || ""),
      ];

      const dataRow = ws.addRow(rowData);
      dataRow.getCell(DECISION_COL_INDEX).fill = { 
        type: "pattern", 
        pattern: "solid", 
        fgColor: { argb: LIGHT_BLUE } 
      };
    }

    // Apply number formats
    ws.eachRow((row, rowNum) => {
      if (rowNum <= 2) return;
      row.getCell(5).numFmt = "#,##0"; // Clicks
      row.getCell(7).numFmt = "$#,##0.00"; // Spend
      row.getCell(8).numFmt = "$#,##0.00"; // CPC
      row.getCell(9).numFmt = "$#,##0.00"; // Total Sales
      row.getCell(10).numFmt = "0.00%"; // ACOS
      row.getCell(11).numFmt = "#,##0"; // Orders
    });

    // Color entire Decision column blue
    for (let r = 1; r <= 1000; r++) {
      ws.getCell(r, DECISION_COL_INDEX).fill = { 
        type: "pattern", 
        pattern: "solid", 
        fgColor: { argb: LIGHT_BLUE } 
      };
    }
    ws.getCell(2, DECISION_COL_INDEX).font = { bold: true };

    // Auto-width columns
    ws.columns.forEach((col, idx) => {
      let max = 12;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = (cell.value?.toString() || "").length;
        if (len > max) max = len;
      });
      col.width = Math.min(Math.max(max + 2, 12), 42);
      
      // Hide ID columns (columns 12-16, 0-indexed 11-15)
      if (idx >= 11) {
        col.hidden = true;
      }
    });
  }

  return wb;
};

/**
 * Main analyzer function
 */
export const analyzeLifetimeBleeders = async (
  lifetimeReportFile: File,
  bulkFile: File
): Promise<LifetimeBleederResult> => {
  // 1. Parse bulk file and build ID map
  const bulkBuffer = await bulkFile.arrayBuffer();
  const bulkWorkbook = XLSX.read(bulkBuffer, { type: "array" });
  const { idMap, campaignNames: bulkCampaignNames } = buildBulkIdMap(bulkWorkbook);

  console.log(`[LIFETIME] Built ID map with ${idMap.size} entries from bulk file`);

  // 2. Parse lifetime report
  const reportBuffer = await lifetimeReportFile.arrayBuffer();
  const reportWorkbook = XLSX.read(reportBuffer, { type: "array" });

  const bleeders: LifetimeBleederRow[] = [];
  const skippedItems: SkippedItemRow[] = [];
  let totalRows = 0;
  let filteredCount = 0;
  let unmappableCount = 0;
  let excludedRankingCount = 0;
  let totalSpend = 0;

  for (const sheetName of reportWorkbook.SheetNames) {
    const sheet = reportWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
    if (data.length < 2) continue;

    const headers = data[0].map((h) => String(h ?? ""));
    
    console.log(`[LIFETIME] Processing report sheet "${sheetName}" with headers:`, headers.slice(0, 20));
    
    const campaignCol = findColumn(headers, LIFETIME_REPORT_ALIASES.campaign);
    const clicksCol = findColumn(headers, LIFETIME_REPORT_ALIASES.clicks);
    
    if (campaignCol === -1 || clicksCol === -1) {
      console.log(`[LIFETIME] Skipping sheet "${sheetName}" - missing required columns`);
      continue;
    }

    const adGroupCol = findColumn(headers, LIFETIME_REPORT_ALIASES.adGroup);
    const targetingCol = findColumn(headers, LIFETIME_REPORT_ALIASES.targeting);
    const matchTypeCol = findColumn(headers, LIFETIME_REPORT_ALIASES.matchType);
    const ordersCol = findColumn(headers, LIFETIME_REPORT_ALIASES.orders);
    const salesCol = findColumn(headers, LIFETIME_REPORT_ALIASES.sales);
    const spendCol = findColumn(headers, LIFETIME_REPORT_ALIASES.spend);
    const impressionsCol = findColumn(headers, LIFETIME_REPORT_ALIASES.impressions);
    
    // Task 2: Ghost Buster - Status column detection
    const campaignStatusCol = findColumn(headers, LIFETIME_REPORT_ALIASES.campaignStatus);
    const adGroupStatusCol = findColumn(headers, LIFETIME_REPORT_ALIASES.adGroupStatus);
    const statusCol = findColumn(headers, LIFETIME_REPORT_ALIASES.status);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      totalRows++;

      const campaignName = String(row[campaignCol] ?? "").trim();
      if (!campaignName) continue;

      // Skip ranking campaigns
      if (isRankingCampaign(campaignName)) {
        excludedRankingCount++;
        continue;
      }

      // Task 2: Ghost Buster - Check status columns to skip dead/paused targets
      // "Already Dead" Rule: Skip archived/terminated targets silently
      // "Paused" Rule: Skip paused targets - we only action enabled targets
      const campaignStatus = campaignStatusCol !== -1 ? String(row[campaignStatusCol] ?? "").toLowerCase().trim() : "";
      const adGroupStatus = adGroupStatusCol !== -1 ? String(row[adGroupStatusCol] ?? "").toLowerCase().trim() : "";
      const targetStatus = statusCol !== -1 ? String(row[statusCol] ?? "").toLowerCase().trim() : "";

      // Skip if any level is archived/terminated (don't count as bleeder or unmappable)
      const isArchived = 
        campaignStatus.includes("archived") || campaignStatus.includes("terminated") ||
        adGroupStatus.includes("archived") || adGroupStatus.includes("terminated") ||
        targetStatus.includes("archived") || targetStatus.includes("terminated");
      
      if (isArchived) {
        continue; // Silently skip - can't pause what's already dead
      }

      // Skip if target itself is paused (only action enabled targets)
      const isPaused = 
        targetStatus.includes("paused") || 
        (targetStatus === "" && (campaignStatus.includes("paused") || adGroupStatus.includes("paused")));
      
      // Only skip if the target itself is explicitly paused, not inherited pause
      if (targetStatus.includes("paused")) {
        continue; // Target already paused, no action needed
      }

      const clicks = safeParseFloat(row[clicksCol]);
      const orders = ordersCol !== -1 ? safeParseFloat(row[ordersCol]) : 0;
      const sales = salesCol !== -1 ? safeParseFloat(row[salesCol]) : 0;
      const spend = spendCol !== -1 ? safeParseFloat(row[spendCol]) : 0;

      // Filter: clicks >= threshold AND orders == 0 AND sales == 0
      if (clicks < LIFETIME_CLICK_THRESHOLD || orders !== 0 || sales !== 0) {
        continue;
      }

      filteredCount++;

      const adGroupName = adGroupCol !== -1 ? String(row[adGroupCol] ?? "").trim() : "";
      const targetingText = targetingCol !== -1 ? String(row[targetingCol] ?? "").trim() : "";
      const rawMatchType = matchTypeCol !== -1 ? String(row[matchTypeCol] ?? "").trim() : "";
      const impressions = impressionsCol !== -1 ? safeParseFloat(row[impressionsCol]) : 0;

      // Normalize matchType to match the Bulk file key format
      const normalizedMatchType = normalizeMatchType(rawMatchType);

      // Create lookup key INCLUDING matchType for exact disambiguation
      // Key Format: campaign::adGroup::target::matchType
      const key = `${normalizeText(campaignName)}::${normalizeText(adGroupName)}::${normalizeText(targetingText)}::${normalizedMatchType}`;
      let idEntry = idMap.get(key);

      // Fallback: try without matchType for product targeting rows that may not have matchType
      if (!idEntry) {
        const fallbackKey = `${normalizeText(campaignName)}::${normalizeText(adGroupName)}::${normalizeText(targetingText)}::`;
        idEntry = idMap.get(fallbackKey);
      }

      if (!idEntry) {
        unmappableCount++;
        // Track skipped item with reason for transparency log
        skippedItems.push({
          campaignName,
          adGroupName,
          targeting: targetingText,
          clicks,
          reason: determineSkipReason(targetingText, campaignName, bulkCampaignNames),
        });
        continue; // Skip rows we can't map
      }
      
      const matchType = rawMatchType;

      totalSpend += spend;

      const entityType = classifyEntityType(targetingText, matchType || idEntry.matchType);

      bleeders.push({
        campaignName,
        adGroupName,
        targetingText,
        matchType: matchType || idEntry.matchType || undefined,
        clicks,
        orders,
        sales,
        spend,
        impressions,
        cpc: clicks > 0 ? spend / clicks : 0,
        acos: sales > 0 ? (spend / sales) * 100 : 0,
        campaignId: idEntry.campaignId,
        adGroupId: idEntry.adGroupId,
        keywordId: entityType === "Keyword" ? idEntry.keywordId : undefined,
        productTargetingId: entityType === "Product Targeting" ? (idEntry.productTargetingId || idEntry.targetingId) : undefined,
        targetingId: entityType === "Product Targeting" ? (idEntry.targetingId || idEntry.productTargetingId) : undefined,
        decision: "", // Task 3: Default Decision = Blank for safety
        source: idEntry.source,
        entityType,
      });
    }
  }

  console.log(`[LIFETIME] Analysis complete:`, {
    totalRows,
    filteredCount,
    mappedBleeders: bleeders.length,
    unmappableCount,
    excludedRankingCount,
    totalSpend,
  });

  // 3. Group bleeders by channel
  const groupedBleeders = {
    sp: bleeders.filter((b) => b.source === "SP"),
    sb: bleeders.filter((b) => b.source === "SB"),
    sd: bleeders.filter((b) => b.source === "SD"),
  };

  console.log(`[LIFETIME] Grouped bleeders: SP=${groupedBleeders.sp.length}, SB=${groupedBleeders.sb.length}, SD=${groupedBleeders.sd.length}`);

  // 4. Generate decision workbook (multi-tab)
  const decisionWorkbook = await generateLifetimeDecisionWorkbook(groupedBleeders);

  // Get current date for filename
  const today = new Date().toISOString().split("T")[0];
  const decisionFileName = `B1_LIFETIME_Decisions_${today}.xlsx`;

  return {
    bleeders,
    totalRows,
    filteredCount,
    unmappableCount,
    excludedRankingCount,
    totalSpend,
    decisionWorkbook,
    decisionFileName,
    groupedBleeders,
    skippedItems,
  };
};

/**
 * Process a completed Lifetime Decision File and generate Amazon Bulk Update
 */
export interface LifetimeDecisionProcessorResult {
  success: boolean;
  pausedCount: number;
  keptCount: number;
  workbook: XLSX.WorkBook;
  fileName: string;
  errors: string[];
  warnings: string[];
}

export const processLifetimeDecisionFile = async (
  file: File
): Promise<LifetimeDecisionProcessorResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  
  const errors: string[] = [];
  const warnings: string[] = [];
  let pausedCount = 0;
  let keptCount = 0;

  const canonicalInputs: CanonicalBulkInputRow[] = [];

  // Process each sheet (skip instructions)
  for (const sheetName of workbook.SheetNames) {
    const sheetLower = sheetName.toLowerCase();
    if (sheetLower.includes("instruction") || sheetLower.includes("read first")) {
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
    
    if (data.length < 3) continue; // Need title + header + at least 1 data row

    // Find header row (usually row 2, index 1)
    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(data.length, 5); r++) {
      const rowStr = data[r].map((c: any) => String(c || "").toLowerCase()).join("|");
      if (rowStr.includes("decision") && rowStr.includes("campaign")) {
        headerRowIdx = r;
        break;
      }
    }

    const headers = data[headerRowIdx].map((h: any) => String(h || "").toLowerCase().trim());
    
    // Find column indices
    const findCol = (aliases: string[]): number => {
      for (const alias of aliases) {
        const idx = headers.findIndex((h) => h === alias.toLowerCase());
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const campaignNameCol = findCol(["campaign name", "campaign"]);
    const adGroupNameCol = findCol(["ad group name", "ad group"]);
    const entityCol = findCol(["entity"]);
    const targetingCol = findCol(["targeting", "target"]);
    const decisionCol = findCol(["decision"]);
    const campaignIdCol = findCol(["campaign id"]);
    const adGroupIdCol = findCol(["ad group id"]);
    const keywordIdCol = findCol(["keyword id"]);
    const productTargetingIdCol = findCol(["product targeting id"]);
    const targetingIdCol = findCol(["targeting id"]);

    if (decisionCol === -1) {
      warnings.push(`Sheet "${sheetName}" has no Decision column, skipping.`);
      continue;
    }

    // Process data rows
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const decision = String(row[decisionCol] || "").toLowerCase().trim();
      
      if (!decision || decision === "keep" || decision === "") {
        keptCount++;
        continue;
      }

      if (decision !== "pause") {
        warnings.push(`Row ${i + 1} has unknown decision "${decision}", treating as Keep.`);
        keptCount++;
        continue;
      }

      pausedCount++;

      const campaignName = campaignNameCol !== -1 ? String(row[campaignNameCol] || "").trim() : "";
      const adGroupName = adGroupNameCol !== -1 ? String(row[adGroupNameCol] || "").trim() : "";
      const entity = entityCol !== -1 ? String(row[entityCol] || "").trim() : "";
      const targeting = targetingCol !== -1 ? String(row[targetingCol] || "").trim() : "";
      const campaignId = campaignIdCol !== -1 ? String(row[campaignIdCol] || "").trim() : "";
      const adGroupId = adGroupIdCol !== -1 ? String(row[adGroupIdCol] || "").trim() : "";
      const keywordId = keywordIdCol !== -1 ? String(row[keywordIdCol] || "").trim() : "";
      const productTargetingId = productTargetingIdCol !== -1 ? String(row[productTargetingIdCol] || "").trim() : "";
      const targetingId = targetingIdCol !== -1 ? String(row[targetingIdCol] || "").trim() : "";

      // Determine final record type from entity column if available
      const entityLower = entity.toLowerCase();
      let isKeyword = true;
      
      if (entityLower.includes("product targeting") || entityLower.includes("targeting")) {
        isKeyword = false;
      } else if (entityLower.includes("keyword")) {
        isKeyword = true;
      } else {
        // Classify based on targeting text patterns
        const targetingLower = targeting.toLowerCase();
        if (
          targetingLower.includes("asin=") ||
          targetingLower.includes("category=") ||
          targetingLower.includes("brand=") ||
          targetingLower.includes("views=") ||
          targetingLower.includes("purchases=") ||
          targetingLower.includes("close-match") ||
          targetingLower.includes("loose-match")
        ) {
          isKeyword = false;
        }
      }

      // Determine Amazon record type based on sheet name and entity
      let amazonRecordType: AmazonRecordType;
      if (sheetLower.includes("sponsored brands")) {
        amazonRecordType = isKeyword ? "sponsoredBrandsKeyword" : "sponsoredBrandsProductTargeting";
      } else if (sheetLower.includes("sponsored display")) {
        amazonRecordType = "sponsoredDisplayProductTargeting";
      } else {
        // Sponsored Products
        amazonRecordType = isKeyword ? "sponsoredProductsKeyword" : "sponsoredProductsProductTargeting";
      }

      const canonical: CanonicalBulkInputRow = {
        recordType: amazonRecordType,
        action: "pause",
        campaignId,
        campaignName,
        adGroupId,
        adGroupName,
        keywordId: isKeyword ? keywordId : undefined,
        keywordText: isKeyword ? targeting : undefined,
        matchType: undefined,
        productTargetingId: !isKeyword ? (productTargetingId || targetingId) : undefined,
        targetingId: !isKeyword ? (targetingId || productTargetingId) : undefined,
        targetingText: !isKeyword ? targeting : undefined,
      };

      canonicalInputs.push(canonical);
    }
  }

  console.log(`[LIFETIME] Decision processing: ${pausedCount} paused, ${keptCount} kept`);

  if (pausedCount === 0) {
    warnings.push("No rows with 'Pause' decision found. Nothing to process.");
  }

  // Build Amazon Bulk Update workbook
  const outputWorkbook = XLSX.utils.book_new();

  if (canonicalInputs.length > 0) {
    // Group by product type
    const inputsByProduct: Record<AmazonProduct, CanonicalBulkInputRow[]> = {
      "Sponsored Products": [],
      "Sponsored Brands": [],
      "Sponsored Display": [],
    };

    for (const c of canonicalInputs) {
      const { product } = recordTypeToProductEntity(c.recordType);
      inputsByProduct[product].push(c);
    }

    // Build sheets
    (["Sponsored Products", "Sponsored Brands", "Sponsored Display"] as AmazonProduct[]).forEach((product) => {
      const subset = inputsByProduct[product];
      if (!subset.length) return;

      const built = buildBulkRowsFromCanonical(subset);
      if (!built.length) return;

      const rows: any[][] = [BULK_UPDATE_HEADERS, ...built.map(bulkRowToArray)];
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(outputWorkbook, sheet, product);
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const fileName = `Amazon_Bulk_Operations_Lifetime_${today}.xlsx`;

  return {
    success: errors.length === 0,
    pausedCount,
    keptCount,
    workbook: outputWorkbook,
    fileName,
    errors,
    warnings,
  };
};

/**
 * Generate a CSV string for skipped items log
 */
export const generateSkippedItemsCSV = (skippedItems: SkippedItemRow[]): string => {
  const headers = ["Campaign Name", "Ad Group Name", "Targeting", "Clicks", "Reason"];
  const rows = skippedItems.map((item) => [
    `"${(item.campaignName || "").replace(/"/g, '""')}"`,
    `"${(item.adGroupName || "").replace(/"/g, '""')}"`,
    `"${(item.targeting || "").replace(/"/g, '""')}"`,
    String(item.clicks),
    `"${(item.reason || "").replace(/"/g, '""')}"`,
  ].join(","));
  
  return [headers.join(","), ...rows].join("\n");
};

/**
 * Download skipped items as CSV
 */
export const downloadSkippedItemsLog = (skippedItems: SkippedItemRow[]): void => {
  const csvContent = generateSkippedItemsCSV(skippedItems);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const today = new Date().toISOString().split("T")[0];
  const link = document.createElement("a");
  link.href = url;
  link.download = `Skipped_Items_Log_${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
