"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { saveProfileAction } from "@/lib/actions/profiles";
import {
  CLASS_LABELS,
  GENDERS,
  JAMB_YEARS,
  PROFILE_SUBJECTS,
  STATUS_LABELS,
} from "@/lib/student-profile";

export type ProfileFormValues = {
  gender: string;
  dateOfBirth: string;
  houseAddress: string;
  schoolName: string;
  schoolAddress: string;
  currentClass: string;
  coreSubjects: string[];
  strugglingSubjects: string[];
  hasTakenCbt: string;
  computerComfort: string;
  jambYear: string;
  jambTargetScore: string;
  attendedExtraLessons: string;
  biggestChallenge: string;
  strictCbtWilling: string;
  followUpWilling: string;
  mocksCommitment: string;
  motivation: string;
  guardianName: string;
  guardianAddress: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianSupports: string;
  dataConsent: string;
  additionalInfo: string;
  university: string;
  course: string;
  status: string;
  dateJoined: string;
};

export const EMPTY_PROFILE_VALUES: ProfileFormValues = {
  gender: "",
  dateOfBirth: "",
  houseAddress: "",
  schoolName: "",
  schoolAddress: "",
  currentClass: "",
  coreSubjects: [],
  strugglingSubjects: [],
  hasTakenCbt: "",
  computerComfort: "",
  jambYear: "",
  jambTargetScore: "",
  attendedExtraLessons: "",
  biggestChallenge: "",
  strictCbtWilling: "",
  followUpWilling: "",
  mocksCommitment: "",
  motivation: "",
  guardianName: "",
  guardianAddress: "",
  guardianPhone: "",
  guardianEmail: "",
  guardianSupports: "",
  dataConsent: "",
  additionalInfo: "",
  university: "",
  course: "",
  status: "admitted",
  dateJoined: new Date().toISOString().slice(0, 10),
};

const textareaClasses =
  "min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-lg text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-foreground-muted">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Wide({ children }: { children: React.ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}

// Date input that opens the browser's calendar on click anywhere in the field
// (by default only the small icon does). Typing a date still works.
function DateField({
  label,
  name,
  value,
  onChange,
  max,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (next: string) => void;
  max?: string;
}) {
  return (
    <Field label={label} htmlFor={name}>
      <Input
        type="date"
        id={name}
        name={name}
        value={value}
        max={max}
        required
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker();
          } catch {
            // Older browsers, or the picker is already open — the field still works by typing.
          }
        }}
        className="cursor-pointer"
      />
    </Field>
  );
}

const selectClasses =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

function SelectField({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Field label={label} htmlFor={name}>
      <select id={name} name={name} value={value} onChange={(e) => onChange(e.target.value)} className={selectClasses}>
        <option value="">Select…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// A dropdown of checkboxes. Uses <details> so it opens and closes without
// any state; the checkboxes inside still submit with the form.
function MultiSelectField({
  label,
  name,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  hint?: string;
}) {
  function toggle(optionValue: string) {
    onChange(value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <details className="group rounded-md border border-border bg-surface">
        <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
          <span className={cn("truncate", value.length === 0 && "text-foreground-muted")}>
            {value.length === 0 ? "Select…" : value.join(", ")}
          </span>
          <span aria-hidden className="text-foreground-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="grid gap-1 border-t border-border p-2 sm:grid-cols-2">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-surface-muted"
            >
              <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={value.includes(option.value)}
                onChange={() => toggle(option.value)}
                className="size-4 accent-primary"
              />
              {option.label}
            </label>
          ))}
        </div>
      </details>
      {hint && <p className="text-xs text-foreground-muted">{hint}</p>}
    </div>
  );
}

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function ProfileForm({
  studentId,
  initialValues,
  submitLabel,
  cancelHref,
}: {
  studentId: string;
  initialValues: ProfileFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function set<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function text(key: keyof ProfileFormValues & string) {
    return {
      id: key,
      name: key,
      value: values[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value as never),
    };
  }

  function single(key: keyof ProfileFormValues & string, options: { value: string; label: string }[], legend: string) {
    return (
      <SelectField
        label={legend}
        name={key}
        options={options}
        value={values[key] as string}
        onChange={(next) => set(key, next as never)}
      />
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(undefined);
    // Submitted through a transition rather than <form action> so a validation
    // error leaves everything typed in place instead of resetting the form.
    startTransition(async () => {
      const result = await saveProfileAction(studentId, formData);
      if (result?.error) {
        setError(result.error);
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }
    });
  }

  const subjectOptions = PROFILE_SUBJECTS.map((s) => ({ value: s, label: s }));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Section title="Personal">
        {single("gender", GENDERS.map((g) => ({ value: g, label: g })), "Gender")}
        <DateField
          label="Date of birth"
          name="dateOfBirth"
          value={values.dateOfBirth}
          onChange={(next) => set("dateOfBirth", next)}
          max={new Date().toISOString().slice(0, 10)}
        />
        <Wide>
          <Field label="House address (optional)" htmlFor="houseAddress">
            <Input {...text("houseAddress")} />
          </Field>
        </Wide>
      </Section>

      <Section title="School">
        <Field label="Secondary school attended" htmlFor="schoolName">
          <Input {...text("schoolName")} required />
        </Field>
        <Field label="School address / area" htmlFor="schoolAddress">
          <Input {...text("schoolAddress")} required />
        </Field>
        <Wide>
          {single(
            "currentClass",
            Object.entries(CLASS_LABELS).map(([value, label]) => ({ value, label })),
            "Current class"
          )}
        </Wide>
        <Wide>
          <MultiSelectField
            label="Four core subjects currently offered"
            hint={`Pick 4 or 5 — ${values.coreSubjects.length} selected.`}
            name="coreSubjects"
            options={subjectOptions}
            value={values.coreSubjects}
            onChange={(next) => set("coreSubjects", next)}
          />
        </Wide>
        <Wide>
          <MultiSelectField
            label="Subjects they struggle with the most"
            name="strugglingSubjects"
            options={subjectOptions}
            value={values.strugglingSubjects}
            onChange={(next) => set("strugglingSubjects", next)}
          />
        </Wide>
      </Section>

      <Section title="Exam readiness">
        {single("hasTakenCbt", YES_NO, "Has written a Computer-Based Test (CBT) before?")}
        {single(
          "computerComfort",
          [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
          "Computer literacy (1 = beginner, 5 = very confident)"
        )}
        {single("jambYear", JAMB_YEARS.map((y) => ({ value: String(y), label: String(y) })), "Planning to sit JAMB in")}
        <Field label="JAMB score they're aiming for" htmlFor="jambTargetScore">
          <Input {...text("jambTargetScore")} placeholder="e.g. 250–280" required />
        </Field>
        {single("attendedExtraLessons", YES_NO, "Attended JAMB extra lessons before?")}
        {single("strictCbtWilling", YES_NO, "Willing to take exams under strict CBT conditions?")}
        {single("followUpWilling", YES_NO, "Willing to attend follow-up classes? (optional)")}
        {single("mocksCommitment", YES_NO, "Can commit to multiple mock exams and follow-up sessions?")}
        <Wide>
          <Field label="Biggest challenge with exams, especially CBT (optional)" htmlFor="biggestChallenge">
            <textarea {...text("biggestChallenge")} className={textareaClasses} />
          </Field>
        </Wide>
        <Wide>
          <Field label="Why they want to be part of the programme" htmlFor="motivation">
            <textarea {...text("motivation")} className={textareaClasses} required />
          </Field>
        </Wide>
      </Section>

      <Section title="Parent / guardian / sponsor">
        <Field label="Full name" htmlFor="guardianName">
          <Input {...text("guardianName")} required />
        </Field>
        <Field label="Phone number" htmlFor="guardianPhone">
          <Input type="tel" {...text("guardianPhone")} required />
        </Field>
        <Field label="Address" htmlFor="guardianAddress">
          <Input {...text("guardianAddress")} required />
        </Field>
        <Field label="Email (optional)" htmlFor="guardianEmail">
          <Input type="email" {...text("guardianEmail")} />
        </Field>
        {single("guardianSupports", YES_NO, "Aware of and supports the student's participation?")}
        {single("dataConsent", YES_NO, "Consents to performance data being used for academic analysis?")}
      </Section>

      <Section title="Programme">
        <Field label="University of choice (optional)" htmlFor="university">
          <Input {...text("university")} />
        </Field>
        <Field label="Course they wish to study (optional)" htmlFor="course">
          <Input {...text("course")} />
        </Field>
        {single(
          "status",
          Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
          "Status"
        )}
        <DateField
          label="Date joined"
          name="dateJoined"
          value={values.dateJoined}
          onChange={(next) => set("dateJoined", next)}
        />
        <Wide>
          <Field label="Anything else we should know? (optional)" htmlFor="additionalInfo">
            <textarea {...text("additionalInfo")} className={textareaClasses} />
          </Field>
        </Wide>
      </Section>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <Link
          href={cancelHref}
          className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground"
        >
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
