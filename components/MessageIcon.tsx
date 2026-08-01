"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function MessageIcon({ userId }: { userId: string }) {
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadUnread() {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .is("read_at", null);
      setUnreadCount(count ?? 0);
    }
    loadUnread();

    const channel = supabase
      .channel("message-icon-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
        () => loadUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return (
    <Link
      href="/messages"
      aria-label="Messages"
      className="relative text-muted hover:text-ink transition-colors focus-ring w-8 h-8 flex items-center justify-center"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0.5 bg-margin text-paper text-[9px] font-medium rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}