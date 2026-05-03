import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import type { Bleeder2TrackType } from "./bleeder2TrackAnalyzer";
import {
  CanonicalBulkInputRow,
  buildBulkRowsFromCanonical,
  BULK_UPDATE_HEADERS,
  bulkRowToArray,
  groupRowsByProduct,
  AMAZON_TAB_NAMES,
  type AmazonRecordType,
  type AmazonProduct,
} from "./amazonBulkBuilder";
import { normalizeDecision as sharedNormalizeDecision } from "./normalizeDecision";

export interface Bleeder2DecisionResult {
  trackType: Bleeder2TrackType;
  workbook: ExcelJS.Workbook;
  fileName: string;
  summary: {
    pausedCount: number;
    negativesCreated: number;
    bidsCutCount: number;
    keptCount: number;
    negativeProductTargetsCount: number;
  };
  validation: {
    errors: string[];
    warnings: string[];
  };
  autoRepairs: Array<{
    type: string;
    count: number;
    details: string;
  }>;
}

// ---------- Helpers ----------

const normalizeHeader = (header: string): string => {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^7day|^14day|^30day|^60day/i, "");
};

const findColumn = (headers: string[], possibleNames: string[]): number => {
  const normalizedHeaders = headers.map((h) => normalizeHeader(h));
  for (const name of possibleNames) {
    const normalized = normalizeHeader(name);
    const index = normalizedHeaders.indexOf(normalized);
    if (index !== -1) return index;
  }
  return -1;
};

const normalizeDecision = (value: string): string => {
  return sharedNormalizeDecision(value);
};

const safeParseFloat = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;
  const str = String(value)
    .replace(/[$%,]/g, "")
    .replace(/[^0-9.-]/g, "")
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// 🔥 UPDATED: Now detects ASIN expressions like asin="B0..."
const isASIN = (text: string): boolean => {
  if (!text) return false;
  const s = String(text).trim().toLowerCase();
  return /^B0[A-Z0-9]{8}$/i.test(s) || s.startsWith("asin=") || s.startsWith("category=");
};

type Channel = "SP" | "SB" | "SD" | "UNKNOWN";

const inferChannelFromSheetName = (sheetName: string, trackType: Bleeder2TrackType): Channel => {
  const norm = normalizeHeader(sheetName);

  if (norm.includes("sponsoredbrands") || norm.includes("sbv") || norm.includes("sponsoredbrand")) {
    return "SB";
  }
  if (norm.includes("sponsoreddisplay") || norm.startsWith("sd") || norm.includes("display")) {
    return "SD";
  }
  if (norm.includes("sponsoredproducts") || norm.includes("spsearch") || norm.includes("spkeywords")) {
    return "SP";
  }

  // Fallback based on track
  if (trackType === "SP") return "SP";
  if (trackType === "SBSD") return "SB";
  return "UNKNOWN";
};

const getPacificDateString = (): string => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  const [month, day, year] = formatter.format(new Date()).split("/");
  return `${month}-${day}-${year}`;
};

// ---------- Main ----------

export const processTrackDecisionFile = async (
  file: File,
  trackType: Bleeder2TrackType,
  cutBidPercentage?: number,
): Promise<Bleeder2DecisionResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const validation = { errors: [] as string[], warnings: [] as string[] };
  const autoRepairs: Array<{ type: string; count: number; details: string }> = [];
  const summary = {
    pausedCount: 0,
    negativesCreated: 0,
    bidsCutCount: 0,
    keptCount: 0,
    negativeProductTargetsCount: 0,
  };

  // Step 1: identify all "operator" sheets for this track
  const decisionSheets = workbook.SheetNames.filter((name) => {
    const norm = normalizeHeader(name);
    return (
      norm.includes("decision") ||
      norm.includes("sheet") ||
      norm.includes("operator") ||
      norm.includes("sponsoredproducts") ||
      norm.includes("sponsoredbrands") ||
      norm.includes("sponsoreddisplay") ||
      norm.includes("searchterm") ||
      norm.includes("targeting") ||
      norm.includes("keywords") ||
      norm.includes("acos") ||
      norm.includes("campaigns") ||
      norm.includes("100")
    );
  });

  if (decisionSheets.length === 0) {
    validation.errors.push("Could not find Decision Sheet. Please upload the file you downloaded from this track.");
    const errorWb = new ExcelJS.Workbook();
    errorWb.addWorksheet("Error");
    return {
      trackType,
      workbook: errorWb,
      fileName: file.name,
      summary,
      validation,
      autoRepairs,
    };
  }

  // We will build canonical input rows and then convert to Amazon Bulk 2.0
  const canonicalInputs: CanonicalBulkInputRow[] = [];

  let typosCorrected = 0;
  let actionableRows = 0;
  let missingBidCount = 0;
  let targetingRepairs = 0;

  // ---------- PER-SHEET PROCESSING ----------
  for (const sheetName of decisionSheets) {
    const ws = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    if (!data.length) continue; // Search for the header row starting from the second row (index 1) to skip the title row.

    // --- REPLACEMENT for Header Row Index Finding Block (around line 186) ---
    let headerRowIndex = -1;
    for (let i = 1; i < Math.min(20, data.length); i++) {
      const row = data[i]; // Look for the 'Campaign' header, which is mandatory.
      if (row && row.some((cell: any) => normalizeHeader(String(cell || "")).includes("campaign"))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      validation.warnings.push(`Sheet "${sheetName}": could not find header row containing "Campaign" – skipped.`);
      continue;
    }

    const headers = (data[headerRowIndex] || []).map((h) => String(h ?? ""));
    // --- END REPLACEMENT ---

    // --- ID columns ---
    const campaignIdCol = findColumn(headers, ["Campaign Id", "Campaign ID", "CampaignId"]);
    const adGroupIdCol = findColumn(headers, ["Ad Group Id", "Ad Group ID", "AdGroupId"]);
    const keywordIdCol = findColumn(headers, ["Keyword Id", "Keyword ID", "KeywordId"]);
    const productTargetingIdCol = findColumn(headers, [
      "Product Targeting Id",
      "Product Targeting ID",
      "ProductTargetingId",
    ]);
    const targetingIdCol = findColumn(headers, ["Targeting Id", "Targeting ID", "TargetingId"]);

    let campaignCol = findColumn(headers, ["Campaign Name", "Campaign"]);
    let decisionCol = findColumn(headers, ["Decision"]);

    if (campaignCol === -1 || decisionCol === -1) {
      validation.warnings.push(`Sheet "${sheetName}": missing Campaign and/or Decision column – skipped.`);
      continue;
    }

    // Track-specific extra columns
    let entityCol = -1;
    let matchTypeCol = -1;
    let adGroupCol = -1;
    let spendCol = -1;
    let bidCol = -1;
    let keywordTextCol = -1;
    let productTargetingCol = -1;
    let sourceCol = -1;

    const channelFromSheet = inferChannelFromSheetName(sheetName, trackType);

    if (trackType === "SBSD") {
      entityCol = findColumn(headers, ["Entity", "Keyword/Target", "Keyword", "Target", "Targeting"]);
      matchTypeCol = findColumn(headers, ["Match Type"]);
      adGroupCol = findColumn(headers, ["Ad Group", "Ad Group Name"]);
      bidCol = findColumn(headers, ["Bid", "Max Bid", "Keyword Bid"]);
      keywordTextCol = findColumn(headers, ["Keyword Text", "Keyword", "Target", "Targeting"]);
      productTargetingCol = findColumn(headers, ["Product Targeting Expression", "Product Targeting"]);
    } else if (trackType === "SP") {
      entityCol = findColumn(headers, ["Customer Search Term", "Search Term", "Targeting", "Keyword"]);
      adGroupCol = findColumn(headers, ["Ad Group", "Ad Group Name"]);
      matchTypeCol = findColumn(headers, ["Match Type"]);
      bidCol = findColumn(headers, ["Bid", "Max CPC", "CPC"]);
      keywordTextCol = findColumn(headers, ["Keyword Text", "Keyword", "Target", "Targeting"]);
    } else if (trackType === "SP_KEYWORDS") {
      // Priority order for entity/targeting text extraction:
      // 1. Product Targeting Expression / Targeting Expression (most specific)
      // 2. Keyword Text
      // 3. Generic fallbacks
      productTargetingCol = findColumn(headers, [
        "Product Targeting Expression",
        "Resolved Product Targeting Expression (Informational only)",
        "Targeting Expression",
        "Resolved Targeting Expression (Informational only)",
        "Product Targeting",
        "Targeting",
      ]);
      keywordTextCol = findColumn(headers, ["Keyword Text", "Keyword"]);
      entityCol = findColumn(headers, ["Entity", "Target"]);
      adGroupCol = findColumn(headers, ["Ad Group", "Ad Group Name"]);
      matchTypeCol = findColumn(headers, ["Match Type"]);
      bidCol = findColumn(headers, ["Bid", "Max CPC", "CPC"]);
      // --- REPLACEMENT for ACOS100 column finding block (around line 234) ---
    } else if (trackType === "ACOS100") {
      spendCol = findColumn(headers, ["Spend", "Cost"]);
      entityCol = findColumn(headers, ["Entity", "Campaign", "Targeting"]);
      sourceCol = findColumn(headers, ["Source"]);

      // ⭐ CRITICAL FIX: Force decisionCol = 4 (Column E) for ACOS100 track.
      // The Decision column is ALWAYS at index 4 in the ACOS100 decision file format.
      // Do NOT rely on findColumn as it incorrectly returns the Entity column (index 3).
      decisionCol = 4;
    }

    // Amazon Record Types Mapping with Safe Casting
    const recordTypes = {
      keyword: (chan: Channel): AmazonRecordType =>
        chan === "SB"
          ? ("sponsoredBrandsKeyword" as any)
          : chan === "SD"
            ? ("sponsoredDisplayProductTargeting" as any)
            : ("sponsoredProductsKeyword" as any),
      negativeKeyword: (chan: Channel): AmazonRecordType =>
        chan === "SB"
          ? ("sponsoredBrandsNegativeKeyword" as any)
          : chan === "SD"
            ? ("sponsoredDisplayNegativeProductTargeting" as any)
            : ("sponsoredProductsNegativeKeyword" as any),
      // 🔥 NEW: Add Product Targeting support explicitly
      productTargeting: (chan: Channel): AmazonRecordType =>
        chan === "SB"
          ? ("sponsoredBrandsProductTargeting" as any)
          : chan === "SD"
            ? ("sponsoredDisplayProductTargeting" as any)
            : ("sponsoredProductsProductTargeting" as any),
      campaign: (chan: Channel): AmazonRecordType =>
        chan === "SB"
          ? ("sponsoredBrandsCampaign" as any)
          : chan === "SD"
            ? ("sponsoredDisplayCampaign" as any)
            : ("sponsoredProductsCampaign" as any),
      adGroup: (chan: Channel): AmazonRecordType =>
        chan === "SB"
          ? ("sponsoredBrandsAdGroup" as any)
          : chan === "SD"
            ? ("sponsoredDisplayAdGroup" as any)
            : ("sponsoredProductsAdGroup" as any),
    };

    const isProductTargetingRecord = (rt: AmazonRecordType) =>
      rt.toLowerCase().includes("producttargeting") || rt.toLowerCase().includes("audiencetargeting");

    // ---------- ROW LOOP ----------
    for (let r = headerRowIndex + 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const decisionRaw = String(row[decisionCol] ?? "").trim();
      if (!decisionRaw) continue;

      const normalizedDecision = normalizeDecision(decisionRaw);
      if (normalizedDecision !== decisionRaw.toLowerCase()) {
        typosCorrected++;
      }

      // --- REPLACEMENT for the Channel Inference Block (around line 265) ---
      const campaignName = String(row[campaignCol] ?? "").trim(); // This variable is already defined earlier

      const channel =
        trackType === "ACOS100" && sourceCol !== -1
          ? (() => {
              const src = String(row[sourceCol] ?? "").toLowerCase(); // If Source column is populated, use it.
              if (src.includes("brand")) return "SB";
              if (src.includes("display")) return "SD";
              if (src.includes("product")) return "SP"; // 🔥 FINAL AUTOMATED FIX: If source is blank, use Campaign Name as fallback.

              const camNameLower = campaignName.toLowerCase();
              if (camNameLower.includes("sb") || camNameLower.includes("brand")) return "SB";
              if (camNameLower.includes("sd") || camNameLower.includes("display")) return "SD";
              if (camNameLower.includes("sp") || camNameLower.includes("asin")) return "SP";
              return channelFromSheet; // Final fallback (will likely be UNKNOWN)
            })()
          : channelFromSheet;
      // --- END REPLACEMENT ---

      const entity = entityCol !== -1 ? String(row[entityCol] ?? "").trim() : campaignName;
      const matchType = matchTypeCol !== -1 ? String(row[matchTypeCol] ?? "").trim() : "";
      const adGroupName = adGroupCol !== -1 ? String(row[adGroupCol] ?? "").trim() : "";
      const spend = spendCol !== -1 ? safeParseFloat(row[spendCol]) : 0;
      const bid = bidCol !== -1 ? safeParseFloat(row[bidCol]) : 0;
      const keywordTextRaw = keywordTextCol !== -1 ? String(row[keywordTextCol] ?? "").trim() : "";
      const productTargeting = productTargetingCol !== -1 ? String(row[productTargetingCol] ?? "").trim() : "";

      const rawCampaignId = campaignIdCol !== -1 ? String(row[campaignIdCol] ?? "").trim() : "";
      const rawAdGroupId = adGroupIdCol !== -1 ? String(row[adGroupIdCol] ?? "").trim() : "";
      const rawKeywordId = keywordIdCol !== -1 ? String(row[keywordIdCol] ?? "").trim() : "";
      const rawProductTargetingId = productTargetingIdCol !== -1 ? String(row[productTargetingIdCol] ?? "").trim() : "";
      const rawTargetingId = targetingIdCol !== -1 ? String(row[targetingIdCol] ?? "").trim() : "";

      const isCampaignLevel = trackType === "ACOS100";

      const campaignId = rawCampaignId || undefined;
      const adGroupId = rawAdGroupId || undefined;
      const keywordId: string | undefined = rawKeywordId || undefined;
      const productTargetingId: string | undefined = rawProductTargetingId || undefined;
      const targetingId: string | undefined = rawTargetingId || undefined;

      actionableRows++;

      // ---------- DECISION HANDLING ----------
      if (normalizedDecision === "pause") {
        if (isCampaignLevel) {
          const recordType = recordTypes.campaign(channel);
          canonicalInputs.push({ recordType, action: "pause", campaignName, campaignId });
          summary.pausedCount++;
        } else if (trackType === "SP") {
          // SP Search Term Logic
          const searchKeywordText = entityCol !== -1 ? String(row[entityCol] ?? "").trim() : "";
          if (searchKeywordText) {
            canonicalInputs.push({
              recordType: recordTypes.negativeKeyword("SP"),
              action: "negative",
              campaignName,
              campaignId,
              adGroupName,
              adGroupId,
              keywordText: searchKeywordText,
              matchType: "Negative Exact",
            });
            summary.negativesCreated++;
            validation.warnings.push(
              `Decision "Pause" converted to "Negative Exact" for Search Term "${searchKeywordText}".`,
            );
          }
        } else {
          // --- 🔥 REFINED TEXT EXTRACTION FOR SBSD / SP_KEYWORDS 🔥 ---
          // Priority Order:
          // 1. Product Targeting Expression column (most accurate for targeting rows)
          // 2. Keyword Text column (for keyword rows)
          // 3. Entity column fallback
          // 4. Row scanning for asin=/category= (last resort)

          let text = "";

          // Priority 1: Product Targeting Expression column
          if (
            productTargeting &&
            productTargeting.length > 0 &&
            productTargeting.toLowerCase() !== "product targeting"
          ) {
            text = productTargeting;
          }
          // Priority 2: Keyword Text column
          else if (keywordTextRaw && keywordTextRaw.length > 0 && keywordTextRaw.toLowerCase() !== "keyword") {
            text = keywordTextRaw;
          }
          // Priority 3: Entity column (if not generic)
          else if (
            entity &&
            entity.length > 0 &&
            entity.toLowerCase() !== "product targeting" &&
            entity.toLowerCase() !== "keyword"
          ) {
            text = entity;
          }
          // Priority 4: Row scanning fallback for asin=/category= values
          else {
            const asinCell = row.find(
              (cell: any) =>
                String(cell || "")
                  .toLowerCase()
                  .startsWith("asin=") ||
                String(cell || "")
                  .toLowerCase()
                  .startsWith("category="),
            );
            if (asinCell) {
              text = String(asinCell);
              targetingRepairs++;
            }
          }

          const isPAT = isASIN(text) || isProductTargetingRecord(recordTypes.keyword(channel));

          if (isPAT) {
            const recordType = recordTypes.productTargeting(channel);
            canonicalInputs.push({
              recordType,
              action: "pause",
              campaignName,
              campaignId,
              adGroupName,
              adGroupId,
              targetingText: text,
              matchType: matchType || "Exact",
              productTargetingId: productTargetingId || keywordId,
              targetingId,
            } as any);
          } else {
            const recordType = recordTypes.keyword(channel);
            canonicalInputs.push({
              recordType,
              action: "pause",
              campaignName,
              campaignId,
              adGroupName,
              adGroupId,
              keywordText: text,
              matchType: matchType || "Exact",
              keywordId,
              targetingId,
            } as any);
          }
          summary.pausedCount++;
        }
      } else if (normalizedDecision === "negative") {
        // REFINED TEXT EXTRACTION - Same priority as pause
        let textToNegate = "";

        // Priority 1: Product Targeting Expression column
        if (productTargeting && productTargeting.length > 0 && productTargeting.toLowerCase() !== "product targeting") {
          textToNegate = productTargeting;
        }
        // Priority 2: Keyword Text column
        else if (keywordTextRaw && keywordTextRaw.length > 0 && keywordTextRaw.toLowerCase() !== "keyword") {
          textToNegate = keywordTextRaw;
        }
        // Priority 3: Entity column (if not generic)
        else if (
          entity &&
          entity.length > 0 &&
          entity.toLowerCase() !== "product targeting" &&
          entity.toLowerCase() !== "keyword"
        ) {
          textToNegate = entity;
        }
        // Priority 4: Customer Search Term fallback (for SP track)
        else {
          const customerSearchTermCol = findColumn(headers, ["Customer Search Term", "Search Term"]);
          if (customerSearchTermCol !== -1) {
            textToNegate = String(row[customerSearchTermCol] ?? "").trim();
          }
        }
        // Priority 5: Row scanning fallback
        if (!textToNegate) {
          const asinCell = row.find(
            (cell: any) =>
              String(cell || "")
                .toLowerCase()
                .startsWith("asin=") ||
              String(cell || "")
                .toLowerCase()
                .startsWith("category="),
          );
          if (asinCell) {
            textToNegate = String(asinCell);
            targetingRepairs++;
          }
        }

        if (!textToNegate) {
          validation.warnings.push(`Row ${r}: Could not determine text for Negate action.`);
          summary.keptCount++;
          continue;
        }

        // Determine if this is a Product Targeting negative or Keyword negative
        const isPATNegative = isASIN(textToNegate);

        // Define the compliant canonical input
        const targetRecordType = isPATNegative
          ? recordTypes.negativeKeyword(channel) // Will resolve to NegativeProductTargeting for ASIN-based
          : recordTypes.negativeKeyword(channel);

        canonicalInputs.push({
          recordType: targetRecordType,
          action: "negative",
          campaignName,
          campaignId,
          adGroupName: adGroupId ? adGroupName : undefined,
          adGroupId: adGroupId ? adGroupId : undefined,
          keywordText: textToNegate,
          matchType: "Negative Exact",
          targetingText: isPATNegative ? textToNegate : undefined,
          keywordId: undefined,
          productTargetingId: undefined,
        } as any);

        summary.negativesCreated++;
      } else if (normalizedDecision === "cut bid") {
        const pct = cutBidPercentage ?? 25;
        if (isCampaignLevel) {
          if (adGroupId && bid > 0) {
            const recordType = recordTypes.adGroup(channel);
            canonicalInputs.push({
              recordType,
              action: "cutBid",
              campaignName,
              campaignId,
              adGroupName,
              adGroupId,
              currentBid: bid,
              cutBidPercent: pct,
            });
          } else if (campaignId && bid > 0) {
            const recordType = recordTypes.campaign(channel);
            canonicalInputs.push({
              recordType,
              action: "cutBid",
              campaignName,
              campaignId,
              currentBid: bid,
              cutBidPercent: pct,
            });
          } else {
            canonicalInputs.push({
              recordType,
              action: "pause",
              campaignName,
              campaignId,
              currentBid: bid,
              cutBidPercent: pct,
            });
            validation.warnings.push(`Row ${r}: No bid found for Cut Bid — converted to Pause.`);
            summary.pausedCount++;
          }
        } else {
          // REFINED TEXT EXTRACTION - Same priority as pause/negative
          let text = "";

          // Priority 1: Product Targeting Expression column
          if (
            productTargeting &&
            productTargeting.length > 0 &&
            productTargeting.toLowerCase() !== "product targeting"
          ) {
            text = productTargeting;
          }
          // Priority 2: Keyword Text column
          else if (keywordTextRaw && keywordTextRaw.length > 0 && keywordTextRaw.toLowerCase() !== "keyword") {
            text = keywordTextRaw;
          }
          // Priority 3: Entity column (if not generic)
          else if (
            entity &&
            entity.length > 0 &&
            entity.toLowerCase() !== "product targeting" &&
            entity.toLowerCase() !== "keyword"
          ) {
            text = entity;
          }
          // Priority 4: Row scanning fallback
          else {
            const asinCell = row.find(
              (cell: any) =>
                String(cell || "")
                  .toLowerCase()
                  .startsWith("asin=") ||
                String(cell || "")
                  .toLowerCase()
                  .startsWith("category="),
            );
            if (asinCell) text = String(asinCell);
          }

          const isPAT = isASIN(text) || isProductTargetingRecord(recordTypes.keyword(channel));
          const recordType = isPAT ? recordTypes.productTargeting(channel) : recordTypes.keyword(channel);

          if (bid > 0) {
            canonicalInputs.push({
              recordType,
              action: "cutBid",
              campaignName,
              campaignId,
              adGroupName,
              adGroupId,
              keywordText: isPAT ? undefined : text,
              targetingText: isPAT ? text : undefined,
              matchType,
              currentBid: bid,
              cutBidPercent: pct,
              keywordId,
              productTargetingId,
              targetingId,
            } as any);
          } else {
            canonicalInputs.push({
              recordType,
              action: "pause",
              campaignName,
              campaignId,
              adGroupName,
              adGroupId,
              keywordText: isPAT ? undefined : text,
              targetingText: isPAT ? text : undefined,
              matchType,
              currentBid: bid,
              cutBidPercent: pct,
              keywordId,
              productTargetingId,
              targetingId,
            } as any);
            validation.warnings.push(`Row ${r}: No bid found for Cut Bid — converted to Pause.`);
            summary.pausedCount++;
          }
        }
        summary.bidsCutCount++;
      } else if (normalizedDecision === "keep") {
        summary.keptCount++;
      }
    }
  }

  // ---------- BUILD OUTPUT WORKBOOK (MULTI-TAB BY PRODUCT TYPE) ----------
  const outputWorkbook = new ExcelJS.Workbook();
  const builtRows = buildBulkRowsFromCanonical(canonicalInputs);

  if (!actionableRows) {
    validation.warnings.push("No actionable rows found. Please fill in the Decision column.");
    outputWorkbook.addWorksheet("Warning");
  } else if (!builtRows.length) {
    validation.warnings.push("Decisions processed but no Amazon Bulk rows constructed.");
    outputWorkbook.addWorksheet("No Bulk Actions");
  } else {
    // Group rows by Product type (SP, SB, SD)
    const groupedRows = groupRowsByProduct(builtRows);

    // Create a separate tab for each product type that has rows
    const productTypes: AmazonProduct[] = ["Sponsored Products", "Sponsored Brands", "Sponsored Display"];
    let tabsCreated = 0;

    for (const product of productTypes) {
      const productRows = groupedRows[product];
      if (productRows.length === 0) continue;

      // Use Amazon-required exact tab names
      const tabName = AMAZON_TAB_NAMES[product];
      const sheet = outputWorkbook.addWorksheet(tabName);
      sheet.addRow(BULK_UPDATE_HEADERS);
      productRows.forEach((row) => sheet.addRow(bulkRowToArray(row)));
      tabsCreated++;
    }

    if (tabsCreated === 0) {
      validation.warnings.push("Decisions processed but no Amazon Bulk rows constructed.");
      outputWorkbook.addWorksheet("No Bulk Actions");
    }
  }

  if (typosCorrected > 0)
    autoRepairs.push({
      type: "decision_normalization",
      count: typosCorrected,
      details: `Auto-corrected ${typosCorrected} decision typos`,
    });
  if (missingBidCount > 0)
    autoRepairs.push({
      type: "missing_bid",
      count: missingBidCount,
      details: `${missingBidCount} rows lacked bid data`,
    });
  if (targetingRepairs > 0)
    autoRepairs.push({
      type: "targeting_repair",
      count: targetingRepairs,
      details: `Repaired ${targetingRepairs} rows by finding ASINs in row data`,
    });

  const trackLabel =
    trackType === "SBSD"
      ? "SBSD"
      : trackType === "SP"
        ? "SP_SearchTerms"
        : trackType === "SP_KEYWORDS"
          ? "SP_Keywords"
          : "ACOS100";
  const dateStr = getPacificDateString();
  const fileName = `Bleeders2_${trackLabel}_BulkUpdate_${dateStr}_PT.xlsx`;

  return {
    trackType,
    workbook: outputWorkbook,
    fileName,
    summary,
    validation,
    autoRepairs,
  };
};
