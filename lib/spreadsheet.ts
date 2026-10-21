import * as XLSX from "xlsx";
import { parseCsv } from "@/lib/profile-import";

// Reads an uploaded score file into a plain grid of text cells, whatever it was
// saved as: Excel (.xlsx/.xlsm/.xls), OpenDocument (.ods), or delimited text
// (.csv/.tsv/.txt, comma, semicolon or tab separated). The type is detected
// from the file's contents, not its name.

const MAX_ROWS = 5000;
const MAX_COLUMNS = 100;

export type SpreadsheetResult =
  | { ok: true; table: string[][]; sheetName: string | null }
  | { ok: false; error: string };

const NOT_A_SPREADSHEET = "That doesn't look like a spreadsheet. Use .xlsx, .xls, .ods or .csv.";

const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
const isZip = (bytes: Uint8Array) => startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]); // .xlsx, .xlsm, .ods
const isOle = (bytes: Uint8Array) => startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // old .xls

function decodeText(bytes: Uint8Array): string | null {
  if (bytes.subarray(0, 4096).includes(0)) return null; // NUL bytes: binary, not text
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  // Excel on Windows often saves CSV as Windows-1252, which garbles accents in UTF-8.
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : utf8;
}

// Picks the separator from the header line: whichever of , ; tab appears most.
function detectDelimiter(text: string) {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  const counts: Array<[string, number]> = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

function cellText(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v === undefined || cell.v === null) return "";
  switch (cell.t) {
    case "n":
      // Rounded so a formula result like 7.1000000000000005 reads as 7.1.
      return String(Math.round(Number(cell.v) * 1e6) / 1e6);
    case "b":
      return cell.v ? "TRUE" : "FALSE";
    case "d":
      return cell.v instanceof Date ? cell.v.toISOString().slice(0, 10) : String(cell.v);
    case "e":
      return cell.w ?? "#ERROR"; // e.g. #N/A — reported as "isn't a number" downstream
    default:
      return String(cell.v);
  }
}

function readWorkbook(bytes: Uint8Array): SpreadsheetResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      cellDates: true,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      sheetRows: MAX_ROWS + 1,
    });
  } catch {
    return { ok: false, error: NOT_A_SPREADSHEET };
  }

  const hidden = workbook.Workbook?.Sheets ?? [];
  for (const [index, sheetName] of workbook.SheetNames.entries()) {
    if (hidden[index]?.Hidden) continue;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet?.["!ref"]) continue;

    const range = XLSX.utils.decode_range(sheet["!ref"]);
    if (range.e.r + 1 > MAX_ROWS) return { ok: false, error: `That sheet has more than ${MAX_ROWS} rows.` };
    if (range.e.c + 1 > MAX_COLUMNS) return { ok: false, error: `That sheet has more than ${MAX_COLUMNS} columns.` };

    // Start at row 1 / column A, not at the first used cell, so row numbers in
    // the preview match the spreadsheet.
    const table: string[][] = [];
    for (let r = 0; r <= range.e.r; r++) {
      const row: string[] = [];
      for (let c = 0; c <= range.e.c; c++) row.push(cellText(sheet[XLSX.utils.encode_cell({ r, c })]));
      table.push(row);
    }
    if (table.some((row) => row.some((cell) => cell.trim() !== ""))) return { ok: true, table, sheetName };
  }
  return { ok: false, error: "The spreadsheet has no data in it." };
}

export function readSpreadsheet(bytes: Uint8Array): SpreadsheetResult {
  if (bytes.length === 0) return { ok: false, error: "The file is empty." };
  if (isZip(bytes) || isOle(bytes)) return readWorkbook(bytes);

  const text = decodeText(bytes);
  if (text === null) return { ok: false, error: NOT_A_SPREADSHEET };
  return { ok: true, table: parseCsv(text, detectDelimiter(text), true), sheetName: null };
}
