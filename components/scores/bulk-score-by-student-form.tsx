"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addStudentBulkScoreAction } from "@/lib/actions/scores";

type Topic = { id: string; name: string; defaultMaxScore: number };
type Subject = { id: string; name: string; topics: Topic[] };
type Student = { id: string; firstName: string; lastName: string; serialNumber: string };

const NEW_TOPIC_VALUE = "__new__";

type RowState = {
  checked: boolean;
  topicId: string;
  newTopicName: string;
  value: string;
  maxScore: number;
  recordedAt: string;
  note: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function emptyRow(subject: Subject): RowState {
  const firstTopic = subject.topics[0];
  return {
    checked: false,
    topicId: firstTopic?.id ?? NEW_TOPIC_VALUE,
    newTopicName: "",
    value: "",
    maxScore: firstTopic?.defaultMaxScore ?? 100,
    recordedAt: todayInputValue(),
    note: "",
  };
}

export function BulkScoreByStudentForm({ subjects, students }: { subjects: Subject[]; students: Student[] }) {
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(subjects.map((s) => [s.id, emptyRow(s)]))
  );
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  const filteredStudents = useMemo(() => {
    if (!studentQuery.trim()) return students;
    const q = studentQuery.trim().toLowerCase();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.serialNumber.toLowerCase().includes(q)
    );
  }, [students, studentQuery]);

  const checkedSubjectIds = subjects.filter((s) => rows[s.id]?.checked).map((s) => s.id);

  function updateRow(subjectId: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [subjectId]: { ...prev[subjectId], ...patch } }));
  }

  function toggleSubject(subject: Subject) {
    setRows((prev) => ({
      ...prev,
      [subject.id]: { ...prev[subject.id], checked: !prev[subject.id].checked },
    }));
  }

  function handleTopicChange(subject: Subject, topicId: string) {
    const topic = subject.topics.find((t) => t.id === topicId);
    updateRow(subject.id, { topicId, maxScore: topic ? topic.defaultMaxScore : rows[subject.id].maxScore });
  }

  function resetForm() {
    setRows(Object.fromEntries(subjects.map((s) => [s.id, emptyRow(s)])));
    setSelectedStudentId(null);
    setStudentQuery("");
  }

  function handleSubmit() {
    setError(null);

    if (!selectedStudentId) {
      setError("Pick a student first.");
      return;
    }
    if (checkedSubjectIds.length === 0) {
      setError("Check at least one subject to record a score.");
      return;
    }

    const incompleteSubjects: string[] = [];
    const entries = checkedSubjectIds.map((subjectId) => {
      const subject = subjects.find((s) => s.id === subjectId)!;
      const row = rows[subjectId];
      const isNewTopic = row.topicId === NEW_TOPIC_VALUE;

      if ((isNewTopic && !row.newTopicName.trim()) || row.value.trim() === "" || !row.recordedAt) {
        incompleteSubjects.push(subject.name);
      }

      return {
        subjectId,
        topicId: isNewTopic ? undefined : row.topicId,
        newTopicName: isNewTopic ? row.newTopicName : undefined,
        value: Number(row.value),
        maxScore: row.maxScore,
        note: row.note || undefined,
        recordedAt: row.recordedAt,
      };
    });

    if (incompleteSubjects.length > 0) {
      setError(`Finish these subjects (topic + score + date) or uncheck them: ${incompleteSubjects.join(", ")}.`);
      return;
    }

    startTransition(async () => {
      const result = await addStudentBulkScoreAction({ studentId: selectedStudentId, entries });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccessCount(result.successCount ?? entries.length);
    });
  }

  if (successCount !== null) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="font-display text-2xl text-foreground">
          Saved {successCount} score{successCount === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-sm text-foreground-muted">
          Recorded for {selectedStudent?.firstName} {selectedStudent?.lastName}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setSuccessCount(null);
              resetForm();
            }}
          >
            Record more
          </Button>
          <Link href="/dashboard">
            <Button>Back to dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-lg text-foreground">Student</h2>

        {selectedStudent ? (
          <div className="mt-4 flex items-center gap-3 text-sm">
            <span className="text-foreground">
              Recording for <span className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</span>{" "}
              <span className="text-foreground-muted">{selectedStudent.serialNumber}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedStudentId(null)}
              className="text-primary-strong hover:underline"
            >
              Change student
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <Input
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder="Search students…"
            />
            <ul className="flex max-h-56 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border">
              {filteredStudents.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-surface-muted"
                  >
                    <span>
                      {student.firstName} {student.lastName}
                    </span>
                    <span className="text-xs text-foreground-muted">{student.serialNumber}</span>
                  </button>
                </li>
              ))}
              {filteredStudents.length === 0 && (
                <li className="px-3 py-4 text-center text-sm text-foreground-muted">No students match your search.</li>
              )}
            </ul>
          </div>
        )}
      </section>

      {selectedStudent && (
        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg text-foreground">Subjects</h2>
            <span className="whitespace-nowrap text-sm text-foreground-muted">{checkedSubjectIds.length} selected</span>
          </div>

          <ul className="mt-4 flex flex-col divide-y divide-border">
            {subjects.map((subject) => {
              const row = rows[subject.id];
              const isNewTopic = row.topicId === NEW_TOPIC_VALUE || !subject.topics.length;

              return (
                <li key={subject.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={row.checked}
                      onChange={() => toggleSubject(subject)}
                      className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className="flex-1 text-left text-sm font-medium text-foreground"
                    >
                      {subject.name}
                    </button>
                  </div>

                  {row.checked && (
                    <div className="mt-3 grid gap-4 pl-7 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Topic" htmlFor={`topic-${subject.id}`}>
                        <select
                          id={`topic-${subject.id}`}
                          value={isNewTopic ? NEW_TOPIC_VALUE : row.topicId}
                          onChange={(e) => handleTopicChange(subject, e.target.value)}
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                        >
                          {subject.topics.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              {topic.name}
                            </option>
                          ))}
                          <option value={NEW_TOPIC_VALUE}>+ New topic…</option>
                        </select>
                      </Field>

                      {isNewTopic ? (
                        <Field label="New topic name" htmlFor={`new-topic-${subject.id}`}>
                          <Input
                            id={`new-topic-${subject.id}`}
                            value={row.newTopicName}
                            onChange={(e) => updateRow(subject.id, { newTopicName: e.target.value })}
                            placeholder="e.g. Fractions"
                          />
                        </Field>
                      ) : (
                        <div />
                      )}

                      <Field label="Score" htmlFor={`value-${subject.id}`}>
                        <Input
                          id={`value-${subject.id}`}
                          type="number"
                          step="0.5"
                          min={0}
                          value={row.value}
                          onChange={(e) => updateRow(subject.id, { value: e.target.value })}
                          placeholder={`out of ${row.maxScore}`}
                        />
                      </Field>

                      <Field label="Out of" htmlFor={`max-${subject.id}`}>
                        <Input
                          id={`max-${subject.id}`}
                          type="number"
                          min={1}
                          value={row.maxScore}
                          onChange={(e) => updateRow(subject.id, { maxScore: Number(e.target.value) })}
                        />
                      </Field>

                      <Field label="Date" htmlFor={`date-${subject.id}`}>
                        <Input
                          id={`date-${subject.id}`}
                          type="date"
                          value={row.recordedAt}
                          onChange={(e) => updateRow(subject.id, { recordedAt: e.target.value })}
                        />
                      </Field>

                      <Field label="Note (optional)" htmlFor={`note-${subject.id}`}>
                        <Input
                          id={`note-${subject.id}`}
                          value={row.note}
                          onChange={(e) => updateRow(subject.id, { note: e.target.value })}
                          placeholder="e.g. Week 3 quiz"
                        />
                      </Field>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {error && <p className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {selectedStudent && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? "Saving…"
              : `Save ${checkedSubjectIds.length || ""} score${checkedSubjectIds.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}
    </div>
  );
}
