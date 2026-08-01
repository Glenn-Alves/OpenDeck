"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

export default function ConversationView({
  currentUserId,
  otherUser,
  initialMessages,
}: {
  currentUserId: string;
  otherUser: { id: string; username: string; avatarUrl: string | null };
  initialMessages: Message[];
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${currentUserId}-${otherUser.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          const isThisConversation =
            (m.sender_id === currentUserId && m.recipient_id === otherUser.id) ||
            (m.sender_id === otherUser.id && m.recipient_id === currentUserId);
          if (isThisConversation) {
            setMessages((prev) => (prev.some((existing) => existing.id === m.id) ? prev : [...prev, m]));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUser.id, supabase]);

 async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;

    setSending(true);

    const { data: sessionCheck } = await supabase.auth.getUser();
    console.log("Session user id:", sessionCheck.user?.id);
    console.log("currentUserId prop:", currentUserId);

    const { error } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      recipient_id: otherUser.id,
      body: draft.trim(),
    });
    setSending(false);

    if (!error) setDraft("");
  }

  return (
    <div className="pt-12 max-w-2xl flex flex-col h-[75vh]">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
        <Link href="/messages" className="text-sm text-muted hover:text-ink transition-colors focus-ring">
          ←
        </Link>
        {otherUser.avatarUrl ? (
          <img src={otherUser.avatarUrl} alt={otherUser.username} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-display font-bold">
            {otherUser.username.charAt(0).toUpperCase()}
          </div>
        )}
        <Link
          href={`/creator/${encodeURIComponent(otherUser.username)}`}
          className="font-display font-bold text-ink hover:text-rule transition-colors focus-ring"
        >
          {otherUser.username}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted text-center mt-8">
            Say hello to {otherUser.username}.
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-sm text-sm ${
                    isMine ? "bg-ink text-paper" : "bg-card border border-border text-ink"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          maxLength={1000}
          className="flex-1 bg-card border-2 border-border rounded-sm px-4 py-2.5 text-sm text-ink placeholder:text-muted focus-ring"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}