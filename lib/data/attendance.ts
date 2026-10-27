import { prisma } from "@/lib/db";

// Every week of attendance recorded for a student, oldest first.
export async function listAttendance(studentId: string) {
  return prisma.attendance.findMany({
    where: { studentId },
    orderBy: { weekStart: "asc" },
    select: { weekStart: true, daysAttended: true },
  });
}
