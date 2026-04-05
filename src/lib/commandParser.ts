/**
 * Command parser for AdOps Assistant
 * Reliably detects user commands without false negatives
 */

export type Command = 'B1' | 'B2' | 'LIFETIME' | 'ACOS100' | 'HELP' | 'STATUS' | 'RESET' | 'REUPLOAD' | 'MODULES' | null;

export function parseCommand(input: string): Command {
  const s = (input || '').trim().toLowerCase();

  // Bleeders 1.0 (zero-sale wasted spend, last 60d)
  if (/(^|\b)(bleeder(s)?\s*1(\.0)?|run\s*bleeder(s)?\s*1(\.0)?|zero-?sale|wasted\s*spend|start\s*bleeder(s)?\s*1(\.0)?|bleder(s)?\s*1|bleadar(s)?\s*1)(\b|$)/i.test(s)) {
    return 'B1';
  }

  // Bleeders 2.0 (low-sales high-ACoS optimizer)
  if (/(^|\b)(bleeder(s)?\s*2(\.0)?|run\s*bleeder(s)?\s*2(\.0)?|low-?sales|acos\s*optimizer|high-?acos|start\s*bleeder(s)?\s*2(\.0)?|bleder(s)?\s*2|bleadar(s)?\s*2)(\b|$)/i.test(s)) {
    return 'B2';
  }

  // Bleeding Lifetime Targets (new module)
  if (/(^|\b)(bleeding?\s*lifetime\s*target(s)?|lifetime\s*bleeder(s)?|bleeder(s)?\s*lifetime|life\s*time\s*target(s)?)(\b|$)/i.test(s)) {
    return 'LIFETIME';
  }

  // Campaigns ≥100% ACoS
  if (/(^|\b)(acos?\s*100|100%?\s*acos|campaign(s)?\s*(>|≥|over)\s*100%?\s*acos)(\b|$)/i.test(s)) {
    return 'ACOS100';
  }

  // Help
  if (/(^|\b)(help|\?|how\s*to|sop|command(s)?|show\s*command(s)?|instruction(s)?|guide|what\s*now|how\s*does\s*this\s*work)(\b|$)/i.test(s)) {
    return 'HELP';
  }

  // Modules
  if (/(^|\b)(module(s)?|show\s*module(s)?|list\s*module(s)?|available\s*module(s)?)(\b|$)/i.test(s)) {
    return 'MODULES';
  }

  // Status
  if (/(^|\b)(status|state|info|context|what\s*file|what('?s)?\s*loaded)(\b|$)/i.test(s)) {
    return 'STATUS';
  }

  // Reset
  if (/(^|\b)(reset|restart|start\s*over|new\s*run|begin\s*again|clear)(\b|$)/i.test(s)) {
    return 'RESET';
  }

  // Reupload
  if (/(^|\b)(reupload|re-?upload|replace|upload\s*new|wrong\s*file|use\s*another|new\s*upload)(\b|$)/i.test(s)) {
    return 'REUPLOAD';
  }

  return null;
}
