import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { TEMPLATE_HEADERS } from "@/lib/profile-import";

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// The registration import's header row, as an empty file ready to fill in.
// Headers only, on purpose: a sample row would be imported as a real student.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!session.canWrite) return new Response("This account can't import students.", { status: 403 });

  if (request.nextUrl.searchParams.get("format") === "xlsx") {
    const sheet = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS]]);
    sheet["!cols"] = TEMPLATE_HEADERS.map((header) => ({ wch: Math.min(Math.max(header.length, 14), 40) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Students");
    const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="student-import-template.xlsx"',
      },
    });
  }

  const csv = TEMPLATE_HEADERS.map(csvEscape).join(",") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="student-import-template.csv"',
    },
  });
}
