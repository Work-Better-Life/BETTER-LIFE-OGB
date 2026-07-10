import { prisma } from "../lib/db";
import { createStudent } from "../lib/data/students";
import { createSubject, createTopic } from "../lib/data/subjects";
import { addScoreEntry } from "../lib/data/scores";

const SUBJECTS: Array<{ name: string; topic: string }> = [
  { name: "Mathematics", topic: "Term Assessment" },
  { name: "Science", topic: "Term Assessment" },
  { name: "English", topic: "Term Assessment" },
  { name: "History", topic: "Term Assessment" },
  { name: "Geography", topic: "Term Assessment" },
  { name: "Art", topic: "Term Assessment" },
];

const FIRST_NAMES = [
  "Amara", "Liam", "Zainab", "Noah", "Chidi", "Ava", "Kwame", "Mia",
  "Tobi", "Ella", "Femi", "Grace", "Ifeoma", "Lucas", "Nneka", "Ethan",
  "Adaeze", "Sophia", "Kelechi", "Ryan", "Bola", "Chloe", "Emeka", "Zara",
];

const LAST_NAMES = [
  "Okafor", "Bello", "Adeyemi", "Obi", "Eze", "Johnson", "Williams", "Okoro",
  "Nwosu", "Abubakar", "Chukwu", "Martins", "Uche", "Balogun", "Ibrahim", "Amadi",
];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weeksAgo(n: number) {
  const date = new Date();
  date.setDate(date.getDate() - n * 7);
  return date;
}

const STUDENT_COUNT = 20;
const WEEKS = 3;

async function main() {
  console.log(`Seeding ${STUDENT_COUNT} test students across ${SUBJECTS.length} subjects, ${WEEKS} weeks each...\n`);

  const topicIds: string[] = [];
  for (const { name, topic } of SUBJECTS) {
    const subject = await prisma.subject.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    const existingTopic = await prisma.topic.findFirst({ where: { subjectId: subject.id, name: topic } });
    const createdTopic = existingTopic ?? (await createTopic(subject.id, topic, 100));
    topicIds.push(createdTopic.id);
    console.log(`✓ Subject ready: ${name} / ${topic}`);
  }

  console.log("");

  for (let i = 0; i < STUDENT_COUNT; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const student = await createStudent(firstName, lastName);

    // Each student gets a base skill level and a per-week trend, so the
    // dashboard's Top Performers / Most Improved lists have real variety.
    const baseSkill = randomBetween(45, 92);
    const weeklyTrend = randomBetween(-4, 7);

    for (const topicId of topicIds) {
      for (let week = WEEKS - 1; week >= 0; week--) {
        const weeksElapsed = WEEKS - 1 - week;
        const trendedScore = baseSkill + weeklyTrend * weeksElapsed + randomBetween(-6, 6);
        const value = Math.round(Math.max(35, Math.min(100, trendedScore)));

        await addScoreEntry({
          studentId: student.id,
          topicId,
          value,
          maxScore: 100,
          recordedAt: weeksAgo(week),
        });
      }
    }

    console.log(`✓ ${student.serialNumber} — ${firstName} ${lastName}`);
  }

  console.log(`\n✓ Done. Created ${STUDENT_COUNT} students with ${WEEKS * SUBJECTS.length} score entries each.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
