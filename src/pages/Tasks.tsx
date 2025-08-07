import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface Task {
  id: string;
  title: string;
  checklist: { id: string; text: string; done: boolean }[];
}

export default function Tasks() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    enabled: false,
    initialData: [
      {
        id: "t1",
        title: "Jobsite prep",
        checklist: [
          { id: "c1", text: "PPE on", done: false },
          { id: "c2", text: "Toolbox talk", done: false },
        ],
      },
      {
        id: "t2",
        title: "Install conduit",
        checklist: [
          { id: "c3", text: "Measure run", done: false },
          { id: "c4", text: "Secure straps", done: false },
        ],
      },
    ],
  });

  const toggle = useMutation({
    mutationFn: async ({ taskId, itemId }: { taskId: string; itemId: string }) => {
      const next = tasks.map((t) =>
        t.id === taskId
          ? { ...t, checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }
          : t
      );
      qc.setQueryData(["tasks"], next);
      return true;
    },
  });

  return (
    <MobileLayout title="Tasks & Checklists">
      <SEO title="Tasks & Checklists" description="View and complete assigned tasks" path="/tasks" />

      <section className="grid gap-4">
        {tasks.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle>{t.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {t.checklist.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <Checkbox id={c.id} checked={c.done} onCheckedChange={() => toggle.mutate({ taskId: t.id, itemId: c.id })} />
                    <label htmlFor={c.id} className="text-sm">{c.text}</label>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>
    </MobileLayout>
  );
}
