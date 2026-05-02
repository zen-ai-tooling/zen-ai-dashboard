import * as XLSX from "xlsx";
import { normalizeDecision as sharedNormalizeDecision } from "./normalizeDecision";

// ---------------------------------------------------------------------------
// 📦 INLINED TYPES & HELPERS (To ensure no dependency issues)
// ---------------------------------------------------------------------------
export type AmazonRecordType =
  | "sponsoredProductsKeyword"
  | "sponsoredProductsNegativeKeyword"
  | "sponsoredProductsProductTargeting"
  | "sponsoredProductsNegativeProductTargeting"
  | "sponsoredBrandsKeyword"
  | "sponsoredBrandsNegativeKeyword"
  | "sponsoredBrandsProductTargeting"
  | "sponsoredDisplayProductTargeting"
  | "sponsoredDisplayNegativeProductTargeting";

export interface CanonicalBulkInputRow {
  recordType: AmazonRecordType;
  action: "pause" | "negative" | "cutBid" | "keep";
  campaignId?: string;
  adGroupId?: string;
  keywordId?: string;
  productTargetingId?: string;
  targetingId?: string;
  campaignName?: string;
  adGroupName?: string;
  keywordText?: string;
  targetingText?: string;
  matchType?: string;
  currentBid?: number;
  cutBidPercent?: number;
}

export interface Decision2ProcessorResult {
  workbook: any;
  fileName: string;
  summary: {
    pausedCount: number;
    negativesCreated: number;
    bidsCutCount: number;
    keptCount: number;
  };
  validation: {
    errors: string[];
    warnings: string[];
  };
  autoRepairs: Array<{ count: number; details: string }>;
}

const BULK_HEADERS = [
  "Product",
  "Entity",
  "Operation",
  "Campaign Id",
  "Campaign Name",
  "Ad Group Id",
  "Ad Group Name",
  "Keyword Id",
  "Product Targeting Id",
  "Targeting Id",
  "Keyword Text",
  "Targeting Text",
  "Match Type",
  "Bid",
  "State",
];

// ---------------------------------------------------------------------------
// 🛠️ MAIN PROCESSOR V3
// ---------------------------------------------------------------------------
export const processDecision2File = async (file: File): Promise<any> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const validation = { errors: [] as string[], warnings: [] as string[] };
  const autoRepairs: Array<{ type: string; count: number; details: string }> = [];
  const summary = { pausedCount: 0, negativesCreated: 0, bidsCutCount: 0, keptCount: 0 };

  // 1. Find Sheet
  const summarySheet = workbook.SheetNames.find(
    (name) =>
      name
        .toLowerCase()
        .replace(/[^a-z]/g, "")
        .includes("bleeders2") || name.toLowerCase().includes("summary"),
  );

  if (!summarySheet) {
    validation.errors.push("Could not find Bleeders 2.0 Summary sheet.");
    return { workbook, fileName: file.name, summary, validation, autoRepairs };
  }

  // 2. Read Data & Clean Merged Headers
  const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[summarySheet], { header: 1 }) as any[][];

  // Find real header row (contains "Decision")
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const rowStr = rawData[i].map((c) => String(c || "").toLowerCase());
    if (rowStr.some((c) => c.includes("decision"))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    validation.errors.push("Could not find header row with 'Decision'.");
    return { workbook, fileName: file.name, summary, validation, autoRepairs };
  }

  const headers = rawData[headerRowIndex].map((h) =>
    String(h || "")
      .toLowerCase()
      .trim(),
  );

  // 3. Map Columns
  const findCol = (namePart: string) => headers.findIndex((h) => h.includes(namePart));

  const colMap = {
    campaign: findCol("campaign"),
    decision: findCol("decision"),
    // Try multiple names for text
    text: headers.findIndex((h) => h === "targeting" || h === "keyword" || h === "keyword text" || h === "term"),
    matchType: findCol("match"),
    bid: headers.findIndex((h) => h === "bid" || h.includes("cpc")),
    source: findCol("source"),
  };

  if (colMap.decision === -1) {
    validation.errors.push("Missing 'Decision' column.");
    return { workbook, fileName: file.name, summary, validation, autoRepairs };
  }

  // 4. Process Rows
  const canonicalInputs: CanonicalBulkInputRow[] = [];
  let targetingRepairs = 0;

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const rawDecision = String(row[colMap.decision] || "").trim();
    if (!rawDecision) continue;

    const decision = sharedNormalizeDecision(rawDecision);
    if (decision === "keep") {
      summary.keptCount++;
      continue;
    }

    const campaignName = colMap.campaign !== -1 ? String(row[colMap.campaign] || "").trim() : "";
    const matchType = colMap.matchType !== -1 ? String(row[colMap.matchType] || "").trim() : "";
    const currentBid = colMap.bid !== -1 ? parseFloat(String(row[colMap.bid] || "0").replace(/[^0-9.-]/g, "")) : 0;

    // --- 🔥 NUCLEAR SCANNING LOGIC 🔥 ---
    let textValue = colMap.text !== -1 ? String(row[colMap.text] || "").trim() : "";

    // Scan the ENTIRE row for an ASIN (starts with 'asin=' or 'category=')
    // This overrides whatever the column mapping found if an ASIN is present.
    const asinCell = row.find((cell: any) => {
      const s = String(cell || "")
        .toLowerCase()
        .trim();
      return s.startsWith("asin=") || s.startsWith("category=");
    });

    if (asinCell) {
      // If we found an ASIN, use it!
      // This fixes the issue where textValue was incorrectly reading "Product Targeting"
      if (!textValue.toLowerCase().startsWith("asin=") && !textValue.toLowerCase().startsWith("category=")) {
        textValue = String(asinCell).trim();
        targetingRepairs++;
      }
    }

    // --- Classification ---
    const isASIN = textValue.toLowerCase().startsWith("asin=") || textValue.toLowerCase().startsWith("category=");

    // Infer Product (SP/SB/SD)
    let productPrefix = "sponsoredProducts";
    if (campaignName.startsWith("SB") || campaignName.includes("Video")) productPrefix = "sponsoredBrands";
    if (campaignName.startsWith("SD") || campaignName.includes("Display")) productPrefix = "sponsoredDisplay";

    let recordType: AmazonRecordType;
    let keywordTextFinal: string | undefined;
    let targetingTextFinal: string | undefined;

    if (isASIN) {
      // Product Targeting
      targetingTextFinal = textValue;
      recordType =
        decision === "negative"
          ? ((productPrefix + "NegativeProductTargeting") as AmazonRecordType)
          : ((productPrefix + "ProductTargeting") as AmazonRecordType);
    } else {
      // Keyword
      keywordTextFinal = textValue;
      recordType =
        decision === "negative"
          ? ((productPrefix + "NegativeKeyword") as AmazonRecordType)
          : ((productPrefix + "Keyword") as AmazonRecordType);
    }

    // SD Override
    if (productPrefix === "sponsoredDisplay") {
      recordType =
        decision === "negative" ? "sponsoredDisplayNegativeProductTargeting" : "sponsoredDisplayProductTargeting";
      targetingTextFinal = textValue;
      keywordTextFinal = undefined;
    }

    // Add to list
    if (decision === "pause") {
      canonicalInputs.push({
        recordType,
        action: "pause",
        campaignName,
        keywordText: keywordTextFinal,
        targetingText: targetingTextFinal,
        matchType: matchType || "Exact",
      });
      summary.pausedCount++;
    } else if (decision === "negative") {
      canonicalInputs.push({
        recordType,
        action: "negative",
        campaignName,
        keywordText: keywordTextFinal,
        targetingText: targetingTextFinal,
        matchType: "Negative Exact",
      });
      summary.negativesCreated++;
    } else if (decision === "cut bid") {
      if (currentBid > 0) {
        canonicalInputs.push({
          recordType,
          action: "cutBid",
          campaignName,
          keywordText: keywordTextFinal,
          targetingText: targetingTextFinal,
          matchType,
          currentBid,
          cutBidPercent: 50,
        });
        summary.bidsCutCount++;
      }
    }
  }

  if (targetingRepairs > 0) {
    autoRepairs.push({
      type: "targeting_repair",
      count: targetingRepairs,
      details: `Recovered ${targetingRepairs} ASINs via row scan.`,
    });
  }

  // 5. Build Output (Multi-Tab by Product Type)
  type AmazonProduct = "Sponsored Products" | "Sponsored Brands" | "Sponsored Display";

  const rowsByProduct: Record<AmazonProduct, any[][]> = {
    "Sponsored Products": [],
    "Sponsored Brands": [],
    "Sponsored Display": [],
  };

  for (const r of canonicalInputs) {
    const rt = r.recordType.toLowerCase();
    let product: AmazonProduct = "Sponsored Products";
    let entity = "Keyword";

    if (rt.includes("sponsoredbrands")) product = "Sponsored Brands";
    if (rt.includes("sponsoreddisplay")) product = "Sponsored Display";

    if (rt.includes("negativekeyword")) entity = "Negative keyword";
    else if (rt.includes("keyword")) entity = "Keyword";
    else if (rt.includes("negativeproducttargeting")) entity = "Negative product targeting";
    else if (rt.includes("producttargeting")) entity = "Product targeting";

    const op = r.action === "negative" ? "Create" : "Update";
    const state = r.action === "pause" ? "Paused" : "Enabled";
    const bid = r.action === "cutBid" && r.currentBid ? (r.currentBid * 0.5).toFixed(2) : undefined;

    const row = [
      product,
      entity,
      op,
      r.campaignId || "",
      r.campaignName || "",
      r.adGroupId || "",
      r.adGroupName || "",
      r.keywordId || "",
      r.productTargetingId || "",
      r.targetingId || "",
      r.keywordText || "",
      r.targetingText || "",
      r.matchType || "",
      bid || "",
      state,
    ];

    rowsByProduct[product].push(row);
  }

  const outputWorkbook = XLSX.utils.book_new();
  let tabsCreated = 0;

  // Create a separate tab for each product type that has rows
  const productTypes: AmazonProduct[] = ["Sponsored Products", "Sponsored Brands", "Sponsored Display"];
  for (const product of productTypes) {
    const productRows = rowsByProduct[product];
    if (productRows.length === 0) continue;

    // Use Amazon-required exact tab names (case-sensitive)
    const sheet = XLSX.utils.aoa_to_sheet([BULK_HEADERS, ...productRows]);
    XLSX.utils.book_append_sheet(outputWorkbook, sheet, product);
    tabsCreated++;
  }

  if (tabsCreated === 0) {
    validation.warnings.push("No actionable rows generated.");
  }

  const timestamp = new Date().toISOString().split("T")[0];
  return {
    workbook: outputWorkbook,
    fileName: `Bleeders2_SBSD_BulkUpdate_${timestamp}_PT.xlsx`,
    summary,
    validation,
    autoRepairs,
  };
};
