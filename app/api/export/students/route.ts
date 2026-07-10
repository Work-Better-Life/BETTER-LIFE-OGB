import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getStudentsForExport } from "@/lib/data/students";
import { normalizeExportWindow } from "@/lib/export-window";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const window = normalizeExportWindow(request.nextUrl.searchParams.get("window"));
  const students = await getStudentsForExport(search, window);

  const header = ["Serial Number", "First Name", "Last Name", "Subjects", "Average %", "Last Recorded"];
  const rows = students.map((student) => [
    student.serialNumber,
    student.firstName,
    student.lastName,
    student.subjectNames.join("; "),
    student.averagePercentage !== null ? student.averagePercentage.toFixed(1) : "",
    student.lastRecordedAt ? new Date(student.lastRecordedAt).toISOString().slice(0, 10) : "",
  ]);

  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-${window}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
