"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addBulkScoreAction } from "@/lib/actions/scores";

type Topic = { id: string; name: string; defaultMaxScore: number };
type Subject = { id: string; name: string; topics: Topic[] };
type Student = { id: string; firstName: string; lastName: string; serialNumber: string };

const NEW_TOPIC_VALUE = "__new__";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function BulkScoreForm({ subjects, students }: { subjects: Subject[]; students: Student[] }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState(subjects[0]?.topics[0]?.id ?? "");
  const [newTopicName, setNewTopicName] = useState("");
  const [maxScore, setMaxScore] = useState(subjects[0]?.topics[0]?.defaultMaxScore ?? 100);
  const [recordedAt, setRecordedAt] = useState(todayInputValue());
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const isNewTopic = topicId === NEW_TOPIC_VALUE || !selectedSubject?.topics.length;

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

  const selectedIds = Object.keys(scores);
  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((s) => s.id in scores);

  function handleSubjectChange(id: string) {
    setSubjectId(id);
    const nextSubject = subjects.find((s) => s.id === id);
    const firstTopic = nextSubject?.topics[0];
    setTopicId(firstTopic?.id ?? "");
    setMaxScore(firstTopic?.defaultMaxScore ?? 100);
  }

  function handleTopicChange(id: string) {
    setTopicId(id);
    const topic = selectedSubject?.topics.find((t) => t.id === id);
    if (topic) setMaxScore(topic.defaultMaxScore);
  }

  function toggleStudent(id: string) {
    setScores((prev) => {
      const next = { ...prev };
      if (id in next) {
        delete next[id];
      } else {
        next[id] = "";
        requestAnimationFrame(() => inputRefs.current[id]?.focus());
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setScores((prev) => {
      if (allFilteredSelected) {
        const next = { ...prev };
        for (const s of filteredStudents) delete next[s.id];
        return next;
      }
      const next = { ...prev };
      for (const s of filteredStudents) if (!(s.id in next)) next[s.id] = "";
      return next;
    });
  }

  function focusNext(currentId: string) {
    const ids = filteredStudents.map((s) => s.id).filter((id) => id in scores);
    const index = ids.indexOf(currentId);
    const nextId = ids[index + 1];
    if (nextId) inputRefs.current[nextId]?.focus();
  }

  function handleSubmit() {
    setError(null);

    if (subjects.length === 0) {
      setError("Add a subject first from the Subjects page.");
      return;
    }
    if (isNewTopic && !newTopicName.trim()) {
      setError("Choose an existing topic or type a new one.");
      return;
    }
    if (selectedIds.length === 0) {
      setError("Select at least one student.");
      return;
    }
    const missing = selectedIds.filter((id) => scores[id].trim() === "");
    if (missing.length > 0) {
      setError(`${missing.length} selected student${missing.length === 1 ? "" : "s"} still need${missing.length === 1 ? "s" : ""} a score. Uncheck them if they didn't take the test.`);
      return;
    }

    startTransition(async () => {
      const result = await addBulkScoreAction({
        subjectId,
        topicId: isNewTopic ? undefined : topicId,
        newTopicName: isNewTopic ? newTopicName : undefined,
        maxScore,
        recordedAt,
        note: note || undefined,
        entries: selectedIds.map((id) => ({ studentId: id, value: Number(scores[id]) })),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccessCount(result.successCount ?? selectedIds.length);
    });
  }

  if (successCount !== null) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="font-display text-2xl text-foreground">
          Saved {successCount} score{successCount === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-sm text-foreground-muted">Recorded for {selectedSubject?.name}.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setScores({});
              setSuccessCount(null);
            }}
          >
            Record another test
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
        <h2 className="font-display text-lg text-foreground">Test details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Subject" htmlFor="bulk-subject">
            <select
              id="bulk-subject"
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Topic" htmlFor="bulk-topic">
            <select
              id="bulk-topic"
              value={isNewTopic ? NEW_TOPIC_VALUE : topicId}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
            >
              {selectedSubject?.topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
              <option value={NEW_TOPIC_VALUE}>+ New topic…</option>
            </select>
          </Field>

          {isNewTopic ? (
            <Field label="New topic name" htmlFor="bulk-new-topic">
              <Input
                id="bulk-new-topic"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="e.g. Midterm exam"
              />
            </Field>
          ) : (
            <div />
          )}

          <Field label="Out of" htmlFor="bulk-max">
            <Input
              id="bulk-max"
              type="number"
              min={1}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
            />
          </Field>

          <Field label="Date" htmlFor="bulk-date">
            <Input id="bulk-date" type="date" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
          </Field>

          <Field label="Note (optional, applies to all)" htmlFor="bulk-note">
            <Input id="bulk-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Midterm exam" />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg text-foreground">Students</h2>
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap text-sm text-foreground-muted">{selectedIds.length} selected</span>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students…"
              className="w-56"
            />
            <Button variant="secondary" size="sm" onClick={toggleSelectAll}>
              {allFilteredSelected ? "Deselect all" : "Select all"}
            </Button>
          </div>
        </div>

        <ul className="mt-4 flex flex-col divide-y divide-border">
          {filteredStudents.map((student) => {
            const checked = student.id in scores;
            return (
              <li key={student.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStudent(student.id)}
                  className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={() => toggleStudent(student.id)}
                  className="flex-1 text-left text-sm text-foreground"
                >
                  {student.firstName} {student.lastName}
                  <span className="ml-2 text-xs text-foreground-muted">{student.serialNumber}</span>
                </button>
                {checked && (
                  <input
                    ref={(el) => {
                      inputRefs.current[student.id] = el;
                    }}
                    type="number"
                    step="0.5"
                    min={0}
                    value={scores[student.id]}
                    onChange={(e) => setScores((prev) => ({ ...prev, [student.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        focusNext(student.id);
                      }
                    }}
                    placeholder={`out of ${maxScore}`}
                    className="h-9 w-28 rounded-md border border-border bg-surface px-2 text-sm text-foreground"
                  />
                )}
              </li>
            );
          })}
          {filteredStudents.length === 0 && (
            <li className="py-6 text-center text-sm text-foreground-muted">No students match your search.</li>
          )}
        </ul>
      </section>

      {error && <p className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving…" : `Save ${selectedIds.length || ""} score${selectedIds.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}
