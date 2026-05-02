// src/lib/bleeder2TrackAnalyzer.ts
import * as XLSX from "xlsx";
import ExcelJS, { Workbook } from "exceljs";
import { generateOperatorWorkbook_A } from "./reportFormatter";

/* =========================
 * Types
 * ========================= */
export type Bleeder2TrackType = "SBSD" | "SP" | "SP_KEYWORDS" | "ACOS100";

export interface Bleeder2TrackRow {
  campaignName: string;
  adGroupName?: string;
  entity: string; // keyword / targeting / search term / campaign
  matchType?: string;
  spend: number;
  orders: number;
  acos: number; // percent (e.g., 140 for 140%)
  sales: number;
  clicks: number;
  impressions?: number;
  isRankCampaign?: boolean;
  trackType: Bleeder2TrackType;

  // additions for operator workbook mapping
  source?: "SB" | "SD" | "SP";
  cpc?: number;
  bid?: number; // Current keyword/target bid from bulk file
  ctr?: number; // percent
  roas?: number; // ratio
  salesWindow?: "7D" | "14D" | "GEN";
  customerSearchTerm?: string;
  targetingText?: string;

  // Amazon IDs for UPDATE operation compliance
  campaignId?: string;
  adGroupId?: string;
  keywordId?: string;
  productTargetingId?: string;
  targetingId?: string;
}

export interface Bleeder2TrackResult {
  trackType: Bleeder2TrackType;
  bleeders: Bleeder2TrackRow[];
  totalSpend: number;
  totalRows: number;
  sheetsProcessed: string[];
  fileName: string;
  workbook?: ExcelJS.Workbook;
  decisionWorkbook: ExcelJS.Workbook;
  decisionFileName: string;
  marginPercent: number;
  bufferPercent: number;
  acosThreshold: number;
  lowSalesThreshold: number;
}

/* =========================
 * Helpers & constants
 * ========================= */

const normalizeHeader = (header: string): string =>
  header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^7day|^14day|^30day|^60day/i, "");

// --- GLOBAL UTILITY FUNCTION (Add this once in your file) ---

/**
 * Fixes the sheet name from "... Targeting" to "... Campaigns" for campaign-level actions.
 * @param workbook The generated spreadsheet object.
 */
const fixSheetNameForCampaigns = (workbook: Workbook, productType: string) => {
  // We assume the sheet we need to rename is always the first one (index 0).
  const sheet = workbook.worksheets[0];

  // Safety check: ensure the sheet exists and its current name contains "Targeting"
  if (sheet && typeof sheet.name === "string" && sheet.name.includes("Targeting")) {
    // Renames "Sponsored Products • Targeting" to "Sponsored Products • Campaigns"
    sheet.name = sheet.name.replace("Targeting", "Campaigns");
  }
};

// Bulk Operations sheet patterns
const VALID_SB_CAMPAIGNS_SHEETS = [
  "sponsoredbrandscampaigns",
  "sbcampaigns",
  "sponsoredbrands",
  "sbmultiadgroupcampaigns",
];

const VALID_SD_CAMPAIGNS_SHEETS = ["sponsoreddisplaycampaigns", "sdcampaigns", "sponsoreddisplay", "rascampaigns"];

const VALID_SP_CAMPAIGNS_SHEETS = [
  "sponsoredproductscampaigns",
  "spcampaigns",
  "sponsoredproducts",
  "spproductads",
  "spproductad",
  "productads",
  "sponprodcampaigns",
  "spproducts",
  "spmultiadgroupcampaigns",
];

const VALID_SP_SEARCH_TERM_SHEETS = ["spsearchtermreport", "searchterm", "spsearch"];

const VALID_ACOS100_SHEETS = [
  "campaignperformance",
  "campaignreport",
  "performancereport",
  "campaigns",
  "performance",
  "campaign",
  "adperformance",
];

const ALIASES = {
  campaign: ["Campaign Name", "Campaign", "Campaign Name (Informational only)", "Campaign (Informational only)"],
  adgroup: ["Ad Group Name", "Ad Group", "Ad Group Name (Informational only)", "AdGroup"],
  state: ["State", "Status", "Campaign State", "Campaign Status"],
  campaignState: ["Campaign State", "Campaign Status"],
  entityType: ["Entity"],
  keywordTarget: [
    "Keyword Text",
    "Keyword",
    "Targeting",
    "Target",
    "ASIN",
    "Product Targeting",
    "Resolved Targeting Expression (Informational only)",
    "Targeting Expression (Informational only)",
    "Targeting Expression",
    "Product Targeting Expression",
    "Resolved Product Targeting Expression (Informational only)",
  ],
  matchType: ["Match Type", "MatchType"],
  spend: ["Spend", "Cost", "Spend ($)"],
  orders: [
    "14 Day Total Orders (#)",
    "7 Day Total Orders (#)",
    "Total Orders (#)",
    "14 Day Total Orders",
    "7 Day Total Orders",
    "Orders",
    "14 Day Total Orders (#) - (Click)",
    "14 Day Total Orders - (Click)",
  ],
  acos: [
    "Total Advertising Cost of Sales (ACOS)",
    "Total ACOS (%)",
    "Total Advertising Cost of Sales",
    "ACOS",
    "ACoS",
    "ACoS (%)",
    "ACoS %",
    "Total Advertising Cost of Sales (ACOS) - (Click)",
  ],
  sales7: ["7 Day Total Sales", "Total Sales (7 day)", "7 Day Sales", "Sales (7 day)"],
  sales14: [
    "14 Day Total Sales",
    "Total Sales (14 day)",
    "14 Day Sales",
    "Sales (14 day)",
    "14 Day Total Sales - (Click)",
  ],
  salesGeneric: ["Total Sales", "Sales", "Sales (Views & Clicks)"],
  clicks: ["Clicks"],
  impressions: ["Impressions", "Viewable Impressions"],
  ctr: ["Click-Thru Rate (CTR)", "CTR", "Click-through Rate", "Click Through Rate"],
  cpc: ["Cost Per Click (CPC)", "CPC"],
  bid: ["Bid", "Max Bid", "Keyword Bid", "Default Bid", "Max CPC"],
  customerSearchTerm: ["Customer Search Term", "Search Term"],
  ranking: ["Ranking Campaign", "Ranking", "Is Ranking"],
  // Amazon ID columns
  campaignId: ["Campaign Id", "CampaignId", "Campaign ID"],
  adGroupId: ["Ad Group Id", "AdGroupId", "Ad Group ID", "AdGroup Id"],
  keywordId: ["Keyword Id", "KeywordId", "Keyword ID"],
  productTargetingId: ["Product Targeting Id", "ProductTargetingId", "Product Targeting ID"],
  targetingId: ["Targeting Id", "TargetingId", "Targeting ID"],
  productTargetingText: [
    "Product Targeting Expression",
    "Targeting Expression",
    "Resolved Targeting Expression (Informational only)",
    "Resolved Product Targeting Expression (Informational only)",
  ],
};

const headersContains = (headers: string[], names: string[]) => {
  const norm = headers.map((h) => normalizeHeader(h));
  return names.some((n) => norm.includes(normalizeHeader(n)));
};

const findColumn = (headers: string[], possibleNames: string[]): number => {
  const normalizedHeaders = headers.map((h) => normalizeHeader(h));
  for (const name of possibleNames) {
    const idx = normalizedHeaders.indexOf(normalizeHeader(name));
    if (idx !== -1) return idx;
  }
  return -1;
};

// tolerant: exact alias first, then loose contains (BUT ignoring empty headers)
const findColumnWithAliases = (headers: string[], aliases: string[]): number => {
  const normalizedHeaders = headers.map((h) => normalizeHeader(String(h ?? "")));

  // 1) strict equality first
  for (const alias of aliases) {
    const n = normalizeHeader(alias);
    const idx = normalizedHeaders.indexOf(n);
    if (idx !== -1) return idx;
  }

  // 2) loose contains (MUST check that header is not empty)
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const headerVal = normalizedHeaders[i];
    if (headerVal.length < 2) continue; // Skip empty or single-char columns to avoid false positives

    for (const alias of aliases) {
      const n = normalizeHeader(alias);
      // Check if header includes alias OR alias includes header
      if (headerVal.includes(n) || n.includes(headerVal)) return i;
    }
  }
  return -1;
};

export const findSheetsByPatterns = (sheetNames: string[], patterns: string[]): string[] => {
  const normPatterns = patterns.map((p) => p.toLowerCase().replace(/\s/g, ""));
  const matchingSheets: string[] = [];

  for (const name of sheetNames) {
    const normName = name.toLowerCase().replace(/\s/g, "");
    // Check if the sheet name matches any of the required patterns
    if (normPatterns.some((p) => normName.includes(p))) {
      matchingSheets.push(name);
    }
  }
  return matchingSheets;
};

// STRICT ID finder – only exact normalized matches.
const findIdColumn = (headers: string[], aliases: string[]): number => {
  const normalizedHeaders = headers.map((h) => normalizeHeader(String(h ?? "")));
  for (const alias of aliases) {
    const n = normalizeHeader(alias);
    const idx = normalizedHeaders.indexOf(n);
    if (idx !== -1) return idx;
  }
  return -1;
};

// Prefer the main ACOS column and avoid the "- (Click)" one unless we have no choice.
const pickAcosCol = (headers: string[]): number => {
  const norm = headers.map((h) => normalizeHeader(String(h || "")));

  const exactMain = norm.indexOf(normalizeHeader("Total Advertising Cost of Sales (ACOS)"));
  if (exactMain !== -1) return exactMain;

  const nonClickAliases = ["Total ACOS (%)", "Total Advertising Cost of Sales", "ACOS", "ACoS", "ACoS (%)", "ACoS %"];
  for (const alias of nonClickAliases) {
    const i = norm.indexOf(normalizeHeader(alias));
    if (i !== -1) return i;
  }

  const clickIdx = norm.indexOf(normalizeHeader("Total Advertising Cost of Sales (ACOS) - (Click)"));
  if (clickIdx !== -1) return clickIdx;

  return -1;
};

// Prefer 14-day/7-day explicitly, then "Units" (common in SP), then generic "Orders"
const pickOrdersCol = (headers: string[]): number => {
  const tryList = [
    "14 Day Total Orders (#)",
    "7 Day Total Orders (#)",
    "14 Day Total Orders",
    "7 Day Total Orders",
    "Units", // Moved UP: "Units" is the standard column name in many SP bulk files
    "Total Units", // Moved UP
    "Total Orders (#)",
    "Orders",
    "14 Day Total Orders (#) - (Click)",
    "14 Day Total Orders - (Click)",
  ];

  for (const label of tryList) {
    const i = findColumnWithAliases(headers, [label]);
    if (i !== -1) return i;
  }
  return -1;
};

const safeParseFloat = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;
  let str = String(value).trim();
  if (str.startsWith("(") && str.endsWith(")")) str = "-" + str.slice(1, -1);
  str = str.replace(/[$,%\s]/g, "");
  if (/^\d+\.\d{3},\d+$/.test(str)) str = str.replace(/\./g, "").replace(",", ".");
  else str = str.replace(/,/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const normalizeState = (v: any) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const calculateACoS = (spend: number, sales: number) => {
  if (sales <= 0 && spend > 0) return 1000;
  if (sales <= 0) return 0;
  return (spend / sales) * 100;
};

const classifySBvsSD = (headers: string[]): "SB" | "SD" => {
  const hasMatchType = headersContains(headers, ALIASES.matchType);
  const hasCustomerSearch = headersContains(headers, ALIASES.customerSearchTerm);
  if (hasCustomerSearch) return "SB";
  if (hasMatchType) return "SB";
  return "SD";
};

const findSheetByPatterns = (sheetNames: string[], patterns: string[]): string | null => {
  const normalized = sheetNames.map((name) => ({ original: name, normalized: normalizeHeader(name) }));
  for (const p of patterns) {
    const hit = normalized.find((s) => s.normalized.includes(p) || p.includes(s.normalized));
    if (hit) return hit.original;
  }
  return null;
};

const findSheetByColumns = (workbook: XLSX.WorkBook, required: string[]): string | null => {
  for (const sheetName of workbook.SheetNames) {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as any[][];
    if (data.length < 1) continue;
    const headers = data[0].map((h) => String(h ?? ""));
    const ok = required.every((col) => findColumn(headers, [col]) !== -1);
    if (ok) return sheetName;
  }
  return null;
};

function mapBleeder2RowsToReportFormat(bleeders: Bleeder2TrackRow[]): any[] {
  const mappedRows = bleeders.map((b) => {
    let sheet = "";
    let entityType = ""; // Helper to safely stringify and lower-case

    const safeStr = (v: any) =>
      String(v || "")
        .toLowerCase()
        .trim(); // Helper to check for Product Targeting patterns

    const isProductTargetingText = (text: string) => {
      const t = safeStr(text);
      return t.includes("asin=") || t.includes("category=") || t.includes("product targeting") || t.includes("brand=");
    };

    if (b.trackType === "ACOS100") {
      entityType = "Campaign";
      const campLower = safeStr(b.campaignName);
      if (campLower.includes("sp") || campLower.includes("sponsored product")) {
        sheet = "Sponsored Products Campaigns";
      } else if (campLower.includes("sb") || campLower.includes("sponsored brand")) {
        sheet = "Sponsored Brands Campaigns";
      } else {
        sheet = "Sponsored Display Campaigns";
      }
    } else if (b.trackType === "SP") {
      if (b.customerSearchTerm && b.customerSearchTerm.length > 0) {
        sheet = "SP Search Term Report";
        entityType = "search term";
      } else {
        sheet = "Sponsored Products Campaigns";
        entityType = "keyword";
      }
    } else if (b.trackType === "SP_KEYWORDS") {
      sheet = "Sponsored Products Campaigns";
      const mt = safeStr(b.matchType);
      const isKeyword = mt === "exact" || mt === "phrase" || mt === "broad";
      const isTargeting = isProductTargetingText(b.entity);
      entityType = isTargeting && !isKeyword ? "product targeting" : "keyword";
    } else if (b.source === "SB") {
      sheet = "Sponsored Brands Campaigns";
      if (isProductTargetingText(b.entity)) {
        entityType = "product targeting";
      } else {
        entityType = "keyword";
      }
    } else {
      sheet = "Sponsored Display Campaigns";
      const t = safeStr(b.entity);
      if (t.includes("views=") || t.includes("purchases=") || t.includes("audience")) {
        entityType = "audience";
      } else {
        entityType = "product targeting";
      }
    }

    const prefers7Day = b.trackType === "SP" || b.trackType === "SP_KEYWORDS" || b.trackType === "ACOS100"; // Safe number access
    const safeNum = (v: any) => (typeof v === "number" && !isNaN(v) ? v : 0);

    const sales = safeNum(b.sales);
    const spend = safeNum(b.spend);
    const orders = safeNum(b.orders);
    const clicks = safeNum(b.clicks);
    const impr = safeNum(b.impressions);
    const cpc = safeNum(b.cpc);
    const ctr = safeNum(b.ctr);
    const roas = safeNum(b.roas);

    const sales7 = prefers7Day ? sales : 0;
    const sales14 = prefers7Day ? 0 : sales;
    const orders7 = prefers7Day ? orders : 0;
    const orders14 = prefers7Day ? 0 : orders;

    const isSPSearchTerm = b.trackType === "SP" && !!b.customerSearchTerm;
    const keywordTextForReport = isSPSearchTerm ? b.targetingText || b.entity : b.entity;
    const productTargetingForReport = isSPSearchTerm ? b.targetingText || b.entity : b.entity;
    const customerSearchTermForReport = isSPSearchTerm ? b.customerSearchTerm || b.entity : ""; // 🔥 FINAL ACOS FIX: Calculate the raw number Excel expects (e.g., 2.8631 for 286.31%)

    let finalAcosNumber: number;

    if (sales > 0) {
      // 1. If we have sales, use the raw Spend/Sales ratio (e.g., 2.8631).
      finalAcosNumber = spend / sales;
    } else if (spend > 0) {
      // 2. If no sales but there is spend, use the stored b.acos (e.g., 286.31),
      // and divide by 100 to get the ratio Excel expects for percentage formatting (e.g., 2.8631).
      const storedAcos = safeNum(b.acos);
      finalAcosNumber = storedAcos / 100;
    } else {
      // 3. If no spend and no sales.
      finalAcosNumber = 0;
    } // END FINAL ACOS FIX
    return {
      sheet,
      entityType,
      campaign: b.campaignName,
      ad_group: b.adGroupName || "",
      keyword_text: keywordTextForReport || "",
      product_targeting: productTargetingForReport || "",
      match_type: b.matchType || "",
      customer_search_term: customerSearchTermForReport || "",
      impressions: impr,
      clicks: clicks,
      ctr: ctr > 0 ? `${(ctr < 1 ? ctr * 100 : ctr).toFixed(2)}%` : "0.00%",
      cpc: cpc > 0 ? `$${cpc.toFixed(2)}` : "$0.00",
      spend: spend,
      sales7,
      sales14,
      acos: finalAcosNumber, // CRITICAL: Now a number, not a string with a percent sign.
      roas: roas.toFixed(2),
      orders7,
      orders14,
      campaignId: b.campaignId || "",
      adGroupId: b.adGroupId || "",
      keywordId: b.keywordId || "",
      productTargetingId: b.productTargetingId || "",
      targetingId: b.targetingId || "",
    };
  }); // Deduplication Logic

  const seenKeys = new Set();
  mappedRows.forEach((row) => {
    const term = row.customer_search_term || row.keyword_text || row.product_targeting;
    const key = `${row.campaign}::${row.ad_group}::${term}`;

    if (seenKeys.has(key)) {
      const idStr = row.keywordId || row.productTargetingId || row.campaignId || "DUP";
      row.campaign = `${row.campaign} [ID:${idStr}]`;
    } else {
      seenKeys.add(key);
    }
  });

  return mappedRows;
}

/* =========================
 * Track A: SB/SD (Bad keywords/targets)
 * ========================= */

export const analyzeSBSDTrack = async (
  file: File,
  targetACOS: number,
  sbsdBuffer: number = 10,
  _clickThreshold_unused = 0,
  fewerThanOrders: number = 5,
  excludeRanking: boolean = false,
  bulkIndex?: any,
): Promise<Bleeder2TrackResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellText: false, cellDates: true, raw: true });

  const acosThreshold = targetACOS + sbsdBuffer;
  let bleeders: Bleeder2TrackRow[] = [];
  const sheetsProcessed: string[] = [];

  let foundSheets: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const norm = normalizeHeader(sheetName);
    if (VALID_SB_CAMPAIGNS_SHEETS.some((p) => norm.includes(p) || p.includes(norm))) {
      foundSheets.push(sheetName);
    } else if (VALID_SD_CAMPAIGNS_SHEETS.some((p) => norm.includes(p) || p.includes(norm))) {
      foundSheets.push(sheetName);
    }
  }
  if (foundSheets.length === 0) {
    const auto = findSheetByColumns(workbook, ["Campaign Name", "Spend", "ACoS"]);
    if (auto) foundSheets.push(auto);
  }
  if (foundSheets.length === 0) {
    throw new Error(
      "No SB/SD sheets found. Please upload an Amazon Bulk file that includes Sponsored Brands Campaigns and/or Sponsored Display Campaigns tabs.",
    );
  }

  for (const sheet of foundSheets) {
    sheetsProcessed.push(sheet);

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {
      header: 1,
      defval: "",
    }) as any[][];
    if (data.length < 2) continue;

    const headers = data[0].map((h) => String(h ?? ""));
    const source = classifySBvsSD(headers);

    const campaignNameColPrimary = findColumnWithAliases(headers, ["Campaign Name", "Campaign"]);
    const campaignNameColInfo = findColumnWithAliases(headers, ["Campaign Name (Informational only)"]);
    const campaignCol = campaignNameColPrimary !== -1 ? campaignNameColPrimary : campaignNameColInfo;

    const adGroupCol = findColumnWithAliases(headers, [
      "Ad Group Name",
      "Ad Group Name (Informational only)",
      "Ad Group",
    ]);

    const entityTypeCol = findColumnWithAliases(headers, ALIASES.entityType);
    const keywordCol = findColumnWithAliases(headers, ALIASES.keywordTarget);
    const matchTypeCol = findColumnWithAliases(headers, ALIASES.matchType);

    // 🔥 FIX 1: Robust Product Targeting Column Finding
    const productTargetingTextCol = findColumnWithAliases(headers, ALIASES.productTargetingText);
    const productTargetingCol = findColumnWithAliases(headers, ["Product Targeting", "ASIN"]);

    const stateCol = findColumnWithAliases(headers, ALIASES.state);
    const campaignStateCol = findColumnWithAliases(headers, ALIASES.campaignState);
    const clicksCol = findColumnWithAliases(headers, ALIASES.clicks);
    const spendCol = findColumnWithAliases(headers, ALIASES.spend);
    const impressionsCol = findColumnWithAliases(headers, ALIASES.impressions);
    const ctrCol = findColumnWithAliases(headers, ALIASES.ctr);
    const cpcCol = findColumnWithAliases(headers, ALIASES.cpc);
    const bidCol = findColumnWithAliases(headers, ALIASES.bid);

    const ordersCol = pickOrdersCol(headers);
    const salesCol = (() => {
      const s14 = findColumnWithAliases(headers, ALIASES.sales14);
      const s7 = findColumnWithAliases(headers, ALIASES.sales7);
      const sg = findColumnWithAliases(headers, ALIASES.salesGeneric);
      return s14 !== -1 ? s14 : s7 !== -1 ? s7 : sg;
    })();
    const acosCol = pickAcosCol(headers);

    const sales14Idx = findColumnWithAliases(headers, ALIASES.sales14);
    const sales7Idx = findColumnWithAliases(headers, ALIASES.sales7);
    let salesWindow: "14D" | "7D" | "GEN" = "GEN";
    if (salesCol === sales14Idx && salesCol !== -1) salesWindow = "14D";
    else if (salesCol === sales7Idx && salesCol !== -1) salesWindow = "7D";

    const campaignIdCol = findIdColumn(headers, ALIASES.campaignId);
    const adGroupIdCol = findIdColumn(headers, ALIASES.adGroupId);
    const keywordIdCol = findIdColumn(headers, ALIASES.keywordId);
    const productTargetingIdCol = findIdColumn(headers, ALIASES.productTargetingId);
    const targetingIdCol = findIdColumn(headers, ALIASES.targetingId);

    if (campaignCol === -1 || spendCol === -1) {
      console.warn("[B2 SBSD] missing required col", {
        sheet,
        campaignCol,
        spendCol,
        headers,
      });
      continue;
    }

    // Classify entity type - expanded for SD Contextual Targeting support
    // Supports: Keyword, Product Targeting, Audience Targeting, Contextual Targeting
    const classifyEntity = (raw: string) => {
      const norm = raw.toLowerCase().replace(/\s+/g, "");
      return {
        isKeyword: norm.includes("keyword"),
        isProductTargeting: norm.includes("producttargeting") || norm.includes("contextualtargeting"),
        isAudience: norm.includes("audiencetargeting") || norm.includes("audience"),
        isContextual: norm.includes("contextualtargeting"),
      };
    };

    let totalRows = 0;
    let rowsWithKeyword = 0;
    let rowsWithSpend = 0;
    let rowsStateEnabled = 0;
    const bleedersBefore = bleeders.length;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      totalRows++;

      const rawCampaignPrimary = campaignNameColPrimary !== -1 ? row[campaignNameColPrimary] : "";
      const rawCampaignInfo = campaignNameColInfo !== -1 ? row[campaignNameColInfo] : "";
      const campaignName = String(rawCampaignPrimary || rawCampaignInfo || "").trim();
      if (!campaignName) continue;

      let entityTypeRaw = entityTypeCol !== -1 ? String(row[entityTypeCol] ?? "").trim() : "";
      const { isKeyword, isProductTargeting, isAudience } = classifyEntity(entityTypeRaw);

      // Accept Keyword, Product Targeting, Audience Targeting, and Contextual Targeting (via isProductTargeting)
      if (!isKeyword && !isProductTargeting && !isAudience) continue;

      // 🔥 FIX 2: Better Text Extraction
      // If "Keyword Text" is generic/empty, try "Product Targeting Expression"
      let keywordText = keywordCol !== -1 ? String(row[keywordCol] ?? "").trim() : "";

      const ptExpr = productTargetingTextCol !== -1 ? String(row[productTargetingTextCol] ?? "").trim() : "";
      const ptVal = productTargetingCol !== -1 ? String(row[productTargetingCol] ?? "").trim() : "";

      // If the keyword text is literally "Product Targeting" (Amazon does this in SB), replace it with the expression
      if (!keywordText || keywordText.toLowerCase() === "product targeting") {
        if (ptExpr) keywordText = ptExpr;
        else if (ptVal) keywordText = ptVal;
      }

      if (keywordText) rowsWithKeyword++;

      const spend = safeParseFloat(row[spendCol]);
      if (spend > 0) rowsWithSpend++;

      const orders = ordersCol !== -1 ? safeParseFloat(row[ordersCol]) : 0;
      const sales = salesCol !== -1 ? safeParseFloat(row[salesCol]) : 0;
      const clicks = clicksCol !== -1 ? safeParseFloat(row[clicksCol]) : 0;
      const impressions = impressionsCol !== -1 ? safeParseFloat(row[impressionsCol]) : 0;
      const cpc = cpcCol !== -1 ? safeParseFloat(row[cpcCol]) : clicks > 0 ? spend / clicks : 0;
      const bid = bidCol !== -1 ? safeParseFloat(row[bidCol]) : 0;
      const ctr = ctrCol !== -1 ? safeParseFloat(row[ctrCol]) : impressions > 0 ? (clicks / impressions) * 100 : 0;
      let acos = acosCol !== -1 ? safeParseFloat(row[acosCol]) : calculateACoS(spend, sales);

      if (acos > 0 && acos < 100) {
        const calculatedACOS = calculateACoS(spend, sales);
        if (calculatedACOS > 100.0 && acos < 2.0) {
          acos *= 100;
          console.warn(
            `[ACOS FIXED] Row ${i + 1}: Corrected ACOS from ${acos / 100} to ${acos.toFixed(2)}% based on Spend/Sales ratio.`,
          );
        } else if (acos < 10.0) {
          acos *= 100;
        }
      }

      if (acos <= acosThreshold) continue;

      const state = stateCol !== -1 ? normalizeState(row[stateCol]) : "enabled";
      const campaignState = campaignStateCol !== -1 ? normalizeState(row[campaignStateCol]) : "enabled";
      const stateOk =
        (stateCol === -1 || state === "enabled") && (campaignStateCol === -1 || campaignState === "enabled");
      if (!stateOk) continue;
      rowsStateEnabled++;

      const adGroupName = adGroupCol !== -1 ? String(row[adGroupCol] ?? "").trim() : "";
      const matchType = matchTypeCol !== -1 ? String(row[matchTypeCol] ?? "").trim() : "";

      // 🔥 EXCLUSION REMOVED: We now include Exact match SB keywords because they are valid candidates for pausing if bleeding.
      // (The previous "if source === SB && Exact ... continue" block is gone)

      if (spend <= 0 || orders > fewerThanOrders || acos < acosThreshold) continue;

      const isRankCampaign = /rank/i.test(campaignName);
      if (excludeRanking && isRankCampaign) continue;

      const rawCampaignId = campaignIdCol !== -1 ? String(row[campaignIdCol] ?? "").trim() : "";
      const rawAdGroupId = adGroupIdCol !== -1 ? String(row[adGroupIdCol] ?? "").trim() : "";
      const rawKeywordId = keywordIdCol !== -1 ? String(row[keywordIdCol] ?? "").trim() : "";
      const rawProductTargetingId = productTargetingIdCol !== -1 ? String(row[productTargetingIdCol] ?? "").trim() : "";
      const rawTargetingId = targetingIdCol !== -1 ? String(row[targetingIdCol] ?? "").trim() : "";

      const campaignId = rawCampaignId || undefined;
      const adGroupId = rawAdGroupId || undefined;
      let keywordId: string | undefined;
      let productTargetingId: string | undefined;
      let targetingId: string | undefined;

      // 🔥 FIX 3: UNIFIED ID EXTRACTION
      // Don't restrict by source ("SB" vs "SD"). Restrict by Entity Type.
      if (isKeyword) {
        keywordId = rawKeywordId || undefined;
      }

      if (isProductTargeting) {
        // SB often puts the ID in 'Targeting Id' OR 'Product Targeting Id'. We catch both.
        productTargetingId = rawProductTargetingId || rawTargetingId || undefined;
        targetingId = rawTargetingId || undefined;
      }

      if (isAudience) {
        targetingId = rawTargetingId || rawProductTargetingId || undefined;
      }

      bleeders.push({
        campaignName: campaignName || "(no campaign name)",
        adGroupName: adGroupName || undefined,
        entity: keywordText || entityTypeRaw || campaignName,
        matchType: matchType || undefined,
        spend,
        orders,
        acos,
        sales: sales,
        clicks,
        impressions,
        cpc,
        bid: bid > 0 ? bid : undefined,
        ctr,
        roas: sales > 0 ? sales / spend : 0,
        source,
        salesWindow: salesWindow === "GEN" ? undefined : salesWindow,
        isRankCampaign,
        trackType: "SBSD",
        campaignId,
        adGroupId,
        keywordId,
        productTargetingId,
        targetingId,
      });
    }

    const bleedersForSheet = bleeders.length - bleedersBefore;
    console.debug("[B2 SBSD] gating stats", {
      sheet,
      source,
      totalRows,
      rowsWithKeyword,
      rowsWithSpend,
      rowsStateEnabled,
      bleedersForSheet,
    });
  }

  // dedupe by core ID
  {
    const pickBetter = (a: Bleeder2TrackRow, b: Bleeder2TrackRow) => {
      const aText = (a.entity || "").trim().length + (a.matchType || "").trim().length;
      const bText = (b.entity || "").trim().length + (b.matchType || "").trim().length;
      return aText >= bText ? a : b;
    };

    const map = new Map<string, Bleeder2TrackRow>();

    for (const row of bleeders) {
      const coreId = row.keywordId || row.productTargetingId || row.targetingId || "";

      const key = [row.source, row.campaignId || row.campaignName, row.adGroupId || row.adGroupName, coreId]
        .map((x) =>
          String(x ?? "")
            .trim()
            .toLowerCase(),
        )
        .join("|");

      if (!map.has(key)) {
        map.set(key, row);
      } else {
        const existing = map.get(key)!;
        map.set(key, pickBetter(existing, row));
      }
    }

    console.debug("[B2 SBSD] dedupe", {
      before: bleeders.length,
      after: map.size,
    });

    bleeders = Array.from(map.values());
  }

  bleeders.sort((a, b) => b.spend - a.spend);
  const totalSpend = bleeders.reduce((sum, b) => sum + b.spend, 0);

  const withCampaignId = bleeders.filter((b) => b.campaignId).length;
  const withAdGroupId = bleeders.filter((b) => b.adGroupId).length;
  const withKeywordId = bleeders.filter((b) => b.keywordId).length;
  const withTargetingId = bleeders.filter((b) => b.targetingId).length;

  console.debug("[B2 SBSD] ID coverage", {
    total: bleeders.length,
    withCampaignId,
    withAdGroupId,
    withKeywordId,
    withTargetingId,
  });

  const mapped = mapBleeder2RowsToReportFormat(bleeders);
  const wb = await generateOperatorWorkbook_A(mapped);

  const dateStr = new Date().toISOString().split("T")[0];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop() || "UTC";

  return {
    trackType: "SBSD",
    bleeders,
    totalSpend,
    totalRows: bleeders.length,
    sheetsProcessed,
    fileName: `B2_SBSD_${dateStr}_${tz}.xlsx`,
    workbook: wb,
    decisionWorkbook: wb,
    decisionFileName: `B2_SBSD_Decisions_${dateStr}_${tz}.xlsx`,
    marginPercent: targetACOS,
    bufferPercent: sbsdBuffer,
    acosThreshold,
    lowSalesThreshold: fewerThanOrders,
  };
};

/* =========================
 * Track B: SP Bad Keywords
 * ========================= */

export const analyzeSPKeywordsTrack = async (
  file: File,
  targetACOS: number,
  sbsdBuffer: number = 10,
  _clickThreshold_unused = 0,
  fewerThanOrders: number = 5,
  excludeRanking: boolean = false,
  bulkIndex?: any,
): Promise<Bleeder2TrackResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellText: false, cellDates: true, raw: true });

  const acosThreshold = targetACOS + sbsdBuffer;
  const bleeders: Bleeder2TrackRow[] = [];
  const sheetsProcessed: string[] = [];

  console.info("[B2 SP_KEYWORDS] start", {
    targetACOS,
    buffer: sbsdBuffer,
    acosThreshold,
    fewerThanOrders,
    sheets: workbook.SheetNames,
  });

  // 1) find SP campaign sheets - NO LONGER EXCLUDING based on Search Term column presence
  // This allows analysis of combined/messy reports
  let foundSheets: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const norm = normalizeHeader(sheetName);
    const isSPSheet = VALID_SP_CAMPAIGNS_SHEETS.some((p) => norm.includes(p) || p.includes(norm));
    if (!isSPSheet) continue;

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as any[][];
    if (!data.length) continue;
    
    // Accept sheets that have Campaign Name and Spend columns (basic validation)
    const headers = data[0].map((h) => String(h ?? ""));
    const hasCampaign = headersContains(headers, ALIASES.campaign);
    const hasSpend = headersContains(headers, ALIASES.spend);
    
    if (hasCampaign && hasSpend) {
      foundSheets.push(sheetName);
    }
  }

  if (foundSheets.length === 0) {
    const auto = findSheetByColumns(workbook, ["Campaign Name", "Spend", "ACOS"]);
    if (auto) foundSheets.push(auto);
  }

  if (foundSheets.length === 0) {
    throw new Error(
      "No SP Keywords/Targeting sheets found. Please upload an Amazon Bulk file that includes Sponsored Products Campaigns / Product Ads tabs (not just Search Term).",
    );
  }

  // Simplified entity classifier (Positive Identification Only)
  // CRITICAL: Now includes explicit Search Term detection for row-level filtering
  const classifySPEntity = (raw: string) => {
    const norm = raw.toLowerCase().replace(/\s+/g, "");
    return {
      isKeyword: norm.includes("keyword"),
      isProductTargeting: norm.includes("producttargeting") || norm.includes("contextualtargeting") || norm.includes("audiencetargeting"),
      isSearchTerm: norm.includes("searchterm"),
    };
  };

  for (const sheet of foundSheets) {
    sheetsProcessed.push(sheet);

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {
      header: 1,
      defval: "",
    }) as any[][];
    if (data.length < 2) continue;

    const headers = data[0].map((h) => String(h ?? ""));

    // --- FIX: DETECT BOTH CAMPAIGN COLUMNS ---
    const campaignColPrimary = findColumnWithAliases(headers, ["Campaign Name", "Campaign"]);
    const campaignColInfo = findColumnWithAliases(headers, [
      "Campaign Name (Informational only)",
      "Campaign (Informational only)",
    ]);

    // Fallback logic for column finding
    const campaignCol = campaignColPrimary !== -1 ? campaignColPrimary : campaignColInfo;

    const adGroupCol = findColumnWithAliases(headers, ALIASES.adgroup);

    // Robust Entity Column Finding
    let entityTypeCol = findColumnWithAliases(headers, ALIASES.entityType);
    if (entityTypeCol === -1) {
      entityTypeCol = findColumnWithAliases(headers, ["Entity", "Record Type", "Entity Type"]);
    }

    const keywordCol = findColumnWithAliases(headers, ALIASES.keywordTarget);
    const matchTypeCol = findColumnWithAliases(headers, ALIASES.matchType);

    // Robust Product Targeting Column Finding
    const productTargetingTextCol = findColumnWithAliases(headers, ALIASES.productTargetingText);
    const productTargetingCol = findColumnWithAliases(headers, ["Product Targeting", "ASIN"]);

    const stateCol = findColumnWithAliases(headers, ALIASES.state);
    const campaignStateCol = findColumnWithAliases(headers, ALIASES.campaignState);

    const clicksCol = findColumnWithAliases(headers, ALIASES.clicks);
    const impressionsCol = findColumnWithAliases(headers, ALIASES.impressions);
    const ctrCol = findColumnWithAliases(headers, ALIASES.ctr);
    const cpcCol = findColumnWithAliases(headers, ALIASES.cpc);
    const bidCol = findColumnWithAliases(headers, ALIASES.bid);
    const spendCol = findColumnWithAliases(headers, ALIASES.spend);

    const ordersCol = pickOrdersCol(headers);

    // Robust Sales Column Logic
    const salesCol = (() => {
      // 1. Try specific aliases using the fixed finder
      const s14 = findColumnWithAliases(headers, ALIASES.sales14);
      const s7 = findColumnWithAliases(headers, ALIASES.sales7);
      const sg = findColumnWithAliases(headers, ALIASES.salesGeneric);

      if (s14 !== -1) return s14;
      if (s7 !== -1) return s7;
      if (sg !== -1) return sg;

      // 2. Fallback: Search specifically for "sales" keyword in any header
      // This catches non-standard headers like "Sales ($)" or "Attributed Sales"
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i].toLowerCase();
        if (h.includes("sales")) return i;
      }
      return -1;
    })();
    const acosCol = pickAcosCol(headers);

    const campaignIdCol = findIdColumn(headers, ALIASES.campaignId);
    const adGroupIdCol = findIdColumn(headers, ALIASES.adGroupId);
    const keywordIdCol = findIdColumn(headers, ALIASES.keywordId);
    const productTargetingIdCol = findIdColumn(headers, ALIASES.productTargetingId);
    const targetingIdCol = findIdColumn(headers, ALIASES.targetingId);

    if (campaignCol === -1 || spendCol === -1 || ordersCol === -1) {
      console.warn("[B2 SP_KEYWORDS] missing required columns", {
        sheet,
        campaignCol,
        spendCol,
        ordersCol,
        keywordCol,
      });
      continue;
    }

    console.info("[B2 SP_KEYWORDS] column map", {
      sheet,
      campaignColPrimary,
      campaignColInfo,
      entityHeader: entityTypeCol !== -1 ? headers[entityTypeCol] : null,
      productTargetingTextCol: productTargetingTextCol !== -1 ? headers[productTargetingTextCol] : null,
      productTargetingCol: productTargetingCol !== -1 ? headers[productTargetingCol] : null,
    });

    let scannedRows = 0;
    let rowsActionableEntity = 0;
    let rowsWithTargetText = 0;
    let rowsStateEnabled = 0;
    let rowsWithSpend = 0;
    let rowsBelowOrderThresh = 0;
    let rowsAboveAcosThresh = 0;
    let rowsExcludedRanking = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      scannedRows++;

      // --- FIX: ROBUST CAMPAIGN NAME EXTRACTION ---
      // Try primary column first; if empty (sparse data), try informational column.
      let campaignName = "";
      if (campaignColPrimary !== -1) {
        campaignName = String(row[campaignColPrimary] ?? "").trim();
      }
      if (!campaignName && campaignColInfo !== -1) {
        campaignName = String(row[campaignColInfo] ?? "").trim();
      }

      // If we still don't have a campaign name, we can't report on this row.
      if (!campaignName) continue;

      // --- 1. Entity Classification and ID Check ---
      const rawEntityValue = entityTypeCol !== -1 ? (row[entityTypeCol] ?? "") : "";
      const entityTypeRaw = String(rawEntityValue).trim();
      const { isKeyword, isProductTargeting, isSearchTerm } = classifySPEntity(entityTypeRaw);

      // ROW-LEVEL SECURITY: Skip Search Term rows to prevent contamination in combined reports
      if (isSearchTerm) {
        continue;
      }

      const rawCampaignId = campaignIdCol !== -1 ? String(row[campaignIdCol] ?? "").trim() : "";
      const rawAdGroupId = adGroupIdCol !== -1 ? String(row[adGroupIdCol] ?? "").trim() : "";
      const rawKeywordId = keywordIdCol !== -1 ? String(row[keywordIdCol] ?? "").trim() : "";
      const rawProductTargetingId = productTargetingIdCol !== -1 ? String(row[productTargetingIdCol] ?? "").trim() : "";
      const rawTargetingId = targetingIdCol !== -1 ? String(row[targetingIdCol] ?? "").trim() : "";

      const hasKeywordId = rawKeywordId.length > 0;
      const hasTargetingId = rawProductTargetingId.length > 0 || rawTargetingId.length > 0;

      // Simplest check: Is it a keyword OR product targeting?
      // NOTE: matchType === 'exact' is VALID and should NOT be filtered out
      const isActionable = isKeyword || isProductTargeting;

      // LOGIC CHECK: Only log specific rows if debugging is needed, otherwise this is noise
      // console.log(`[B2 SP_KEYWORDS] DEBUG-GATE 1: Row ${i + 1} (${entityTypeRaw}) - IsActionable: ${isActionable}`);


      if (!isActionable) continue;

      rowsActionableEntity++;

      // --- 2. Robust Text Extraction ---
      const genericKeywordText = keywordCol !== -1 ? String(row[keywordCol] ?? "").trim() : "";
      const productTargetingExpression =
        productTargetingTextCol !== -1 ? String(row[productTargetingTextCol] ?? "").trim() : "";
      const productTargetingValue = productTargetingCol !== -1 ? String(row[productTargetingCol] ?? "").trim() : "";

      // Prioritize Keyword Text, then Expression, then Value
      let entityTargetText = genericKeywordText;
      if (!entityTargetText.length) entityTargetText = productTargetingExpression;
      if (!entityTargetText.length) entityTargetText = productTargetingValue;

      const finalProductTargetingText =
        productTargetingExpression.length > 0 ? productTargetingExpression : productTargetingValue;

      const hasText = entityTargetText.length > 0;
      if (!hasText) continue;

      rowsWithTargetText++;

      // --- 3. Filter on Metrics/State ---
      const state = stateCol !== -1 ? normalizeState(row[stateCol]) : "enabled";
      const campaignState = campaignStateCol !== -1 ? normalizeState(row[campaignStateCol]) : "enabled";
      const stateOk =
        (stateCol === -1 || state === "enabled") && (campaignStateCol === -1 || campaignState === "enabled");
      if (!stateOk) continue;
      rowsStateEnabled++;

      const spend = safeParseFloat(row[spendCol]);
      if (spend <= 0) continue;
      rowsWithSpend++;

      let finalOrdersCol = pickOrdersCol(headers);
      if (finalOrdersCol === -1) {
        // New super-robust fallback for the known 'Units' header
        finalOrdersCol = findColumn(headers, ["Units", "Total Units", "Orders"]);
      }
      const orders = finalOrdersCol !== -1 ? safeParseFloat(row[finalOrdersCol]) : 0;
      if (orders > fewerThanOrders) continue;
      rowsBelowOrderThresh++;

      // --- ACoS Parsing and Filtering ---
      const sales = salesCol !== -1 ? safeParseFloat(row[salesCol]) : 0;

      let acos = acosCol !== -1 ? safeParseFloat(row[acosCol]) : calculateACoS(spend, sales);

      if (acos > 0 && acos < 100) {
        // If the ACOS is between 0% and 100%
        // Check if ACOS (Spend/Sales) calculated from raw data would exceed 100%
        const calculatedACOS = calculateACoS(spend, sales);

        // If the calculated ACOS is high (e.g., 100.0 or more) but the imported ACOS is low (e.g., 1.16),
        // it means the imported ACOS value is likely a decimal representation of a percentage.
        if (calculatedACOS > 100.0 && acos < 2.0) {
          // Highly suspicious low value, likely 1.16 is 116%
          acos *= 100;
          console.warn(
            `[ACOS FIXED] Row ${i + 1}: Corrected ACOS from ${acos / 100} to ${acos.toFixed(2)}% based on Spend/Sales ratio.`,
          );
        } else if (acos < 10.0) {
          // Default correction for values between 0 and 10
          acos *= 100;
        }
      }
      // ----------------------------------------------

      if (acos <= acosThreshold) continue;
      rowsAboveAcosThresh++;

      const isRankCampaign = /rank/i.test(campaignName);
      if (excludeRanking && isRankCampaign) {
        rowsExcludedRanking++;
        continue;
      }

      // --- 4. Final Data Mapping ---
      let keywordId: string | undefined = undefined;
      let productTargetingId: string | undefined = undefined;
      let targetingId: string | undefined = undefined;

      if (hasKeywordId) {
        keywordId = rawKeywordId;
      } else if (rawProductTargetingId.length > 0) {
        productTargetingId = rawProductTargetingId;
        targetingId = rawTargetingId || undefined;
      } else if (rawTargetingId.length > 0) {
        targetingId = rawTargetingId;
      }

      const adGroupName = adGroupCol !== -1 ? String(row[adGroupCol] ?? "").trim() : "";
      const matchType = matchTypeCol !== -1 ? String(row[matchTypeCol] ?? "").trim() : "";
      const clicks = clicksCol !== -1 ? safeParseFloat(row[clicksCol]) : 0;
      const impressions = impressionsCol !== -1 ? safeParseFloat(row[impressionsCol]) : 0;
      const cpc = cpcCol !== -1 ? safeParseFloat(row[cpcCol]) : clicks > 0 ? spend / clicks : 0;
      const bid = bidCol !== -1 ? safeParseFloat(row[bidCol]) : 0;
      const ctr = ctrCol !== -1 ? safeParseFloat(row[ctrCol]) : impressions > 0 ? (clicks / impressions) * 100 : 0;

      bleeders.push({
        campaignName,
        adGroupName: adGroupName || undefined,
        entity: entityTargetText,
        matchType: matchType || undefined,
        spend,
        orders,
        acos,
        sales,
        clicks,
        impressions,
        cpc,
        bid: bid > 0 ? bid : undefined,
        ctr,
        roas: sales > 0 ? sales / spend : 0,
        source: "SP",
        salesWindow: salesCol !== -1 && headers[salesCol].includes("14") ? "14D" : "7D",
        isRankCampaign,
        trackType: "SP_KEYWORDS",
        campaignId: rawCampaignId || undefined,
        adGroupId: rawAdGroupId || undefined,
        keywordId,
        productTargetingId,
        targetingId,
        targetingText: finalProductTargetingText.length > 0 ? finalProductTargetingText : undefined,
      });
    }

    console.info("[B2 SP_KEYWORDS] gating stats", {
      sheet,
      acosThreshold,
      fewerThanOrders,
      scannedRows,
      rowsActionableEntity,
      rowsWithTargetText,
      rowsStateEnabled,
      rowsWithSpend,
      rowsBelowOrderThresh,
      rowsAboveAcosThresh,
      rowsExcludedRanking,
      bleedersSoFar: bleeders.length,
    });
  }

  // --- Deduplication ---
  const dedupedBleedersMap = new Map<string, Bleeder2TrackRow>();
  for (const bleeder of bleeders) {
    const key = `${bleeder.entity}_${bleeder.campaignId || bleeder.campaignName}_${bleeder.adGroupId || bleeder.adGroupName}`;
    const existing = dedupedBleedersMap.get(key);
    if (!existing || bleeder.spend > existing.spend) {
      dedupedBleedersMap.set(key, bleeder);
    }
  }
  const finalBleeders = Array.from(dedupedBleedersMap.values());
  finalBleeders.sort((a, b) => b.spend - a.spend);

  const totalSpend = finalBleeders.reduce((sum, b) => sum + b.spend, 0);

  const idCoverage = {
    total: finalBleeders.length,
    withCampaignId: finalBleeders.filter((b) => b.campaignId).length,
    withAdGroupId: finalBleeders.filter((b) => b.adGroupId).length,
    withKeywordId: finalBleeders.filter((b) => b.keywordId).length,
    withProductTargetingId: finalBleeders.filter((b) => b.productTargetingId).length,
    withTargetingId: finalBleeders.filter((b) => b.targetingId).length,
  };

  console.info("[B2 SP_KEYWORDS] final", {
    totalBleeders: finalBleeders.length,
    totalSpend,
    sheetsProcessed,
    idCoverage,
    sampleBleeders: finalBleeders.slice(0, 3).map((b) => ({
      campaign: b.campaignName,
      entity: b.entity,
      spend: b.spend,
      orders: b.orders,
      acos: b.acos,
      keywordId: b.keywordId,
      productTargetingId: b.productTargetingId,
      targetingId: b.targetingId,
    })),
  });

  const mapped = mapBleeder2RowsToReportFormat(finalBleeders);
  const wb = await generateOperatorWorkbook_A(mapped);

  const dateStr = new Date().toISOString().split("T")[0];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop() || "UTC";

  return {
    trackType: "SP_KEYWORDS",
    bleeders: finalBleeders,
    totalSpend,
    totalRows: finalBleeders.length,
    sheetsProcessed,
    fileName: `B2_SP_KEYWORDS_${dateStr}_${tz}.xlsx`,
    workbook: wb,
    decisionWorkbook: wb,
    decisionFileName: `B2_SP_KEYWORDS_Decisions_${dateStr}_${tz}.xlsx`,
    marginPercent: targetACOS,
    bufferPercent: sbsdBuffer,
    acosThreshold,
    lowSalesThreshold: fewerThanOrders,
  };
};

/* =========================
 * Track C: SP Search Term (Bad Search Terms – Bleeders 2.0)
 * ========================= */

export const analyzeSPTrack = async (
  file: File,
  targetACOS: number,
  spBuffer: number = 20,
  _clickThreshold_unused: number = 0,
  fewerThanOrders: number = 5,
  excludeRanking: boolean = false,
  bulkIndex?: any,
): Promise<Bleeder2TrackResult> => {
  const buffer = await file.arrayBuffer(); // --- CRITICAL FIX: Ensure 'raw: true' is set for proper ID string handling ---
  const workbook = XLSX.read(buffer, { type: "array", cellText: false, cellDates: true, raw: true });

  const acosThreshold = targetACOS + spBuffer;
  let bleeders: Bleeder2TrackRow[] = [];
  const sheetsProcessed: string[] = [];

  let sheetName = findSheetByPatterns(workbook.SheetNames, VALID_SP_SEARCH_TERM_SHEETS);
  if (!sheetName) sheetName = findSheetByColumns(workbook, ["Campaign Name", "Customer Search Term", "Spend"]);
  if (!sheetName) sheetName = findSheetByColumns(workbook, ["Campaign Name", "Targeting", "Spend"]);

  if (!sheetName)
    throw new Error(
      "No SP Search Term or SP Targeting sheet found. Please upload an Amazon Bulk file that includes an SP Search Term Report tab.",
    );

  sheetsProcessed.push(sheetName);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("SP Search Term sheet is empty."); // --- CRITICAL FIX: Explicitly set the range and use "skipHidden" false ---

  const range = sheet["!ref"];
  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    range: range,
    raw: true,
    blankrows: true,
    skipHidden: false,
  }) as any[][]; // ------------------------------------------------------------------------
  if (data.length < 2) throw new Error("SP Search Term sheet is empty.");

  const headers = data[0].map((h) => String(h ?? ""));

  const campaignCol = findColumnWithAliases(headers, ALIASES.campaign);
  const adGroupCol = findColumnWithAliases(headers, ALIASES.adgroup);
  const matchTypeCol = findColumnWithAliases(headers, ALIASES.matchType);
  const stateCol = findColumnWithAliases(headers, ALIASES.state);
  const campaignStateCol = findColumnWithAliases(headers, ALIASES.campaignState);

  const searchTermCol = findColumnWithAliases(headers, ALIASES.customerSearchTerm);
  const targetingCol = findColumnWithAliases(headers, ALIASES.keywordTarget);

  const spendCol = findColumnWithAliases(headers, ALIASES.spend);
  const ordersCol = pickOrdersCol(headers);
  const acosCol = pickAcosCol(headers);
  const salesCol = (() => {
    const s14 = findColumnWithAliases(headers, ALIASES.sales14);
    const s7 = findColumnWithAliases(headers, ALIASES.sales7);
    const sg = findColumnWithAliases(headers, ALIASES.salesGeneric);
    return s14 !== -1 ? s14 : s7 !== -1 ? s7 : sg;
  })();

  const clicksCol = findColumnWithAliases(headers, ALIASES.clicks);
  const impressionsCol = findColumnWithAliases(headers, ALIASES.impressions);
  const ctrCol = findColumnWithAliases(headers, ALIASES.ctr);
  const cpcCol = findColumnWithAliases(headers, ALIASES.cpc);

  const campaignIdCol = findIdColumn(headers, ALIASES.campaignId);
  const adGroupIdCol = findIdColumn(headers, ALIASES.adGroupId);
  const keywordIdCol = findIdColumn(headers, ALIASES.keywordId);
  const productTargetingIdCol = findIdColumn(headers, ALIASES.productTargetingId);
  const targetingIdCol = findIdColumn(headers, ALIASES.targetingId); // --- Missing Column Checks (Same as before) ---

  if (campaignCol === -1 || spendCol === -1 || ordersCol === -1 || (searchTermCol === -1 && targetingCol === -1)) {
    console.warn("[B2 SP_SEARCH] missing required columns", { sheetName, campaignCol, spendCol, ordersCol });
    return {
      trackType: "SP",
      bleeders: [],
      totalSpend: 0,
      totalRows: 0,
      sheetsProcessed,
      fileName: "",
      decisionWorkbook: new ExcelJS.Workbook(),
      decisionFileName: "",
      marginPercent: targetACOS,
      bufferPercent: spBuffer,
      acosThreshold,
      lowSalesThreshold: fewerThanOrders,
    };
  }

  let scannedRows = 0;
  let rowsStateEnabled = 0;
  let rowsWithSpend = 0;
  let rowsBelowOrderThresh = 0;
  let rowsAboveACOSThresh = 0; // We are reverting the DIAGNOSE logs and inserting the targeted Orders log

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const currentRowNum = i + 1;

    if (!row || row.length === 0) continue;
    scannedRows++;

    const rawCampaignName = String(row[campaignCol] ?? "").trim(); // --- ID EXTRACTION FIX APPLIED HERE: Use raw cell value directly ---

    const campaignId = campaignIdCol !== -1 ? String(row[campaignIdCol] ?? "").trim() : "";
    const adGroupId = adGroupIdCol !== -1 ? String(row[adGroupIdCol] ?? "").trim() : "";
    const keywordId = keywordIdCol !== -1 ? String(row[keywordIdCol] ?? "").trim() : "";
    const productTargetingId = productTargetingIdCol !== -1 ? String(row[productTargetingIdCol] ?? "").trim() : "";
    const targetingId = targetingIdCol !== -1 ? String(row[targetingIdCol] ?? "").trim() : ""; // ---------------------
    let campaignName = rawCampaignName; // Ensure Campaign Name is not empty, use ID as fallback
    if (!campaignName && campaignId) {
      campaignName = `(ID: ${campaignId})`;
    }
    if (!campaignName) continue;

    const searchTerm = searchTermCol !== -1 ? String(row[searchTermCol] ?? "").trim() : "";
    const targetingTxt = targetingCol !== -1 ? String(row[targetingCol] ?? "").trim() : "";
    let entity = searchTerm || targetingTxt;
    if (!entity) {
      console.log(`[FILTER FAIL] Row ${currentRowNum}: No entity/search term found.`);
      continue;
    }

    const state = stateCol !== -1 ? normalizeState(row[stateCol]) : "enabled";
    const campaignState = campaignStateCol !== -1 ? normalizeState(row[campaignStateCol]) : "enabled";
    const stateOk =
      (stateCol === -1 || state === "enabled") && (campaignStateCol === -1 || campaignState === "enabled");
    if (!stateOk) continue;
    rowsStateEnabled++;

    const adGroupName = String(adGroupCol !== -1 ? row[adGroupCol] : "").trim();
    const matchType = matchTypeCol !== -1 ? String(row[matchTypeCol] ?? "").trim() : "";

    const spend = safeParseFloat(row[spendCol]);
    if (spend <= 0) {
      console.log(`[FILTER FAIL] Row ${currentRowNum}: Spend is zero or less (${spend.toFixed(2)}).`);
      continue;
    }
    rowsWithSpend++;

    const orders = safeParseFloat(row[ordersCol]); // --- FILTER ACTION ---

    if (orders > fewerThanOrders) {
      continue;
    }
    rowsBelowOrderThresh++; // ---------------------------------
    const sales = salesCol !== -1 ? safeParseFloat(row[salesCol]) : 0;
    const clicks = clicksCol !== -1 ? safeParseFloat(row[clicksCol]) : 0;
    const impressions = impressionsCol !== -1 ? safeParseFloat(row[impressionsCol]) : 0;
    const cpc = cpcCol !== -1 ? safeParseFloat(row[cpcCol]) : clicks > 0 ? spend / clicks : 0;
    const ctr = ctrCol !== -1 ? safeParseFloat(row[ctrCol]) : impressions > 0 ? (clicks / impressions) * 100 : 0; // Calculate ACoS before potentially using the imported ACoS value

    let acos = acosCol !== -1 ? safeParseFloat(row[acosCol]) : calculateACoS(spend, sales);
    const calculatedACOS = calculateACoS(spend, sales); // --- ROBUST ACOS CORRECTION LOGIC APPLIED HERE ---
    if (calculatedACOS > 100.0 && acos > 0 && acos < 2.0) {
      // ACOS is low (e.g., 1.16) but calculated ACOS (Spend/Sales) is high (e.g., 115.92),
      // indicating the low value is a decimal percentage that needs conversion.
      console.warn(
        `[ACOS FIXED] Row ${currentRowNum}: Corrected ACOS from ${acos.toFixed(4)} to ${(acos * 100).toFixed(2)}% based on Spend/Sales ratio.`,
      );
      acos *= 100;
    } else if (acos > 0 && acos < 10) {
      // Fallback for simple decimal-to-percent conversion (e.g., 5.0 -> 500%)
      acos *= 100;
    } // ----------------------------------------------
    if (acos <= acosThreshold) {
      console.log(
        `[FILTER FAIL] Row ${currentRowNum}: ACOS (${acos.toFixed(2)}%) is below threshold (${acosThreshold.toFixed(2)}%).`,
      );
      continue;
    }
    rowsAboveACOSThresh++;

    const isRankCampaign = /rank/i.test(campaignName);

    if (excludeRanking && isRankCampaign) {
      continue; // The final continue.
    } // --- SUCCESS LOG ---

    console.log(`[SUCCESS] Row ${currentRowNum}: Added to bleeders array.`); // -------------------
    bleeders.push({
      campaignName,
      adGroupName: adGroupName || undefined,
      entity,
      matchType: matchType || undefined,
      customerSearchTerm: searchTerm || undefined,
      targetingText: targetingTxt || undefined,
      spend,
      orders,
      acos,
      sales,
      clicks,
      impressions,
      cpc,
      ctr,
      roas: sales > 0 ? sales / spend : 0,
      source: "SP",
      salesWindow: "7D",
      isRankCampaign,
      trackType: "SP", // --- CRITICAL FIX: IDs are now correctly extracted and passed ---
      campaignId: campaignId || undefined,
      adGroupId: adGroupId || undefined,
      keywordId: keywordId || undefined,
      productTargetingId: productTargetingId || undefined,
      targetingId: targetingId || undefined,
    });
  }

  console.log("[DEBUG 7 COUNT] Bleeders array count after loop:", bleeders.length); // --- FINAL DEDUPLICATION: Strict Text Key + Row Index Fallback (Same as before) ---

  {
    const dedupedMap = new Map<string, Bleeder2TrackRow>();
    let uniqueCounter = 0;

    for (const row of bleeders) {
      // Key based ONLY on Campaign Name, Ad Group Name, and Entity Text
      const keyParts = [];
      keyParts.push(row.source);
      keyParts.push(row.campaignName);
      keyParts.push(row.adGroupName || "");
      keyParts.push(row.entity);

      let key = keyParts
        .map((x) =>
          String(x ?? "")
            .trim()
            .toLowerCase(),
        )
        .join("|");

      const existing = dedupedMap.get(key);

      if (!existing) {
        dedupedMap.set(key, row);
      } else {
        // COLLISION DETECTED
        uniqueCounter++;
        const uniqueKey = `${key}__UNIQUE_${uniqueCounter}`;

        row.campaignName = `${row.campaignName} [COLLISION:${uniqueCounter}]`;

        dedupedMap.set(uniqueKey, row);
      }
    }
    bleeders = Array.from(dedupedMap.values());
  } // -------------------------------------------------------------------------------------
  bleeders.sort((a, b) => b.spend - a.spend);
  const totalSpend = bleeders.reduce((sum, b) => sum + b.spend, 0);

  console.debug("[B2 SP_SEARCH] gating stats", {
    sheetName,
    scannedRows,
    rowsStateEnabled,
    rowsWithSpend,
    rowsBelowOrderThresh,
    rowsAboveACOSThresh,
    finalBleeders: bleeders.length,
    acosThreshold,
    fewerThanOrders,
  }); // ... (rest of the function including ID coverage and return block is the same)

  const withCampaignId = bleeders.filter((b) => b.campaignId).length;
  const withAdGroupId = bleeders.filter((b) => b.adGroupId).length;
  const withKeywordId = bleeders.filter((b) => b.keywordId).length;
  const withTargetingId = bleeders.filter((b) => b.productTargetingId).length;

  console.debug("[B2 SP_SEARCH] ID coverage", {
    total: bleeders.length,
    withCampaignId,
    withAdGroupId,
    withKeywordId,
    withTargetingId,
  });

  const mappedRows = mapBleeder2RowsToReportFormat(bleeders);
  const workbookOut = await generateOperatorWorkbook_A(mappedRows);

  const dateStr = new Date().toISOString().split("T")[0];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.split("/").pop() || "UTC";

  return {
    trackType: "SP",
    bleeders,
    totalSpend,
    totalRows: bleeders.length,
    sheetsProcessed,
    fileName: `B2_SP_SEARCHTERMS_${dateStr}_${tz}.xlsx`,
    workbook: workbookOut,
    decisionWorkbook: workbookOut,
    decisionFileName: `B2_SP_SEARCHTERMS_Decisions_${dateStr}_${tz}.xlsx`,
    marginPercent: targetACOS,
    bufferPercent: spBuffer,
    acosThreshold,
    lowSalesThreshold: fewerThanOrders,
  };
};

/* =========================
 * Track D: Campaigns >= 100% ACOS
 * ========================= */

export const analyzeACoS100Track = async (
  file: File,
  excludeRanking: boolean = false,
  bulkIndex?: any,
): Promise<Bleeder2TrackResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellText: false, cellDates: true, raw: true });

  const bleeders: Bleeder2TrackRow[] = [];
  const sheetsProcessed: string[] = [];
  const ACOS_THRESHOLD = 100; // --- 1. MULTI-SHEET ITERATION FIX ---

  let foundSheets: string[] = findSheetsByPatterns(workbook.SheetNames, VALID_ACOS100_SHEETS);

  if (foundSheets.length === 0) {
    // Fallback to auto-detecting a sheet with key headers
    const auto = findSheetByColumns(workbook, ["Campaign Name", "Spend", "ACoS"]);
    if (auto) foundSheets.push(auto);
  }

  if (foundSheets.length === 0) {
    throw new Error("No relevant Campaign sheets found. Please upload a bulk file containing campaign data.");
  } // --- END MULTI-SHEET FIX ---
  for (const sheet of foundSheets) {
    sheetsProcessed.push(sheet);

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, defval: "" }) as any[][];
    if (data.length < 2) continue; // Skip empty sheets

    const headers = data[0].map((h) => String(h ?? "")); // --- COLUMN MAPPING: ROBUST CAMPAIGN NAME FINDING ---
    const campaignColPrimary = findColumnWithAliases(headers, ["Campaign Name", "Campaign"]);
    const campaignColInfo = findColumnWithAliases(headers, [
      "Campaign Name (Informational only)",
      "Campaign (Informational only)",
    ]);
    const campaignCol = campaignColPrimary !== -1 ? campaignColPrimary : campaignColInfo; // Use one if primary fails

    const spendCol = findColumnWithAliases(headers, ALIASES.spend);

    // NEW: Add Orders Column Finder
    const ordersCol = pickOrdersCol(headers);

    const acosCol = pickAcosCol(headers);

    // UPDATED: Robust Sales Column Finder
    const salesCol = (() => {
      const sg = findColumnWithAliases(headers, ALIASES.salesGeneric);
      const s7 = findColumnWithAliases(headers, ALIASES.sales7);
      const s14 = findColumnWithAliases(headers, ALIASES.sales14);
      if (sg !== -1) return sg;
      if (s7 !== -1) return s7;
      if (s14 !== -1) return s14;
      // Fallback: Find any column containing "sales"
      return headers.findIndex((h) => h.toLowerCase().includes("sales"));
    })();

    const clicksCol = findColumnWithAliases(headers, ALIASES.clicks);
    // ------------------------------------------------
    const rankingCol = findColumnWithAliases(headers, ALIASES.ranking);
    const entityTypeCol = findColumnWithAliases(headers, ALIASES.entityType);

    const campaignIdCol = findIdColumn(headers, ALIASES.campaignId);
    const stateCol = findColumnWithAliases(headers, ALIASES.state);
    const campaignStateCol = findColumnWithAliases(headers, ALIASES.campaignState); // Basic check to ensure we have the minimum required columns

    if (campaignCol === -1 || spendCol === -1 || acosCol === -1) {
      console.warn(`[B2 ACOS100] Skipping sheet ${sheet}: Missing required Campaign/Spend/ACoS columns.`);
      continue;
    }

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // --- Entity Filter: Only process Campaign rows ---
      if (entityTypeCol !== -1) {
        const et = String(row[entityTypeCol] ?? "")
          .trim()
          .toLowerCase();
        if (et.length > 0 && et !== "campaign" && et !== "sponsored products campaign") continue;
      }

      // --- Robust Campaign Name Extraction ---
      let campaignName = "";
      if (campaignColPrimary !== -1) {
        campaignName = String(row[campaignColPrimary] ?? "").trim();
      }
      // Fallback to Informational column if primary is empty (sparse data fix)
      if (!campaignName && campaignColInfo !== -1) {
        campaignName = String(row[campaignColInfo] ?? "").trim();
      }
      if (!campaignName) continue; // Skip if no campaign name found

      // --- State Check ---
      const state = stateCol !== -1 ? normalizeState(row[stateCol]) : "enabled";
      const campaignState = campaignStateCol !== -1 ? normalizeState(row[campaignStateCol]) : "enabled";
      if ((stateCol !== -1 && state !== "enabled") || (campaignStateCol !== -1 && campaignState !== "enabled")) {
        continue;
      }

      // --- Metric Parsing and Filtering ---
      const spend = safeParseFloat(row[spendCol]);
      const sales = salesCol !== -1 ? safeParseFloat(row[salesCol]) : 0;

      // NEW: Actually get the orders!
      const orders = ordersCol !== -1 ? safeParseFloat(row[ordersCol]) : 0;

      const clicks = clicksCol !== -1 ? safeParseFloat(row[clicksCol]) : 0;
      let acos = acosCol !== -1 ? safeParseFloat(row[acosCol]) : calculateACoS(spend, sales);

      if (acos > 0 && acos < 100) {
        // If the ACOS is between 0% and 100%
        // Check if ACOS (Spend/Sales) calculated from raw data would exceed 100%
        const calculatedACOS = calculateACoS(spend, sales);

        // If the calculated ACOS is high (e.g., 100.0 or more) but the imported ACOS is low (e.g., 1.16),
        // it means the imported ACOS value is likely a decimal representation of a percentage.
        if (calculatedACOS > 100.0 && acos < 2.0) {
          // Highly suspicious low value, likely 1.16 is 116%
          acos *= 100;
          console.warn(
            `[ACOS FIXED] Row ${i + 1}: Corrected ACOS from ${acos / 100} to ${acos.toFixed(2)}% based on Spend/Sales ratio.`,
          );
        } else if (acos < 10.0) {
          // Default correction for values between 0 and 10
          acos *= 100;
        }
      }
      // ----------------------------------------------
      if (acos <= ACOS_THRESHOLD) continue;

      let isRankCampaign = /rank/i.test(campaignName);
      if (rankingCol !== -1) {
        const v = String(row[rankingCol] ?? "")
          .toLowerCase()
          .trim();
        isRankCampaign = isRankCampaign || v === "true" || v === "yes" || v === "1";
      }
      if (excludeRanking && isRankCampaign) continue;

      const campaignId = campaignIdCol !== -1 ? String(row[campaignIdCol] ?? "").trim() : ""; // FINAL FILTER: Spend > 0 AND ACOS >= 100%

      if (spend > 0 && acos >= ACOS_THRESHOLD) {
        bleeders.push({
          campaignName,
          entity: undefined, // Entity is the campaign name for this track
          spend,
          orders: orders, // Orders are typically zeroed out for Campaign-level tracking if not explicit
          acos,
          sales,
          clicks,
          isRankCampaign,
          trackType: "ACOS100",
          campaignId: campaignId || undefined,
        });
      }
    }
  } // --- FINAL PROCESSING ---

  bleeders.sort((a, b) => b.spend - a.spend);
  const totalSpend = bleeders.reduce((s, b) => s + b.spend, 0);
  const withCampaignId = bleeders.filter((b) => b.campaignId).length;

  console.debug("[B2 ACOS100] ID coverage", {
    total: bleeders.length,
    withCampaignId,
    sheetsProcessed,
  });

  // Inside analyzeACoS100Track (Track D), approx line 970

  // --- REPLACE: the manual sheet renaming with this call ---
  const mappedRows = mapBleeder2RowsToReportFormat(bleeders);
  const workbookOut = await generateOperatorWorkbook_A(mappedRows);

  // Use the new reusable function
  fixSheetNameForCampaigns(workbookOut, "Sponsored Products"); // Assuming ACoS track only handles SP

  // --------------------------------------------------------

  const dateStr = new Date().toISOString().split("T")[0];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop() || "UTC";
  return {
    trackType: "ACOS100",
    bleeders,
    totalSpend,
    totalRows: bleeders.length,
    sheetsProcessed,
    fileName: `B2_ACOS100_${dateStr}_${tz}.xlsx`,
    workbook: workbookOut,
    decisionWorkbook: workbookOut,
    decisionFileName: `B2_ACOS100_Decisions_${dateStr}_${tz}.xlsx`,
    marginPercent: 0,
    bufferPercent: 0,
    acosThreshold: ACOS_THRESHOLD,
    lowSalesThreshold: 0,
  };
};
