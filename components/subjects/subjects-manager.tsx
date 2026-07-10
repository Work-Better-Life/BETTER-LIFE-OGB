"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SubjectForm } from "./subject-form";
import { TopicForm } from "./topic-form";
import {
  createSubjectAction,
  updateSubjectAction,
  deleteSubjectAction,
  createTopicAction,
  updateTopicAction,
  deleteTopicAction,
} from "@/lib/actions/subjects";

type Topic = { id: string; name: string; defaultMaxScore: number; _count: { scores: number } };
type Subject = { id: string; name: string; topics: Topic[] };

export function SubjectsManager({ subjects }: { subjects: Subject[] }) {
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [addTopicFor, setAddTopicFor] = useState<Subject | null>(null);
  const [editingTopic, setEditingTopic] = useState<{ subject: Subject; topic: Topic } | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<{ subject: Subject; topic: Topic } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmDeleteSubject() {
    if (!deletingSubject) return;
    const id = deletingSubject.id;
    startTransition(async () => {
      await deleteSubjectAction(id);
      setDeletingSubject(null);
    });
  }

  function confirmDeleteTopic() {
    if (!deletingTopic) return;
    const id = deletingTopic.topic.id;
    startTransition(async () => {
      await deleteTopicAction(id);
      setDeletingTopic(null);
    });
  }

  const subjectScoreCount = (subject: Subject) =>
    subject.topics.reduce((total, topic) => total + topic._count.scores, 0);

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => setAddSubjectOpen(true)}>New Subject</Button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {subjects.length === 0 && (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-foreground-muted">
            No subjects yet. Add a subject, then give it some topics to start recording scores.
          </div>
        )}

        {subjects.map((subject) => {
          const isOpen = expanded.has(subject.id);
          return (
            <div key={subject.id} className="rounded-lg border border-border bg-surface">
              <div className="flex items-center justify-between px-5 py-4">
                <button
                  type="button"
                  onClick={() => toggle(subject.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 shrink-0 text-foreground-muted transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
                    fill="none"
                  >
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-display text-base text-foreground">{subject.name}</span>
                  <span className="text-xs text-foreground-muted">
                    {subject.topics.length} topic{subject.topics.length === 1 ? "" : "s"}
                  </span>
                </button>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingSubject(subject)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeletingSubject(subject)}>
                    Delete
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border px-5 py-4">
                  {subject.topics.length === 0 ? (
                    <p className="text-sm text-foreground-muted">No topics yet.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {subject.topics.map((topic) => (
                        <li key={topic.id} className="flex items-center justify-between py-2 text-sm">
                          <span className="text-foreground">
                            {topic.name}{" "}
                            <span className="text-foreground-muted">· out of {topic.defaultMaxScore}</span>
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTopic({ subject, topic })}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingTopic({ subject, topic })}
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => setAddTopicFor(subject)}>
                    + Add topic
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Drawer open={addSubjectOpen} onClose={() => setAddSubjectOpen(false)} title="New subject">
        <SubjectForm action={createSubjectAction} submitLabel="Add subject" onSuccess={() => setAddSubjectOpen(false)} />
      </Drawer>

      <Drawer open={!!editingSubject} onClose={() => setEditingSubject(null)} title="Edit subject">
        {editingSubject && (
          <SubjectForm
            action={updateSubjectAction.bind(null, editingSubject.id)}
            defaultName={editingSubject.name}
            submitLabel="Save changes"
            onSuccess={() => setEditingSubject(null)}
          />
        )}
      </Drawer>

      <Drawer open={!!addTopicFor} onClose={() => setAddTopicFor(null)} title={`New topic — ${addTopicFor?.name ?? ""}`}>
        {addTopicFor && (
          <TopicForm
            action={createTopicAction.bind(null, addTopicFor.id)}
            submitLabel="Add topic"
            onSuccess={() => setAddTopicFor(null)}
          />
        )}
      </Drawer>

      <Drawer
        open={!!editingTopic}
        onClose={() => setEditingTopic(null)}
        title={`Edit topic — ${editingTopic?.subject.name ?? ""}`}
      >
        {editingTopic && (
          <TopicForm
            action={updateTopicAction.bind(null, editingTopic.topic.id)}
            defaultValues={{ name: editingTopic.topic.name, defaultMaxScore: editingTopic.topic.defaultMaxScore }}
            submitLabel="Save changes"
            onSuccess={() => setEditingTopic(null)}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deletingSubject}
        title={`Delete ${deletingSubject?.name}?`}
        description={`This deletes all ${deletingSubject ? subjectScoreCount(deletingSubject) : 0} score entries recorded under this subject's topics. This can't be undone.`}
        onConfirm={confirmDeleteSubject}
        onCancel={() => setDeletingSubject(null)}
        pending={isPending}
      />

      <ConfirmDialog
        open={!!deletingTopic}
        title={`Delete ${deletingTopic?.topic.name}?`}
        description={`This deletes all ${deletingTopic?.topic._count.scores ?? 0} score entries recorded for this topic. This can't be undone.`}
        onConfirm={confirmDeleteTopic}
        onCancel={() => setDeletingTopic(null)}
        pending={isPending}
      />
    </>
  );
}
