/**
 * Module configuration defining valid decisions and help content per module
 */

export type ModuleType = 
  | 'BLEEDERS_1' 
  | 'BLEEDERS_2_SBSD' 
  | 'BLEEDERS_2_SP_KEYWORDS'
  | 'BLEEDERS_2_SP_SEARCH'
  | 'BLEEDERS_2_ACOS100'
  | 'BLEEDING_LIFETIME';

export interface ModuleDecisions {
  valid: string[];
  display: string[];
}

export interface ModuleHelp {
  title: string;
  description: string;
  requiredFile: string;
  decisions: string[];
  cadence: string;
  nextSteps: string[];
}

export const MODULE_DECISIONS: Record<ModuleType, ModuleDecisions> = {
  BLEEDERS_1: {
    valid: ['pause', 'negative', 'negative exact', 'reduce bid', 'cut bid', 'give it another week', 'keep'],
    display: ['Pause', 'Negative Exact']
  },
  BLEEDERS_2_SBSD: {
    valid: ['pause', 'reduce bid', 'cut bid', 'keep'],
    display: ['Pause', 'Reduce bid']
  },
  BLEEDERS_2_SP_KEYWORDS: {
    valid: ['pause', 'reduce bid', 'cut bid', 'keep'],
    display: ['Pause', 'Reduce bid']
  },
  BLEEDERS_2_SP_SEARCH: {
    valid: ['negative', 'negative exact', 'give it another week', 'keep'],
    display: ['Negative exact', 'Give it another week']
  },
  BLEEDERS_2_ACOS100: {
    valid: ['turn off campaign', 'turn off', 'pause', 'cut bid', 'reduce bid', 'keep'],
    display: ['Turn off campaign', 'Cut bid']
  },
  BLEEDING_LIFETIME: {
    valid: ['pause', 'reduce bid', 'cut bid', 'give it another week', 'keep'],
    display: ['Pause']
  }
};

export const MODULE_HELP: Record<ModuleType, ModuleHelp> = {
  BLEEDERS_1: {
    title: 'Bleeders 1.0 — Zero-Sale Wasted Spend (60-day)',
    description: 'Identifies targets with 10+ clicks and 0 sales in the last 60 days.',
    requiredFile: 'Amazon Sponsored Products Search Term or Targeting report (last 60 days)',
    decisions: ['Pause', 'Negative Exact'],
    cadence: 'Weekly',
    nextSteps: [
      '1. Upload your SP Search Term or Targeting report (60-day view)',
      '2. System generates an Operator Sheet with flagged targets',
      '3. Review each row and select a decision: Pause or Negative Exact',
      '4. Save and re-upload the completed Operator Sheet',
      '5. Upload your latest Amazon Bulksheet 2.0 export',
      '6. System generates a Bulk Update file ready for Amazon Ads → Bulk Operations'
    ]
  },
  BLEEDERS_2_SBSD: {
    title: 'Bleeders 2.0 — SB/SD Bad Keywords',
    description: 'Flags keywords with ACoS ≥ Target + 10% and Orders ≤ 5 (30-day view).',
    requiredFile: 'Sponsored Brands or Sponsored Display Keyword report (30 days)',
    decisions: ['Pause', 'Reduce bid'],
    cadence: 'Weekly',
    nextSteps: [
      '1. Configure your Target ACoS and Buffer (default +10%)',
      '2. Upload SB or SD Keyword report',
      '3. System generates Operator Sheet with flagged keywords',
      '4. Review and select decision for each: Pause or Reduce bid',
      '5. Save and re-upload the completed Operator Sheet',
      '6. Upload your latest Amazon Bulksheet 2.0 export',
      '7. Download the Bulk Update file and upload to Amazon'
    ]
  },
  BLEEDERS_2_SP_KEYWORDS: {
    title: 'Bleeders 2.0 — SP Bad Keywords (Targeting)',
    description: 'Flags SP keywords with ACoS ≥ Target + 20% and Orders ≤ 5.',
    requiredFile: 'Sponsored Products Keyword Targeting report (30 days)',
    decisions: ['Pause', 'Reduce bid'],
    cadence: 'Weekly',
    nextSteps: [
      '1. Set Target ACoS and Buffer (+20% for SP)',
      '2. Upload SP Keyword Targeting report',
      '3. Review generated Operator Sheet',
      '4. Mark decisions: Pause or Reduce bid',
      '5. Re-upload completed sheet',
      '6. Upload Amazon Bulksheet 2.0',
      '7. System generates Bulk Update file'
    ]
  },
  BLEEDERS_2_SP_SEARCH: {
    title: 'Bleeders 2.0 — SP Bad Search Terms',
    description: 'Flags search terms with ACoS ≥ Target + 20% and Orders ≤ 5.',
    requiredFile: 'Sponsored Products Search Term report (30 days)',
    decisions: ['Negative exact', 'Give it another week'],
    cadence: 'Weekly',
    nextSteps: [
      '1. Configure Target ACoS and Buffer (+20%)',
      '2. Upload SP Search Term report',
      '3. Review flagged search terms',
      '4. Choose: Negative exact (block term) or Give it another week',
      '5. Re-upload completed Operator Sheet',
      '6. Upload Amazon Bulksheet 2.0',
      '7. Download Bulk Update file with negative keywords'
    ]
  },
  BLEEDERS_2_ACOS100: {
    title: 'Campaigns ≥100% ACoS',
    description: 'Flags campaigns with Spend > 0 and ACoS ≥ 100% (losing money).',
    requiredFile: 'Campaign Performance report (any ad type)',
    decisions: ['Turn off campaign', 'Cut bid'],
    cadence: 'Daily or weekly',
    nextSteps: [
      '1. Upload Campaign Performance report',
      '2. System auto-flags campaigns with ACoS ≥ 100%',
      '3. Review Operator Sheet',
      '4. Decide: Turn off campaign or Cut bid by 50%',
      '5. Re-upload completed sheet',
      '6. Upload Amazon Bulksheet 2.0',
      '7. System generates Bulk Update file'
    ]
  },
  BLEEDING_LIFETIME: {
    title: 'Bleeding Lifetime Targets — Extended Click Audit',
    description: 'Identifies targets with 10+ clicks and 0 sales over their lifetime performance.',
    requiredFile: 'Campaign Manager → Targeting Tab → Lifetime filter → Export',
    decisions: ['Pause'],
    cadence: 'Monthly',
    nextSteps: [
      '1. In Campaign Manager, go to Targeting tab',
      '2. Select "Lifetime" date range filter',
      '3. Export all targets as CSV/XLSX',
      '4. Upload here',
      '5. Review flagged lifetime bleeders',
      '6. Choose: Pause',
      '7. Re-upload completed Operator Sheet',
      '8. Upload Amazon Bulksheet 2.0',
      '9. Download Bulk Update file'
    ]
  }
};

export function getModuleConfig(moduleType: ModuleType) {
  return {
    decisions: MODULE_DECISIONS[moduleType],
    help: MODULE_HELP[moduleType]
  };
}

export function validateDecision(decision: string, moduleType: ModuleType): boolean {
  const config = MODULE_DECISIONS[moduleType];
  const normalized = decision.trim().toLowerCase();
  return config.valid.includes(normalized);
}

export function getOperatorSheetInstructions(moduleType: ModuleType): string {
  const config = getModuleConfig(moduleType);
  
  return `Module: ${config.help.title}

Valid Actions: ${config.decisions.display.join(' | ')}

Instructions:
1. Review each flagged row carefully.
2. Select ONE valid decision from the options above in the "Decision" column.
3. Save this file when complete.
4. Upload it back to the system when prompted.
5. The system will automatically generate an Amazon Bulk Update file.

Note: Invalid or misspelled decisions will be auto-corrected where possible.`;
}
