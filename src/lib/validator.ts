import * as XLSX from 'xlsx';
import { sanitizeHeader, parseNumeric, findColumnValue } from './bleederAnalyzer';

interface ValidationResult {
  status: 'pass' | 'warning' | 'error';
  message: string;
}

interface RowError {
  sheet: string;
  row: number;
  issue: string;
}

export interface ValidationReport {
  requiredColumns: ValidationResult;
  negativeKeywords: ValidationResult;
  negativeProductTargeting: ValidationResult;
  pausedKeywords: ValidationResult;
  spendCheck: ValidationResult;
  entityCheck: ValidationResult;
  emptySheetCheck: ValidationResult;
  rowErrors: RowError[];
  passed: boolean;
  debugOutput?: {
    missingColumns: string;
    negativeKeywordIssues: string;
    negativeProductIssues: string;
    pausedKeywordIssues: string;
    spend: string;
    blankEntities: string;
    rowErrors: RowError[];
  };
}

// Header alias map for column detection
const COLUMN_ALIASES: Record<string, string[]> = {
  'product': ['product'],
  'entity': ['entity'],
  'operation': ['operation'],
  'campaign id': ['campaign id', 'campaignid'],
  'ad group id': ['ad group id', 'adgroup id', 'ad groupid'],
  'ad id': ['ad id', 'adid'],
  'keyword id': ['keyword id', 'keywordid'],
  'product targeting id': ['product targeting id', 'producttargetingid'],
  'targeting id': ['targeting id', 'targetingid'],
  'state': ['state', 'status'],
  'keyword text': ['keyword text', 'keyword', 'target', 'term'],
  'match type': ['match type', 'match'],
  'product targeting expression': ['product targeting expression', 'pte', 'product target'],
  'spend': ['spend', 'cost']
};

const normalizeHeaderForValidation = (header: string): string => {
  const normalized = header.toLowerCase()
    .replace(/[_\-\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(alias => normalized === alias.toLowerCase())) {
      return canonical;
    }
  }
  
  return normalized;
};

const findColumnByAliases = (headers: string[], aliases: string[]): number => {
  return headers.findIndex(h => {
    const normalized = normalizeHeaderForValidation(h);
    return aliases.some(alias => normalized === alias.toLowerCase());
  });
};

type SheetType = 
  | 'sp-campaigns' 
  | 'sb-campaigns' 
  | 'sd-campaigns' 
  | 'sp-search-terms' 
  | 'sb-search-terms';

const REQUIRED_COLUMNS: Record<SheetType, string[]> = {
  'sp-campaigns': [
    'product', 'entity', 'operation', 'campaign id', 'ad group id', 
    'ad id', 'keyword id', 'product targeting id', 'state', 'keyword text'
  ],
  'sp-search-terms': [
    'product', 'entity', 'operation', 'campaign id', 'ad group id', 
    'ad id', 'keyword id', 'product targeting id', 'state', 'keyword text'
  ],
  'sb-campaigns': [
    'product', 'entity', 'operation', 'campaign id', 'ad group id', 
    'keyword id', 'product targeting id', 'keyword text', 'match type', 
    'product targeting expression'
  ],
  'sb-search-terms': [
    'product', 'entity', 'operation', 'campaign id', 'ad group id', 
    'keyword id', 'product targeting id', 'keyword text', 'match type', 
    'product targeting expression'
  ],
  'sd-campaigns': [
    'product', 'entity', 'operation', 'campaign id', 'ad group id', 
    'ad id', 'targeting id'
  ]
};

const matchSheetType = (sheetName: string): SheetType | null => {
  const n = sheetName.toLowerCase();

  // Sponsored Products Campaigns
  if (
    n.includes("sponsored products campaigns") ||
    n.includes("sp campaigns") ||
    n === "sponsored products"
  ) return "sp-campaigns";

  // Sponsored Brands Campaigns (Single + Multi-Ad-Group layouts)
  if (
    n.includes("sponsored brands campaigns") ||
    n.includes("sb campaigns") ||
    n.includes("sb multi ad group campaigns")
  ) return "sb-campaigns";

  // Sponsored Display Campaigns
  if (
    n.includes("sponsored display campaigns") ||
    n.includes("sd campaigns")
  ) return "sd-campaigns";

  // Retail Ad Sponsored (Amazon sometimes labels legacy SB here)
  if (
    n.includes("ras campaigns")
  ) return "sb-campaigns"; // treat as SB

  // Search Term Reports
  if (
    n.includes("sp search term report") ||
    n.includes("sp search terms")
  ) return "sp-search-terms";

  if (
    n.includes("sb search term report") ||
    n.includes("sb search terms")
  ) return "sb-search-terms";

  if (
    n.includes("ras search term report")
  ) return "sb-search-terms"; // treat RAS search terms same as SB

  return null;
};

export const validateUploadFile = async (
  file: File,
  mode: 'raw' | 'decision' = 'raw'
): Promise<ValidationReport> => {
  // ---- helpers & aliases (local to this function to keep patch self-contained) ----
  const RAW_SHEET_HINTS = [
    /sponsored products campaigns?/i,
    /sponsoredproductscampaigns?/i,
    /sp campaigns?/i,
    /sp campaign report/i,
    /sponsored brands campaigns?/i,
    /sponsoredbrandscampaigns?/i,
    /sb campaigns?/i,
    /sponsored display campaigns?/i,
    /sponsoreddisplaycampaigns?/i,
    /sd campaigns?/i,
    /sp search term/i,
    /sb search term/i,
    /ras search term/i,
    /sb multi ad group/i,
    /campaign/i,
    /search term/i,
  ];

  const RAW_REQUIRED_ALIASES: Record<string, string[]> = {
    campaign: ['Campaign Name', 'Campaign', 'CampaignName'],
    // search-terms sheet
    search_term: ['Customer Search Term', 'Search Term', 'Customer Search Term (SP)', 'Customer Search Term (SB)'],
    // targeting/keywords on campaign sheets
    entity: ['Entity', 'Record Type', 'RecordType'],
    keyword: ['Keyword', 'Keyword Text', 'Keyword or Product Targeting', 'Targeting', 'Product Targeting Expression', 'Product Targeting'],

    // metrics
    clicks: ['Clicks', '7 Day Clicks', '14 Day Clicks'],
    spend: ['Spend', 'Cost', 'Advertising Spend', 'Total Spend'],
    sales: ['7 Day Total Sales', '14 Day Total Sales', 'Total Sales', 'Sales'],
    orders: ['7 Day Total Orders (#)', '14 Day Total Orders (#)', 'Total Orders', 'Orders'],
    decision: ['Decision'] // present only in operator sheets
  };

  const parseNumeric = (v: any) => {
    if (v == null) return 0;
    // Strip $, commas, %, and whitespace before converting
    const s = String(v).replace(/[$,%,\s]/g, '');
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };

  const normalizeHeader = (h: any) => String(h || '').trim();

  const findCol = (headers: string[], aliases: string[]) => {
    const idx = headers.findIndex(h => aliases.some(a => h.toLowerCase() === a.toLowerCase()));
    return idx; // -1 if not found
  };

  const sheetLooksRaw = (name: string) => RAW_SHEET_HINTS.some(r => r.test(name));
  const detectRawFile = (sheetNames: string[]) => sheetNames.some(sheetLooksRaw);

  // ---------------------------------------------------------------------------------
  const report: ValidationReport = {
    requiredColumns: { status: 'pass', message: '' },
    negativeKeywords: { status: 'pass', message: '' },
    negativeProductTargeting: { status: 'pass', message: '' },
    pausedKeywords: { status: 'pass', message: '' },
    spendCheck: { status: 'pass', message: '' },
    entityCheck: { status: 'pass', message: '' },
    emptySheetCheck: { status: 'pass', message: '' },
    rowErrors: [],
    passed: true
  };

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      report.passed = false;
      report.requiredColumns.status = 'error';
      report.requiredColumns.message = '❌ No sheets found in file. Please export again from Amazon Ads → Bulk Operations.';
      return report;
    }

    // ---------------------------------------------------------------------------------
    // RAW ANALYSIS MODE (minimal validation for raw bulk exports)
    // ---------------------------------------------------------------------------------
    if (mode === 'raw') {
      let anyData = false;
      let totalSpend = 0;
      const issues: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        if (!sheetLooksRaw(sheetName)) continue;

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
        if (rows.length < 2) continue; // no rows beyond headers
        anyData = true;

        const rawHeaders = rows[0].map(normalizeHeader);

        // common metrics
        const clicksIdx = findCol(rawHeaders, RAW_REQUIRED_ALIASES.clicks);
        const spendIdx  = findCol(rawHeaders, RAW_REQUIRED_ALIASES.spend);
        const salesIdx  = findCol(rawHeaders, RAW_REQUIRED_ALIASES.sales);
        const ordersIdx = findCol(rawHeaders, RAW_REQUIRED_ALIASES.orders);

        const hasPerformance = clicksIdx !== -1 && spendIdx !== -1 && (salesIdx !== -1 || ordersIdx !== -1);
        if (!hasPerformance) {
          const missing = [];
          if (clicksIdx === -1) missing.push('Clicks');
          if (spendIdx === -1)  missing.push('Spend');
          if (salesIdx === -1 && ordersIdx === -1) missing.push('Sales or Orders');
          issues.push(`• ${sheetName}: Missing ${missing.join(', ')}`);
          continue;
        }

        // track spend (for sanity message only)
        for (let r = 1; r < rows.length; r++) {
          totalSpend += parseNumeric(rows[r][spendIdx]);
        }

        // light shape checks per sheet type
        const lower = sheetName.toLowerCase();
        if (/search term/i.test(lower)) {
          const campaignIdx = findCol(rawHeaders, RAW_REQUIRED_ALIASES.campaign);
          const termIdx     = findCol(rawHeaders, RAW_REQUIRED_ALIASES.search_term);
          if (campaignIdx === -1 || termIdx === -1) {
            const miss = [];
            if (campaignIdx === -1) miss.push('Campaign Name');
            if (termIdx === -1)     miss.push('Customer Search Term');
            issues.push(`• ${sheetName}: Missing ${miss.join(', ')}`);
          }
        } else if (/campaign/i.test(lower)) {
          const campaignIdx = findCol(rawHeaders, RAW_REQUIRED_ALIASES.campaign);
          if (campaignIdx === -1) issues.push(`• ${sheetName}: Missing Campaign Name`);
          // we don’t require entity/keyword strictly here because Amazon sheets vary
        }
      }

      if (!anyData) {
        report.passed = false;
        report.emptySheetCheck.status = 'error';
        report.emptySheetCheck.message = '❌ All relevant sheets are empty. Upload the 60-day bulk operations export (SP/SB/SD + SP/SB Search Terms).';
        report.requiredColumns.status = 'error';
        report.requiredColumns.message = 'No data rows found.';
        return report;
      }

      if (issues.length > 0) {
        report.passed = false;
        report.requiredColumns.status = 'error';
        report.requiredColumns.message = [
          '❌ Raw bulk file detected, but some required columns are missing:',
          ...issues,
          'Fix: Re-export from Amazon Ads → Bulk Operations (60-day), then try again.'
        ].join('\n');
        report.spendCheck.status = 'warning';
        report.spendCheck.message = totalSpend > 0 ? `Total spend scanned: $${totalSpend.toFixed(2)}` : '⚠️ Total spend is zero in scanned sheets.';
        return report;
      }

      // success: raw file looks good — skip strict negative validation
      report.requiredColumns.message = '✅ Raw bulk file detected. Minimal checks passed. Proceeding to analysis.';
      report.spendCheck.message = totalSpend > 0 ? `✅ Total spend scanned: $${totalSpend.toFixed(2)}` : '⚠️ Total spend is zero.';
      report.negativeKeywords.message = '⏭️ Skipped (not applicable for raw analysis files).';
      report.negativeProductTargeting.message = '⏭️ Skipped (not applicable for raw analysis files).';
      report.pausedKeywords.message = '⏭️ Skipped (not applicable for raw analysis files).';
      report.emptySheetCheck.message = '✅ Sheets contain data';
      report.entityCheck.message = '⏭️ Entity checks not required for raw analysis files.';
      report.passed = true;
      return report;
    }

    // ---------------------------------------------------------------------------------
    // STRICT DECISION MODE (Operator re-upload / final upload prep)
    // ---------------------------------------------------------------------------------
    // Run full strict validation for decision files
    let totalSpend = 0;
    let hasContent = false;
    let blankEntityCount = 0;
    let negativeKeywordErrors = 0;
    let negativeProductErrors = 0;
    let pausedKeywordErrors = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
      if (data.length < 2) continue;

      hasContent = true;

      const rawHeaders = data[0].map(normalizeHeader);

      // Use existing REQUIRED_COLUMNS / COLUMN_ALIASES in your codebase:
      const sheetType = matchSheetType ? matchSheetType(sheetName) : null; // safe if helper exists
      if (sheetType && typeof REQUIRED_COLUMNS !== 'undefined' && typeof COLUMN_ALIASES !== 'undefined') {
        const requiredCols = REQUIRED_COLUMNS[sheetType] || [];
        const missingCols: string[] = [];

        requiredCols.forEach(col => {
          const aliases = COLUMN_ALIASES[col] || [col];
          const found = findCol(rawHeaders, aliases);
          if (found === -1) missingCols.push(col);
        });

        if (missingCols.length > 0) {
          report.requiredColumns.status = 'error';
          report.requiredColumns.message = `${sheetName}: Missing columns: ${missingCols.join(', ')}. Tip: ensure headers match export/template names exactly.`;
          report.passed = false;
        }
      }

      const entityIdx           = findColumnByAliases(rawHeaders, COLUMN_ALIASES?.['entity'] || ['entity']);
      const operationIdx        = findColumnByAliases(rawHeaders, COLUMN_ALIASES?.['operation'] || ['operation']);
      const stateIdx            = findColumnByAliases(rawHeaders, COLUMN_ALIASES?.['state'] || ['state']);
      const matchTypeIdx        = findColumnByAliases(rawHeaders, COLUMN_ALIASES?.['match type'] || ['match type']);
      const keywordTextIdx      = findColumnByAliases(rawHeaders, COLUMN_ALIASES?.['keyword text'] || ['keyword text']);
      const productTargetingIdx = findColumnByAliases(rawHeaders, COLUMN_ALIASES?.['product targeting expression'] || ['product targeting expression']);
      const spendIdx            = findColumnByAliases(rawHeaders, COLUMN_ALIASES?.['spend'] || ['spend']);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];

        if (spendIdx !== -1) totalSpend += parseNumeric(row[spendIdx]);

        const entity           = entityIdx           !== -1 ? String(row[entityIdx] ?? '').trim().toLowerCase() : '';
        const operation        = operationIdx        !== -1 ? String(row[operationIdx] ?? '').trim().toLowerCase() : '';
        const state            = stateIdx            !== -1 ? String(row[stateIdx] ?? '').trim().toLowerCase() : '';
        const matchType        = matchTypeIdx        !== -1 ? String(row[matchTypeIdx] ?? '').trim().toLowerCase() : '';
        const keywordText      = keywordTextIdx      !== -1 ? String(row[keywordTextIdx] ?? '').trim() : '';
        const productTargeting = productTargetingIdx !== -1 ? String(row[productTargetingIdx] ?? '').trim() : '';

        if (!entity) blankEntityCount++;

        // Use substring logic for entity classification to handle formats like:
        // 'Keyword', 'Keyword,Product Targeting', 'Keyword (Enhanced)', etc.
        const e = entity.toLowerCase();
        const isKeyword = e.includes('keyword') && !e.includes('negative');
        const isNegativeKeyword = e.includes('negative') && e.includes('keyword');
        const isProductTargeting = e.includes('targeting') || e.includes('product target');
        const isNegativeProductTargeting = e.includes('negative') && (e.includes('targeting') || e.includes('product target'));

        if (isNegativeKeyword) {
          let hasError = false;
          if (operation !== 'create') {
            report.rowErrors.push({ sheet: sheetName, row: i + 1, issue: 'Negative Keyword must have Operation=Create' });
            hasError = true;
          }
          if (state !== 'paused') {
            report.rowErrors.push({ sheet: sheetName, row: i + 1, issue: 'Negative Keyword must have State=Paused' });
            hasError = true;
          }
          if (matchType !== 'negative exact') {
            report.rowErrors.push({ sheet: sheetName, row: i + 1, issue: 'Negative Keyword must have Match Type=Negative Exact' });
            hasError = true;
          }
          if (!keywordText) {
            report.rowErrors.push({ sheet: sheetName, row: i + 1, issue: 'Negative Keyword must have Keyword Text filled' });
            hasError = true;
          }
          if (hasError) negativeKeywordErrors++;
        }

        if (isNegativeProductTargeting) {
          let hasError = false;
          if (operation !== 'create') {
            report.rowErrors.push({ sheet: sheetName, row: i + 1, issue: 'Negative Product Targeting must have Operation=Create' });
            hasError = true;
          }
          if (state !== 'paused') {
            report.rowErrors.push({ sheet: sheetName, row: i + 1, issue: 'Negative Product Targeting must have State=Paused' });
            hasError = true;
          }
          if (!productTargeting) {
            report.rowErrors.push({ sheet: sheetName, row: i + 1, issue: 'Negative Product Targeting must have Product Targeting Expression filled' });
            hasError = true;
          }
          if (hasError) negativeProductErrors++;
        }

        if (isKeyword && state === 'paused') {
          if (operation !== 'update') {
            report.rowErrors.push({ sheet: sheetName, row: i + 1, issue: 'Paused Keyword must have Operation=Update' });
            pausedKeywordErrors++;
          }
        }
      }
    }

    // strict mode summaries
    if (!hasContent) {
      report.emptySheetCheck.status = 'error';
      report.emptySheetCheck.message = '❌ No data rows detected. Make sure you uploaded the correct (operator) file.';
      report.passed = false;
    } else {
      report.emptySheetCheck.message = '✅ Sheets contain data';
    }

    if (negativeKeywordErrors > 0) {
      report.negativeKeywords.status = 'error';
      report.negativeKeywords.message = `${negativeKeywordErrors} Negative Keyword validation errors`;
      report.passed = false;
    } else {
      report.negativeKeywords.message = '✅ All Negative Keywords valid';
    }

    if (negativeProductErrors > 0) {
      report.negativeProductTargeting.status = 'error';
      report.negativeProductTargeting.message = `${negativeProductErrors} Negative Product Targeting validation errors`;
      report.passed = false;
    } else {
      report.negativeProductTargeting.message = '✅ All Negative Product Targeting valid';
    }

    if (pausedKeywordErrors > 0) {
      report.pausedKeywords.status = 'warning';
      report.pausedKeywords.message = `${pausedKeywordErrors} Paused Keyword warnings`;
    } else {
      report.pausedKeywords.message = '✅ All Paused Keywords valid';
    }

    if (totalSpend === 0 && hasContent) {
      report.spendCheck.status = 'warning';
      report.spendCheck.message = '⚠️ No bleeders detected — but campaign sheet(s) were read successfully. This most likely means there are no items with Clicks > 10 and Sales = 0 under the current filters. Try Adjust Thresholds or Verify Columns.';
    } else if (totalSpend === 0) {
      report.spendCheck.status = 'warning';
      report.spendCheck.message = '⚠️ Total spend is zero';
    } else {
      report.spendCheck.message = `✅ Total spend: $${totalSpend.toFixed(2)}`;
    }

    if (blankEntityCount > 0) {
      report.entityCheck.status = 'warning';
      report.entityCheck.message = `⚠️ ${blankEntityCount} rows with blank Entity field detected. These rows may not be actionable.`;
    } else {
      report.entityCheck.message = '✅ All entities filled';
    }

    // Add debug output for error cases
    if (!report.passed) {
      report.debugOutput = {
        missingColumns: report.requiredColumns.message,
        negativeKeywordIssues: report.negativeKeywords.message,
        negativeProductIssues: report.negativeProductTargeting.message,
        pausedKeywordIssues: report.pausedKeywords.message,
        spend: report.spendCheck.message,
        blankEntities: report.entityCheck.message,
        rowErrors: report.rowErrors
      };
    }

    return report;
  } catch (err: any) {
    report.passed = false;
    report.requiredColumns.status = 'error';
    report.requiredColumns.message = `❌ Could not read workbook: ${err?.message || String(err)}`;
    
    // Add debug output for exception cases
    report.debugOutput = {
      missingColumns: report.requiredColumns.message,
      negativeKeywordIssues: report.negativeKeywords.message,
      negativeProductIssues: report.negativeProductTargeting.message,
      pausedKeywordIssues: report.pausedKeywords.message,
      spend: report.spendCheck.message,
      blankEntities: report.entityCheck.message,
      rowErrors: report.rowErrors
    };
    
    return report;
  }
};

