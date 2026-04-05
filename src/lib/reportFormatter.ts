import ExcelJS from "exceljs";
import { getOperatorSheetInstructions, ModuleType } from "./moduleConfig";

/** * CRITICAL FIX: The ultimate sanitation step for XLSX integrity.
 * This ensures all strings starting with formula/command characters are escaped
 * with a leading single quote ('), guaranteeing Excel treats the content as text.
 */
export const xlSafe = (v: any): string | number => {
  if (v === undefined || v === null || Number.isNaN(v)) return "";
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  let s = String(v);

  // 1. Convert newlines to spaces
  s = s.replace(/\r?\n/g, " ");

  // 2. Remove all non-XML-valid control characters (The 'nuclear' sanitation step)
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, "");

  // 3. CRITICAL: Security/Command stripping.
  const leadingCharsToEscape = ["=", "+", "-", "@", "|"]; // Adding '|' for completeness in bulk file context.

  s = s.trim(); // Trim first to check the actual start of the content

  if (s.length > 0 && leadingCharsToEscape.includes(s[0])) {
    // **THE FIX:** Prefix the string with a single quote (').
    // This forces the cell to be interpreted as Text, resolving the XML corruption.
    s = "'" + s;
  }

  // A leading single quote from the original data that wasn't escaped
  // by the above logic (e.g., if preceded by a space) will be handled
  // by this new robust escaping when it is written to the cell.

  return s; // No final trim here, as the leading "'" is essential.
};
/** ========== Colors & Styles ========== */
const LIGHT_BLUE = "FFDBECFF";
const HEADER_GRAY = "FFD9D9D9";

/** ========== Section Types ========== */
export type OperatorSection =
  | "SP Search Term"
  | "SP Targeting"
  | "SB Search Term"
  | "SB Keyword"
  | "SD Targeting"
  | "Campaign ACOS"; // 🔥 ADDED CAMPAIGN ACOS

/** Sheet tab names (bottom tabs) */
const SECTION_DISPLAY_NAME: Record<OperatorSection, string> = {
  "SP Search Term": "Sponsored Products • Search Term",
  "SP Targeting": "Sponsored Products • Targeting",
  "SB Search Term": "Sponsored Brands • Search Term",
  "SB Keyword": "Sponsored Brands • Keywords",
  "SD Targeting": "Sponsored Display • Targeting",
  "Campaign ACOS": "Campaign • High ACOS", // 🔥 ADDED
};

/** Title row text (row 1) */
const SECTION_TITLE: Record<OperatorSection, string> = {
  "SP Search Term": "Sponsored Products — Search Term",
  "SP Targeting": "Sponsored Products — Targeting",
  "SB Search Term": "Sponsored Brands — Search Term",
  "SB Keyword": "Sponsored Brands — Keywords",
  "SD Targeting": "Sponsored Display — Targeting",
  "Campaign ACOS": "Campaigns — High ACOS", // 🔥 ADDED
};

/** ========== Helpers ========== */

/** pick first non-empty value from possible field names */
const v = (row: any, names: string[], fallback: any = "") => {
  for (const n of names) {
    const val = row?.[n];
    if (val !== undefined && val !== null && String(val).trim() !== "") return val;
  }
  return fallback;
};

/** number coercion with $,% and thousands support */
const n = (x: any): number => {
  if (x === null || x === undefined || x === "") return 0;
  let s = String(x).trim();
  s = s.replace(/[$,]/g, "");
  if (/%$/.test(s)) {
    // "12.3%" -> 0.123
    const f = parseFloat(s.replace("%", ""));
    return isNaN(f) ? 0 : f / 100;
  }
  const f = parseFloat(s);
  return isNaN(f) ? 0 : f;
};

/** draw the bold title row with a thick bottom border */
const addTitledHeaderRow = (ws: ExcelJS.Worksheet, title: string) => {
  const r = ws.addRow([title]);
  r.font = { bold: true };
  r.eachCell((c) => (c.border = { bottom: { style: "thick" } }));
};

/** Decide which operator section a row belongs to */
export function classifySection(row: any): OperatorSection | null {
  const s = String(row.sheet || "").toLowerCase();
  // 🔥 Normalize entity to lowercase for consistent checking
  const entityLower = String(row.entityType || row.entity || "").toLowerCase();

  // 1. Campaign Level Checks (ACoS > 100%)
  if (s.includes("campaigns > 100") || (entityLower.includes("campaign") && !s.includes("search term"))) {
    return "Campaign ACOS";
  }

  // 2. Search Term Reports (SP & SB)
  // These are always specific and don't need entity filtering because the sheet itself is the filter
  if (s.includes("sp search term")) return "SP Search Term";
  if (s.includes("sb search term")) return "SB Search Term";

  // 3. Sponsored Products Targeting
  // We want Keywords AND Product Targeting (ASINs/Categories)
  if (s.includes("sponsored products campaigns")) {
    return "SP Targeting";
  }

  // 4. Sponsored Brands Targeting (THE FIX)
  // Previously: Only allowed "keyword".
  // Now: Allows "keyword", "product targeting", and generic "targeting"
  if (s.includes("sponsored brands campaigns")) {
    const isKeyword = entityLower.includes("keyword");
    const isTargeting = entityLower.includes("product targeting") || entityLower.includes("targeting");

    // We map both to "SB Keyword" section because the columns (Campaign, Targeting, Match Type) work for both.
    return isKeyword || isTargeting ? "SB Keyword" : null;
  }

  // 5. Sponsored Display Targeting
  // SD is almost exclusively "Product Targeting" or "Audience", so we accept both.
  // We strictly filter out "Campaign" or "Ad Group" rows just in case they slipped through.
  if (s.includes("sponsored display campaigns")) {
    const isAdGroup = entityLower.includes("ad group");
    const isCampaign = entityLower === "campaign"; // exact match to avoid excluding "Campaign ACOS" logic above

    if (!isAdGroup && !isCampaign) {
      return "SD Targeting";
    }
  }

  return null;
}

/** SOP-accurate headers per section.
 *  Note: “Decision” is injected later at a specific position per section. */
export function getHeadersForSection(section: OperatorSection): string[] {
  switch (section) {
    case "SP Search Term":
      return [
        "Campaign Name",
        "Ad Group Name",
        "Entity",
        "Targeting",
        "Match Type",
        "Customer Search Term", // Decision before this
        "Impressions",
        "Clicks",
        "Click-Thru Rate (CTR)",
        "Cost Per Click (CPC)",
        "Spend",
        "7 Day Total Sales",
        "Total Advertising Cost of Sales (ACOS)",
        "Total Return on Advertising Spend (ROAS)",
        "7 Day Total Orders (#)",
        "Product link",
      ];

    case "SP Targeting":
      return [
        "Campaign Name",
        "Ad Group Name",
        "Entity",
        "Targeting",
        "Match Type",
        "Clicks", // Decision before this
        "Click-Thru Rate (CTR)",
        "Cost Per Click (CPC)",
        "Spend",
        "7 Day Total Sales",
        "Total Advertising Cost of Sales (ACOS)",
        "Orders",
      ];

    case "SB Search Term":
      return [
        "Campaign Name",
        "Ad Group Name",
        "Entity",
        "Targeting",
        "Match Type",
        "Customer Search Term", // Decision before this
        "Clicks",
        "Click-Thru Rate (CTR)",
        "Cost Per Click (CPC)",
        "Spend",
        "14 Day Total Sales",
        "ACOS",
        "Orders",
      ];

    case "SB Keyword":
      return [
        "Campaign Name", // no Ad Group column per your template
        "Entity",
        "Targeting",
        "Match Type",
        "Clicks", // Decision before this
        "Cost Per Click (CPC)",
        "Spend",
        "14 Day Total Sales",
        "ACOS",
        "Orders",
      ];

    case "SD Targeting":
      return [
        "Campaign Name",
        "Ad Group Name",
        "Entity",
        "Targeting", // no Match Type / no CTR for SD Targeting
        "Clicks", // Decision after this (before Spend)
        "Spend",
        "Cost Per Click (CPC)",
        "14 Day Total Sales",
        "ACOS",
        "Orders",
      ];
    case "Campaign ACOS": // 🔥 ADDED
      return [
        "Source", // SB / SD / SP
        "Campaign Name",
        "Ad Group Name",
        "Entity",
        "Spend", // Decision before this
        "Total Sales",
        "ACOS",
        "CPA / CPC",
        "Status", // Current Campaign Status
      ];
  }
}

/** Insert “Decision” column before/after a given anchor label (1-based index returned). */
export function insertDecisionCol(
  headers: string[],
  opts: { before?: string; after?: string },
): { final: string[]; decisionColIndex1: number } {
  const final = headers.slice();
  let insertAt = 0;

  if (opts.before) {
    const idx = final.indexOf(opts.before);
    insertAt = Math.max(0, idx);
  } else if (opts.after) {
    const idx = final.indexOf(opts.after);
    insertAt = idx === -1 ? final.length : idx + 1;
  }

  final.splice(insertAt, 0, "Decision");
  return { final, decisionColIndex1: insertAt + 1 }; // ExcelJS 1-based
}

/** Required ID columns (appended at end per Amazon Bulk 2.0 compliance) */
const REQUIRED_ID_HEADERS = ["Campaign Id", "Ad Group Id", "Keyword Id", "Product Targeting Id", "Targeting Id"];

/** ID column aliases for robust extraction */
const ID_ALIASES = {
  "Campaign Id": ["campaignId", "Campaign Id", "Campaign ID", "CampaignId", "campaignIdinformationalonly"],
  "Ad Group Id": ["adGroupId", "Ad Group Id", "Ad Group ID", "AdGroupId", "adgroupIdinformationalonly"],
  "Keyword Id": ["keywordId", "Keyword Id", "Keyword ID", "KeywordId"],
  "Product Targeting Id": ["productTargetingId", "Product Targeting Id", "Product Targeting ID", "ProductTargetingId"],
  "Targeting Id": ["targetingId", "Targeting Id", "Targeting ID", "TargetingId"],
};

/** Append ID columns to far right, preserving existing values */
function appendIdColumnsFarRight(headers: string[], rows: any[][]): { headers: string[]; rows: any[][] } {
  // This function is not used in the final builder, but keeping it for completeness
  const getIdx = (h: string) => headers.findIndex((x) => x.toLowerCase() === h.toLowerCase()); // Extract existing ID values and remove ID columns from current positions

  const idValues: Record<string, any[]> = {};
  for (const idH of REQUIRED_ID_HEADERS) {
    const idx = getIdx(idH);
    if (idx !== -1) {
      idValues[idH] = rows.map((r) => r[idx] || "");
      headers.splice(idx, 1);
      rows.forEach((r) => r.splice(idx, 1));
    } else {
      idValues[idH] = rows.map(() => "");
    }
  } // Append ID headers at end

  headers.push(...REQUIRED_ID_HEADERS); // Append ID values to each row

  rows.forEach((r, i) => {
    r.push(...REQUIRED_ID_HEADERS.map((idH) => idValues[idH][i]));
  });

  return { headers, rows };
}

/** Improved ID extraction with comprehensive aliasing */
const findAliased = (obj: any, canonical: string, aliases: string[]): string => {
  for (const alias of [canonical, ...aliases]) {
    const exactKey = Object.keys(obj).find((k) => k === alias);
    if (exactKey && obj[exactKey] != null && String(obj[exactKey]).trim() !== "") {
      return String(obj[exactKey]).trim();
    }
    const lowerAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    const lowerKey = Object.keys(obj).find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === lowerAlias);
    if (lowerKey && obj[lowerKey] != null && String(obj[lowerKey]).trim() !== "") {
      return String(obj[lowerKey]).trim();
    }
  }
  return "";
};

/** Push a row according to section layout, using robust field aliases, with ID columns appended */
// Full replacement for pushRowForSection function
export function pushRowForSection(
  section: OperatorSection,
  ws: ExcelJS.Worksheet,
  row: any,
  decisionIdx1: number,
  sourceRow?: any,
) {
  // Resolve common fields
  const campaign = v(row, [
    "campaign",
    "campaignName",
    "campaign_name",
    "Campaign",
    "Campaign Name",
    "Campaign Name (Informational only)",
  ]);

  const adGroup = v(row, [
    "ad_group",
    "adGroup",
    "ad_group_name",
    "adGroupName",
    "Ad Group",
    "Ad Group Name",
    "Ad Group Name (Informational only)",
  ]);

  const entity = v(row, ["entity", "Entity", "entityType", "recordType"], "Keyword");

  const targeting = v(row, [
    "keyword_text",
    "product_targeting",
    "targeting",
    "entity",
    "Keyword Text",
    "Product targeting expression",
  ]);
  const matchType = v(row, ["match_type", "Match Type"]);
  const searchTerm = v(row, ["customer_search_term", "search_term", "Customer Search Term"]);

  const source = v(row, ["source", "Source"]); // Metrics
  const clicks = n(v(row, ["clicks", "Clicks"]));
  const impressions = n(v(row, ["impressions", "Impressions"]));
  const spend = n(v(row, ["spend", "Spend"]));
  let cpc = n(v(row, ["cpc", "CPC", "Cost Per Click (CPC)"]));
  if (!cpc && clicks > 0) cpc = spend / clicks; // Sales: SP uses 7-day; SB/SD use 14-day
  const sales7 = n(v(row, ["sales7", "7 Day Total Sales", "7 day total sales", "sales"]));
  const sales14 = n(v(row, ["sales14", "14 Day Total Sales", "14 day total sales", "sales (views & clicks)", "sales"]));
  const totalSales = sales7 > 0 ? sales7 : sales14; // 🔥 FIX: ACOS is already the final, correct ratio number from mapBleeder2RowsToReportFormat.
  // We just extract it using 'v' (which uses array lookup if the key is correct).
  const acosNum = n(v(row, ["acos", "ACOS", "Total Advertising Cost of Sales (ACOS)"])); // Note: 'n' still parses strings if they slipped through, but since it's a number from the upstream function,
  // it just returns the number (e.g., 2.8631). NO DANGEROUS DIVISION HERE.
  const roas = n(v(row, ["roas", "ROAS", "Total Return on Advertising Spend (ROAS)"]));
  const orders7 = n(v(row, ["orders7", "7 Day Total Orders (#)", "7 day total orders (#)", "orders"]));
  const orders14 = n(v(row, ["orders14", "14 Day Total Orders (#)", "14 day total orders (#)", "orders"])); // Campaign ACOS specific fields
  const status = v(row, ["state", "status", "State"]);
  const cpa = n(v(row, ["cpa", "CPA", "Cost Per Acquisition"]));
  const bid = n(v(row, ["bid", "maxbid", "Bid"]));

  let data: any[] = [];

  switch (section) {
    case "SP Search Term": {
      data = [
        xlSafe(campaign),
        xlSafe(adGroup),
        xlSafe(entity),
        xlSafe(targeting),
        xlSafe(matchType),
        xlSafe(searchTerm),
        xlSafe(impressions),
        xlSafe(clicks),
        xlSafe(v(row, ["ctr", "CTR", "Click-Thru Rate (CTR)"]) || ""),
        xlSafe(cpc || ""),
        xlSafe(spend),
        xlSafe(sales7),
        xlSafe(acosNum), // formatted as %
        xlSafe(roas || ""),
        xlSafe(orders7),
        xlSafe(""), // Product link
      ];
      break;
    }
    case "SP Targeting": {
      data = [
        xlSafe(campaign),
        xlSafe(adGroup),
        xlSafe(entity),
        xlSafe(targeting),
        xlSafe(matchType),
        xlSafe(clicks),
        xlSafe(v(row, ["ctr", "CTR", "Click-Thru Rate (CTR)"]) || ""),
        xlSafe(cpc || ""),
        xlSafe(spend),
        xlSafe(sales7),
        xlSafe(acosNum),
        xlSafe(orders7),
      ];
      break;
    }
    case "SB Search Term": {
      data = [
        xlSafe(campaign),
        xlSafe(adGroup),
        xlSafe(entity),
        xlSafe(targeting),
        xlSafe(matchType),
        xlSafe(searchTerm),
        xlSafe(clicks),
        xlSafe(v(row, ["ctr", "CTR", "Click-Thru Rate (CTR)"]) || ""),
        xlSafe(cpc || ""),
        xlSafe(spend),
        xlSafe(sales14),
        xlSafe(acosNum),
        xlSafe(orders14),
      ];
      break;
    }
    case "SB Keyword": {
      data = [
        xlSafe(campaign),
        xlSafe(entity),
        xlSafe(targeting),
        xlSafe(matchType),
        xlSafe(clicks),
        xlSafe(cpc || ""),
        xlSafe(spend),
        xlSafe(sales14),
        xlSafe(acosNum),
        xlSafe(orders14),
      ];
      break;
    }
    case "SD Targeting": {
      data = [
        xlSafe(campaign),
        xlSafe(adGroup),
        xlSafe(entity),
        xlSafe(targeting),
        xlSafe(clicks),
        xlSafe(spend),
        xlSafe(cpc || ""),
        xlSafe(sales14),
        xlSafe(acosNum),
        xlSafe(orders14),
      ];
      break;
    }
    case "Campaign ACOS": {
      // 🔥 ADDED
      data = [
        xlSafe(source),
        xlSafe(campaign),
        xlSafe(adGroup),
        xlSafe(entity),
        xlSafe(spend),
        xlSafe(totalSales),
        xlSafe(acosNum),
        xlSafe(bid > 0 ? bid : cpa || cpc || ""),
        xlSafe(status),
      ];
      break;
    }
  } // Insert the "Decision" blank cell at the correct column
  data.splice(decisionIdx1 - 1, 0, xlSafe("")); // Append ID columns at end (extract from sourceRow if provided)

  const campaignId = xlSafe(findAliased(sourceRow || {}, "Campaign Id", ID_ALIASES["Campaign Id"]));
  const adGroupId = xlSafe(findAliased(sourceRow || {}, "Ad Group Id", ID_ALIASES["Ad Group Id"]));
  const keywordId = xlSafe(findAliased(sourceRow || {}, "Keyword Id", ID_ALIASES["Keyword Id"]));
  const productTargetingId = xlSafe(
    findAliased(sourceRow || {}, "Product Targeting Id", ID_ALIASES["Product Targeting Id"]),
  );
  const targetingId = xlSafe(findAliased(sourceRow || {}, "Targeting Id", ID_ALIASES["Targeting Id"]));

  data.push(campaignId, adGroupId, keywordId, productTargetingId, targetingId);

  const r = ws.addRow(data);
  r.getCell(decisionIdx1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
}

/** ========== Main builder ========== */
export async function generateOperatorWorkbook_A(
  allRows: any[],
  mode: "standard" | "lifetime" = "standard",
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook(); // Track missing IDs for warnings

  let missingKeywordIds = 0;
  let missingTargetingIds = 0;
  let missingCampaignIds = 0; // 🔥 ADDED
  const missingIdSamples: string[] = []; // Add instructions sheet first

  const moduleType: ModuleType = mode === "lifetime" ? "BLEEDING_LIFETIME" : "BLEEDERS_1";
  const instructionsSheet = wb.addWorksheet("INSTRUCTIONS — READ FIRST");
  const instructions = getOperatorSheetInstructions(moduleType); // Add instructions as wrapped text

  const instructionsLines = instructions.split("\n");
  instructionsLines.forEach((line, index) => {
    const row = instructionsSheet.addRow([xlSafe(line)]);
    if (line.includes("Module:") || line.includes("Valid Actions:") || line.includes("Instructions:")) {
      row.font = { bold: true, size: 12 };
    }
    row.alignment = { wrapText: true, vertical: "top" };
  }); // Format instructions sheet

  instructionsSheet.getColumn(1).width = 100;

  const buckets: Record<OperatorSection, any[]> = {
    "SP Search Term": [],
    "SP Targeting": [],
    "SB Search Term": [],
    "SB Keyword": [],
    "SD Targeting": [],
    "Campaign ACOS": [], // 🔥 ADDED
  };

  for (const r of allRows) {
    const sec = classifySection(r);
    if (sec) buckets[sec].push(r);
  }

  for (const section of Object.keys(buckets) as OperatorSection[]) {
    const rows = buckets[section];
    if (!rows.length) continue;

    const sheetName = mode === "lifetime" ? `Bleeding Lifetime Targets` : SECTION_DISPLAY_NAME[section];

    const cleanSheetName = String(sheetName)
      .replace(/[\u0000-\u001F]/g, "") // Ensure no control codes sneak in here
      .substring(0, 31)
      .trim();
    const ws = wb.addWorksheet(cleanSheetName, {
      properties: {
        defaultColWidth: 10,
        showGridLines: true,
      },
      views: [{ state: "frozen", xSplit: 0, ySplit: 2 }],
    });

    const titleText =
      mode === "lifetime" ? `Lifetime Bleeding Targets — ${SECTION_TITLE[section]}` : SECTION_TITLE[section];
    addTitledHeaderRow(ws, titleText); // Build headers & place Decision appropriately per section

    const base = getHeadersForSection(section);

    let insertRule: { before?: string; after?: string };
    if (section === "SP Search Term" || section === "SB Search Term") {
      insertRule = { before: "Customer Search Term" };
    } else if (section === "SP Targeting" || section === "SB Keyword") {
      insertRule = { before: "Clicks" };
    } else if (section === "Campaign ACOS") {
      // 🔥 ADDED
      insertRule = { before: "Spend" };
    } else {
      // SD Targeting — Decision after Clicks (i.e., before Spend)
      insertRule = { after: "Clicks" };
    }

    const { final: headersWithDecision, decisionColIndex1 } = insertDecisionCol(base, insertRule); // Append ID columns at far right

    const headers = [...headersWithDecision, ...REQUIRED_ID_HEADERS];

    const headerRow = ws.addRow(headers.map((h) => xlSafe(h)));
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
    }); // Data rows (pass source row for ID extraction)

    for (const r of rows) {
      pushRowForSection(section, ws, r, decisionColIndex1, r); // Track missing IDs

      const campaignId = findAliased(r, "Campaign Id", ID_ALIASES["Campaign Id"]);
      const entityLower = String(r.entityType || "").toLowerCase();

      if (
        (entityLower.includes("keyword") || entityLower.includes("targeting") || entityLower.includes("searchterm")) &&
        !campaignId
      ) {
        missingCampaignIds++;
        if (missingIdSamples.length < 5) {
          missingIdSamples.push(`Campaign ID: ${r.campaign || r.campaignName}`);
        }
      }
      if (entityLower.includes("keyword") && !findAliased(r, "Keyword Id", ID_ALIASES["Keyword Id"])) {
        missingKeywordIds++;
        if (missingIdSamples.length < 5) {
          missingIdSamples.push(`Keyword ID: ${r.campaign || r.campaignName} / ${r.keyword_text || r.entity}`);
        }
      }
      if (
        entityLower.includes("targeting") &&
        !findAliased(r, "Targeting Id", ID_ALIASES["Targeting Id"]) &&
        !findAliased(r, "Product Targeting Id", ID_ALIASES["Product Targeting Id"])
      ) {
        missingTargetingIds++;
        if (missingIdSamples.length < 5) {
          missingIdSamples.push(`Targeting ID: ${r.campaign || r.campaignName} / ${r.product_targeting || r.entity}`);
        }
      }
    } // Number formats

    const clicksIdx = headers.indexOf("Clicks") + 1;
    const impressionsIdx = headers.indexOf("Impressions") + 1;
    const spendIdx = headers.indexOf("Spend") + 1;
    const sales7Idx = headers.indexOf("7 Day Total Sales") + 1;
    const sales14Idx = headers.indexOf("14 Day Total Sales") + 1;
    const totalSalesIdx = headers.indexOf("Total Sales") + 1; // 🔥 ADDED
    const acosIdx = headers.indexOf("Total Advertising Cost of Sales (ACOS)") + 1 || headers.indexOf("ACOS") + 1;
    const cpcIdx = headers.indexOf("Cost Per Click (CPC)") + 1;
    const cpaCpcIdx = headers.indexOf("CPA / CPC") + 1; // 🔥 ADDED

    ws.eachRow((row, i) => {
      if (i <= 2) return;
      if (clicksIdx > 0) row.getCell(clicksIdx).numFmt = "#,##0";
      if (impressionsIdx > 0) row.getCell(impressionsIdx).numFmt = "#,##0";
      if (spendIdx > 0) row.getCell(spendIdx).numFmt = "$#,##0.00";
      if (sales7Idx > 0) row.getCell(sales7Idx).numFmt = "$#,##0.00";
      if (sales14Idx > 0) row.getCell(sales14Idx).numFmt = "$#,##0.00";
      if (totalSalesIdx > 0) row.getCell(totalSalesIdx).numFmt = "$#,##0.00"; // 🔥 ADDED
      if (acosIdx > 0) row.getCell(acosIdx).numFmt = "0.00%";
      if (cpcIdx > 0) row.getCell(cpcIdx).numFmt = "$#,##0.00";
      if (cpaCpcIdx > 0) row.getCell(cpaCpcIdx).numFmt = "$#,##0.00"; // 🔥 ADDED
    }); // Color the entire Decision column blue (header + lots of empty rows)

    for (let r = 1; r <= 1000; r++) {
      ws.getCell(r, decisionColIndex1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
    }
    ws.getCell(2, decisionColIndex1).font = { bold: true }; // header bold
    // Widths & freeze

    ws.columns.forEach((col) => {
      let max = 12;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = (cell.value?.toString() || "").length;
        if (len > max) max = len;
      });
      col.width = Math.min(Math.max(max + 2, 12), 42);
    });
  } // Log warnings for missing IDs

  if (missingKeywordIds + missingTargetingIds + missingCampaignIds > 0) {
    console.warn(
      `[OPERATOR TEMPLATE] Missing IDs from source export: ${missingCampaignIds} Campaign Id(s), ${missingKeywordIds} keyword row(s) missing Keyword Id, ${missingTargetingIds} targeting row(s) missing Targeting Id. Amazon UPDATE operations will fail for these rows unless IDs are provided.`,
    );
    if (missingIdSamples.length) {
      console.warn("[OPERATOR TEMPLATE] Sample rows with missing IDs:", missingIdSamples);
    }
  }

  return wb;
}
