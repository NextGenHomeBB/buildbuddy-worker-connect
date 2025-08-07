import MobileLayout from "@/components/layout/MobileLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

interface ChatMessage {
  id: string;
  text: string;
  createdAt: number;
  author: "me" | "other";
}

export default function Messages() {
  const qc = useQueryClient();
  const { data: messages = [] } = useQuery<ChatMessage[]>({ queryKey: ["messages"], enabled: false, initialData: [] });

  const send = useMutation({
    mutationFn: async (text: string) => {
      const msg: ChatMessage = { id: crypto.randomUUID(), text, createdAt: Date.now(), author: "me" };
      qc.setQueryData(["messages"], [...messages, msg]);
      return true;
    },
  });

  return (
    <MobileLayout title="Project Chat">
      <SEO title="Messaging" description="Project chat with photo/video uploads" path="/messages" />

      <section className="grid gap-4">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <ul className="space-y-2">
              {messages.map((m) => (
                <li key={m.id} className={m.author === "me" ? "text-right" : "text-left"}>
                  <div className="inline-block rounded-lg border px-3 py-2 text-sm">
                    {m.text}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString()}</div>
                </li>
              ))}
            </ul>
            <MessageInput onSend={(t) => send.mutate(t)} />
          </CardContent>
        </Card>
      </section>
    </MobileLayout>
  );
}

function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText("");
        ref.current?.focus();
      }}
    >
      <Input ref={ref} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" />
      <Button type="submit">Send</Button>
    </form>
  );
}
