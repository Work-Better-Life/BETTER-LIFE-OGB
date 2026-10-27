import { createHash } from "node:crypto";

// A fingerprint of what a spreadsheet *says*, not of the file's bytes: cells are
// trimmed and lowercased and blank rows dropped, so re-saving the same sheet in
// Excel (which changes the file but not its contents) still produces the same
// hash. Used to refuse importing the same scores or attendance twice.
export function hashTableContents(table: string[][]): string {
  const normalized = table
    .map((row) => row.map((cell) => cell.trim().toLowerCase()))
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      while (row.length > 0 && row[row.length - 1] === "") row.pop(); // trailing empty cells
      return row;
    });
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
