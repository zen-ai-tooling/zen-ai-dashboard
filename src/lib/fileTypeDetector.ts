import * as XLSX from "xlsx";

export const detectFileType = async (file: File): Promise<"raw-bulk" | "bleeders-report" | "unknown"> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetNames = workbook.SheetNames.map((s) => s.toLowerCase());

  // Raw bulk files contain campaign/search term sheets
  const campaignSheets = [
    "sponsored products campaigns",
    "sponsored brands campaigns",
    "sponsored display campaigns",
    "sb multi ad group campaigns",
    "sp search term report",
    "sb search term report",
  ];

  const isRawBulk = sheetNames.some((name) => campaignSheets.some((part) => name.includes(part)));

  // 🔑 Look for a "Decision" header in the first few rows of any sheet
  let hasDecisionColumn = false;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    }) as any[][];

    if (!data.length) continue;

    const maxHeaderScan = Math.min(data.length, 5); // scan first 5 rows max

    for (let r = 0; r < maxHeaderScan; r++) {
      const row = data[r];
      const normalizedCells = row.map((cell: any) => String(cell).toLowerCase().trim());

      if (normalizedCells.includes("decision")) {
        hasDecisionColumn = true;
        break;
      }
    }

    if (hasDecisionColumn) break;
  }

  // 🥇 RULE: if any sheet has a Decision column, it's a Bleeders decision report
  if (hasDecisionColumn) {
    return "bleeders-report";
  }

  if (isRawBulk) {
    return "raw-bulk";
  }

  return "unknown";
};
