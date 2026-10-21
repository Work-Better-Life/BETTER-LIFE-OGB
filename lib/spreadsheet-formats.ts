// Kept apart from lib/spreadsheet.ts on purpose: the upload form (browser code)
// needs this list, and importing it from the reader would ship the whole
// spreadsheet library to every visitor.
export const SPREADSHEET_ACCEPT = ".csv,.tsv,.txt,.xlsx,.xlsm,.xls,.ods";
