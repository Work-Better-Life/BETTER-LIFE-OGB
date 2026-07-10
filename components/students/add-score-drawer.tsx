"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { AddScoreForm } from "./add-score-form";

type Topic = { id: string; name: string; defaultMaxScore: number };
type Subject = { id: string; name: string; topics: Topic[] };

export function AddScoreDrawer({ studentId, subjects }: { studentId: string; subjects: Subject[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add score</Button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Add score">
        <AddScoreForm studentId={studentId} subjects={subjects} onSuccess={() => setOpen(false)} />
      </Drawer>
    </>
  );
}
