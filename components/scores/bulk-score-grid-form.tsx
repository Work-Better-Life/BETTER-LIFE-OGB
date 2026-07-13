"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addGridScoreAction } from "@/lib/actions/scores";

type Topic = { id: string; name: string; defaultMaxScore: number };
type Subject = { id: string; name: string; topics: Topic[] };
type Student = { id: string; firstName: string; lastName: string; serialNumber: string };

type ColumnConfig = { topicId: string; newTopicName: string; maxScore: number };

const NEW_TOPIC_VALUE = "__new__";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function defaultColumnConfig(subject: Subject): ColumnConfig {
  const firstTopic = subject.topics[0];
  return {
    topicId: firstTopic?.id ?? NEW_TOPIC_VALUE,
    newTopicName: "",
    maxScore: firstTopic?.defaultMaxScore ?? 100,
  };
}

function cellKey(studentId: string, subjectId: string) {
  return `${studentId}__${subjectId}`;
}

export function BulkScoreGridForm({ subjects, students }: { subjects: Subject[]; students: Student[] }) {
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Record<string, boolean>>({});
  const [columnConfig, setColumnConfig] = useState<Record<string, ColumnConfig>>({});
  const [rows, setRows] = useState<Record<string, Record<string, string>>>({});
  const [search, setSearch] = useState("");
  const [recordedAt, setRecordedAt] = useState(todayInputValue());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<{ scores: number; students: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedSubjects = subjects.filter((s) => selectedSubjectIds[s.id]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.serialNumber.toLowerCase().includes(q)
    );
  }, [students, search]);

  const checkedStudentIds = Object.keys(rows);
  const allFilteredChecked = filteredStudents.length > 0 && filteredStudents.every((s) => s.id in rows);

  function toggleSubjectColumn(subject: Subject) {
    setSelectedSubjectIds((prev) => ({ ...prev, [subject.id]: !prev[subject.id] }));
    setColumnConfig((prev) => (prev[subject.id] ? prev : { ...prev, [subject.id]: defaultColumnConfig(subject) }));
  }

  function updateColumnConfig(subjectId: string, patch: Partial<ColumnConfig>) {
    setColumnConfig((prev) => ({ ...prev, [subjectId]: { ...prev[subjectId], ...patch } }));
  }

  function handleColumnTopicChange(subject: Subject, topicId: string) {
    const topic = subject.topics.find((t) => t.id === topicId);
    updateColumnConfig(subject.id, { topicId, ...(topic ? { maxScore: topic.defaultMaxScore } : {}) });
  }

  function toggleStudentRow(studentId: string) {
    setRows((prev) => {
      const next = { ...prev };
      if (studentId in next) {
        delete next[studentId];
      } else {
        next[studentId] = {};
      }
      return next;
    });
  }

  function toggleSelectAllStudents() {
    setRows((prev) => {
      if (allFilteredChecked) {
        const next = { ...prev };
        for (const s of filteredStudents) delete next[s.id];
        return next;
      }
      const next = { ...prev };
      for (const s of filteredStudents) if (!(s.id in next)) next[s.id] = {};
      return next;
    });
  }

  function handleCellChange(studentId: string, subjectId: string, value: string) {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [subjectId]: value } }));
  }

  function focusNextRow(studentId: string, subjectId: string) {
    const ids = filteredStudents.map((s) => s.id).filter((id) => id in rows);
    const index = ids.indexOf(studentId);
    const nextId = ids[index + 1];
    if (nextId) inputRefs.current[cellKey(nextId, subjectId)]?.focus();
  }

  function handleSubmit() {
    setError(null);

    if (selectedSubjects.length === 0) {
      setError("Pick at least one subject.");
      return;
    }
    if (checkedStudentIds.length === 0) {
      setError("Select at least one student.");
      return;
    }

    const incompleteColumns: string[] = [];
    const columns: Array<{
      subjectId: string;
      topicId?: string;
      newTopicName?: string;
      maxScore: number;
      entries: Array<{ studentId: string; value: number }>;
    }> = [];

    for (const subject of selectedSubjects) {
      const entries = checkedStudentIds
        .map((studentId) => ({ studentId, raw: rows[studentId]?.[subject.id] }))
        .filter((e) => e.raw !== undefined && e.raw.trim() !== "")
        .map((e) => ({ studentId: e.studentId, value: Number(e.raw) }));

      if (entries.length === 0) continue;

      const config = columnConfig[subject.id];
      const isNewTopic = config.topicId === NEW_TOPIC_VALUE || !subject.topics.length;
      if (isNewTopic && !config.newTopicName.trim()) {
        incompleteColumns.push(subject.name);
        continue;
      }

      columns.push({
        subjectId: subject.id,
        topicId: isNewTopic ? undefined : config.topicId,
        newTopicName: isNewTopic ? config.newTopicName : undefined,
        maxScore: config.maxScore,
        entries,
      });
    }

    if (incompleteColumns.length > 0) {
      setError(`Pick a topic (or name a new one) for: ${incompleteColumns.join(", ")}.`);
      return;
    }
    if (columns.length === 0) {
      setError("Enter at least one score.");
      return;
    }

    const scoreCount = columns.reduce((sum, c) => sum + c.entries.length, 0);
    const studentCount = new Set(columns.flatMap((c) => c.entries.map((e) => e.studentId))).size;

    startTransition(async () => {
      const result = await addGridScoreAction({ recordedAt, note: note || undefined, columns });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccessSummary({ scores: result.successCount ?? scoreCount, students: studentCount });
    });
  }

  if (successSummary) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="font-display text-2xl text-foreground">
          Saved {successSummary.scores} score{successSummary.scores === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-sm text-foreground-muted">
          Recorded for {successSummary.students} student{successSummary.students === 1 ? "" : "s"}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setRows({});
              setSuccessSummary(null);
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
        <h2 className="font-display text-lg text-foreground">Subjects</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {subjects.map((subject) => {
            const selected = !!selectedSubjectIds[subject.id];
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => toggleSubjectColumn(subject)}
                aria-pressed={selected}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  selected
                    ? "border-transparent bg-primary-soft text-primary-strong"
                    : "border-border bg-surface text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                )}
              >
                {subject.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="grid-date">
            <Input id="grid-date" type="date" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
          </Field>
          <Field label="Note (optional, applies to all)" htmlFor="grid-note">
            <Input id="grid-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Midterm exam" />
          </Field>
        </div>
      </section>

      {selectedSubjects.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg text-foreground">Students</h2>
            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap text-sm text-foreground-muted">{checkedStudentIds.length} selected</span>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students…"
                className="w-56"
              />
              <Button variant="secondary" size="sm" onClick={toggleSelectAllStudents}>
                {allFilteredChecked ? "Deselect all" : "Select all"}
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="px-3 py-3 text-left align-bottom">
                    <span className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Student</span>
                  </th>
                  {selectedSubjects.map((subject) => {
                    const config = columnConfig[subject.id];
                    const isNewTopic = config.topicId === NEW_TOPIC_VALUE || !subject.topics.length;
                    return (
                      <th key={subject.id} className="min-w-[190px] border-l border-border px-3 py-3 text-left align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-medium normal-case tracking-normal text-foreground">
                            {subject.name}
                          </span>
                          <select
                            value={isNewTopic ? NEW_TOPIC_VALUE : config.topicId}
                            onChange={(e) => handleColumnTopicChange(subject, e.target.value)}
                            className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-foreground"
                          >
                            {subject.topics.map((topic) => (
                              <option key={topic.id} value={topic.id}>
                                {topic.name}
                              </option>
                            ))}
                            <option value={NEW_TOPIC_VALUE}>+ New topic…</option>
                          </select>
                          {isNewTopic && (
                            <Input
                              value={config.newTopicName}
                              onChange={(e) => updateColumnConfig(subject.id, { newTopicName: e.target.value })}
                              placeholder="New topic name"
                              className="h-8 text-xs"
                            />
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-foreground-muted">Out of</span>
                            <Input
                              type="number"
                              min={1}
                              value={config.maxScore}
                              onChange={(e) => updateColumnConfig(subject.id, { maxScore: Number(e.target.value) })}
                              className="h-8 w-16 text-xs"
                            />
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const checked = student.id in rows;
                  return (
                    <tr key={student.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStudentRow(student.id)}
                            className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                          />
                          <button
                            type="button"
                            onClick={() => toggleStudentRow(student.id)}
                            className="text-left text-sm text-foreground"
                          >
                            {student.firstName} {student.lastName}
                            <span className="ml-1.5 text-xs text-foreground-muted">{student.serialNumber}</span>
                          </button>
                        </div>
                      </td>
                      {selectedSubjects.map((subject) => (
                        <td key={subject.id} className="border-l border-border px-3 py-2">
                          {checked ? (
                            <input
                              ref={(el) => {
                                inputRefs.current[cellKey(student.id, subject.id)] = el;
                              }}
                              type="number"
                              step="0.5"
                              min={0}
                              value={rows[student.id]?.[subject.id] ?? ""}
                              onChange={(e) => handleCellChange(student.id, subject.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusNextRow(student.id, subject.id);
                                }
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder={`out of ${columnConfig[subject.id]?.maxScore ?? 100}`}
                              className="h-9 w-24 rounded-md border border-border bg-surface px-2 text-sm text-foreground"
                            />
                          ) : (
                            <span className="text-sm text-foreground-muted">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={selectedSubjects.length + 1} className="px-3 py-6 text-center text-sm text-foreground-muted">
                      No students match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {error && <p className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {selectedSubjects.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : "Save scores"}
          </Button>
        </div>
      )}
    </div>
  );
}
