"use client";

import { useActionState, useState } from "react";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addScoreAction, type ActionState } from "@/lib/actions/scores";

type Topic = { id: string; name: string; defaultMaxScore: number };
type Subject = { id: string; name: string; topics: Topic[] };

const NEW_TOPIC_VALUE = "__new__";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function AddScoreForm({
  studentId,
  subjects,
  onSuccess,
}: {
  studentId: string;
  subjects: Subject[];
  onSuccess: () => void;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState<string>(subjects[0]?.topics[0]?.id ?? "");
  const [maxScore, setMaxScore] = useState(subjects[0]?.topics[0]?.defaultMaxScore ?? 100);

  const boundAction = addScoreAction.bind(null, studentId);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await boundAction(prev, formData);
    if (!result.error) onSuccess();
    return result;
  }, {});

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const isNewTopic = topicId === NEW_TOPIC_VALUE || !selectedSubject?.topics.length;

  function handleTopicChange(id: string) {
    setTopicId(id);
    const topic = selectedSubject?.topics.find((t) => t.id === id);
    if (topic) setMaxScore(topic.defaultMaxScore);
  }

  function handleSubjectChange(id: string) {
    setSubjectId(id);
    const nextSubject = subjects.find((s) => s.id === id);
    const firstTopic = nextSubject?.topics[0];
    setTopicId(firstTopic?.id ?? "");
    setMaxScore(firstTopic?.defaultMaxScore ?? 100);
  }

  if (subjects.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        Add a subject first from the Subjects page before recording a score.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Subject" htmlFor="subjectId">
        <select
          id="subjectId"
          name="subjectId"
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

      <Field label="Topic" htmlFor="topicId">
        <select
          id="topicId"
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
        <input type="hidden" name="topicId" value={isNewTopic ? "" : topicId} />
      </Field>

      {isNewTopic && (
        <Field label="New topic name" htmlFor="newTopicName">
          <Input id="newTopicName" name="newTopicName" placeholder="e.g. Fractions" required />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Score" htmlFor="value">
          <Input id="value" name="value" type="number" step="0.5" min={0} required />
        </Field>
        <Field label="Out of" htmlFor="maxScore">
          <Input
            id="maxScore"
            name="maxScore"
            type="number"
            min={1}
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value))}
            required
          />
        </Field>
      </div>

      <Field label="Date" htmlFor="recordedAt">
        <Input id="recordedAt" name="recordedAt" type="date" defaultValue={todayInputValue()} required />
      </Field>

      <Field label="Note (optional)" htmlFor="note">
        <Input id="note" name="note" placeholder="e.g. Week 3 quiz" />
      </Field>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Saving…" : "Add score"}
      </Button>
    </form>
  );
}
